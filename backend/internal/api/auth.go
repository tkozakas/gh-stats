package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gh-stats/backend/internal/github"
)

const sessionCookieName = "gh_session"

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if h.oauth == nil {
		http.Error(w, "OAuth not configured", http.StatusServiceUnavailable)
		return
	}

	state := h.store.CreateState()
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
		h.oauth.ClientID,
		url.QueryEscape(h.oauth.RedirectURL),
		url.QueryEscape(strings.Join(h.oauth.Scopes, " ")),
		state,
	)

	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	if h.oauth == nil {
		http.Error(w, "OAuth not configured", http.StatusServiceUnavailable)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		http.Error(w, "missing code or state", http.StatusBadRequest)
		return
	}

	if !h.store.ValidateState(state) {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}

	token, err := h.exchangeCode(code)
	if err != nil {
		log.Printf("token exchange error: %v", err)
		http.Error(w, "failed to exchange code", http.StatusInternalServerError)
		return
	}

	client := github.NewClient(token.AccessToken)
	profile, err := client.GetProfile("")
	if err != nil {
		log.Printf("get profile error: %v", err)
		http.Error(w, "failed to get user profile", http.StatusInternalServerError)
		return
	}

	session := h.store.CreateSession(profile.Login, token.AccessToken, profile.AvatarURL)

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    session.ID,
		Path:     "/",
		Expires:  session.ExpiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   r.TLS != nil,
	})

	http.Redirect(w, r, h.frontendURL+"/"+profile.Login, http.StatusTemporaryRedirect)
}

func (h *Handler) exchangeCode(code string) (*github.OAuthTokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", h.oauth.ClientID)
	data.Set("client_secret", h.oauth.ClientSecret)
	data.Set("code", code)

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var token github.OAuthTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}

	if token.AccessToken == "" {
		return nil, fmt.Errorf("empty access token in response: %s", string(body))
	}

	return &token, nil
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		h.store.DeleteSession(cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("logged out"))
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	session := h.getSession(r)
	if session == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"authenticated": false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"authenticated": true,
		"username":      session.Username,
		"avatar_url":    session.AvatarURL,
	})
}

func (h *Handler) getSession(r *http.Request) *github.Session {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil
	}
	return h.store.GetSession(cookie.Value)
}

func (h *Handler) getClientForRequest(r *http.Request) *github.Client {
	session := h.getSession(r)
	if session != nil {
		return github.NewClient(session.AccessToken)
	}
	return h.publicClient
}

func (h *Handler) getClientForUser(r *http.Request, targetUsername string) *github.Client {
	session := h.getSession(r)
	if session != nil {
		return github.NewClient(session.AccessToken)
	}
	if h.publicTokenOwner != "" && strings.EqualFold(h.publicTokenOwner, targetUsername) {
		return github.NewPublicClient()
	}
	return h.publicClient
}
