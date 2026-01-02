package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"gh-stats/backend/internal/cache"
	"gh-stats/backend/internal/github"

	"github.com/go-chi/chi/v5"
)

func setupMockGitHubServer(handlers map[string]http.HandlerFunc) *httptest.Server {
	mux := http.NewServeMux()
	for pattern, handler := range handlers {
		mux.HandleFunc(pattern, handler)
	}
	return httptest.NewServer(mux)
}

func TestIntegration_GetUserStats_WithoutToken_GracefulDegradation(t *testing.T) {
	mockServer := setupMockGitHubServer(map[string]http.HandlerFunc{
		"/users/testuser": func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"login":      "testuser",
				"name":       "Test User",
				"avatar_url": "https://example.com/avatar.png",
				"bio":        "Test bio",
			})
		},
		"/users/testuser/repos": func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode([]map[string]any{
				{"name": "repo1", "language": "Go", "stargazers_count": 10},
				{"name": "repo2", "language": "TypeScript", "stargazers_count": 5},
			})
		},
		"/graphql": func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"message": "Requires authentication"})
				return
			}
			json.NewEncoder(w).Encode(map[string]any{
				"data": map[string]any{
					"user": map[string]any{
						"contributionsCollection": map[string]any{
							"contributionCalendar": map[string]any{
								"totalContributions": 100,
								"weeks":              []any{},
							},
						},
					},
				},
			})
		},
	})
	defer mockServer.Close()

	originalAPIURL := github.SetAPIURL(mockServer.URL)
	originalGraphQLURL := github.SetGraphQLURL(mockServer.URL + "/graphql")
	defer func() {
		github.SetAPIURL(originalAPIURL)
		github.SetGraphQLURL(originalGraphQLURL)
	}()

	store := cache.New()
	handler := NewHandler(store, nil, "http://localhost:3000", "")

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}

	var response github.Stats
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Profile.Login != "testuser" {
		t.Errorf("expected login testuser, got %s", response.Profile.Login)
	}
	if len(response.Repositories) != 2 {
		t.Errorf("expected 2 repositories, got %d", len(response.Repositories))
	}
	if len(response.Contributions) != 0 {
		t.Errorf("expected 0 contributions (graceful degradation), got %d", len(response.Contributions))
	}
}

func TestIntegration_GetUserStats_WithToken_FullData(t *testing.T) {
	mockServer := setupMockGitHubServer(map[string]http.HandlerFunc{
		"/users/testuser": func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"login":      "testuser",
				"name":       "Test User",
				"avatar_url": "https://example.com/avatar.png",
			})
		},
		"/users/testuser/repos": func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode([]map[string]any{
				{"name": "repo1", "language": "Go"},
			})
		},
		"/graphql": func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			json.NewEncoder(w).Encode(map[string]any{
				"data": map[string]any{
					"user": map[string]any{
						"contributionsCollection": map[string]any{
							"contributionCalendar": map[string]any{
								"totalContributions": 50,
								"weeks": []map[string]any{
									{
										"contributionDays": []map[string]any{
											{"date": "2025-01-01", "contributionCount": 5, "contributionLevel": "FIRST_QUARTILE"},
										},
									},
								},
							},
						},
						"repositories": map[string]any{
							"nodes": []any{},
						},
					},
				},
			})
		},
	})
	defer mockServer.Close()

	originalAPIURL := github.SetAPIURL(mockServer.URL)
	originalGraphQLURL := github.SetGraphQLURL(mockServer.URL + "/graphql")
	defer func() {
		github.SetAPIURL(originalAPIURL)
		github.SetGraphQLURL(originalGraphQLURL)
	}()

	store := cache.New()
	handler := NewHandler(store, nil, "http://localhost:3000", "test-token")

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}

	var response github.Stats
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Contributions) == 0 {
		t.Error("expected contributions with token, got none")
	}
}

func TestIntegration_GetUserStats_UserNotFound(t *testing.T) {
	mockServer := setupMockGitHubServer(map[string]http.HandlerFunc{
		"/users/nonexistent": func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"message": "Not Found"})
		},
	})
	defer mockServer.Close()

	originalAPIURL := github.SetAPIURL(mockServer.URL)
	defer github.SetAPIURL(originalAPIURL)

	store := cache.New()
	handler := NewHandler(store, nil, "http://localhost:3000", "test-token")

	req := httptest.NewRequest(http.MethodGet, "/api/users/nonexistent/stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestIntegration_GetUserStats_RateLimited(t *testing.T) {
	mockServer := setupMockGitHubServer(map[string]http.HandlerFunc{
		"/users/testuser": func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"message": "API rate limit exceeded"})
		},
	})
	defer mockServer.Close()

	originalAPIURL := github.SetAPIURL(mockServer.URL)
	defer github.SetAPIURL(originalAPIURL)

	store := cache.New()
	handler := NewHandler(store, nil, "http://localhost:3000", "")

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected status %d, got %d", http.StatusTooManyRequests, w.Code)
	}

	var response map[string]any
	json.NewDecoder(w.Body).Decode(&response)
	if response["login_required"] != true {
		t.Error("expected login_required to be true")
	}
}

func TestIntegration_PrivateVisibility_RequiresOwnProfile(t *testing.T) {
	store := cache.New()
	handler := NewHandler(store, nil, "http://localhost:3000", "")

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats?visibility=private", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, w.Code)
	}
}

func TestIntegration_CachedStats_ReturnedWithoutAPICall(t *testing.T) {
	apiCalled := false
	mockServer := setupMockGitHubServer(map[string]http.HandlerFunc{
		"/users/testuser": func(w http.ResponseWriter, r *http.Request) {
			apiCalled = true
			json.NewEncoder(w).Encode(map[string]any{"login": "testuser"})
		},
	})
	defer mockServer.Close()

	originalAPIURL := github.SetAPIURL(mockServer.URL)
	defer github.SetAPIURL(originalAPIURL)

	store := cache.New()
	store.SetStats("testuser:public", &github.Stats{
		Profile: github.Profile{Login: "testuser", Name: "Cached User"},
		Repositories: []github.Repository{
			{Name: "cached-repo"},
		},
	})
	handler := NewHandler(store, nil, "http://localhost:3000", "")

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	if apiCalled {
		t.Error("expected API not to be called when cache exists")
	}

	var response github.Stats
	json.NewDecoder(w.Body).Decode(&response)
	if response.Profile.Name != "Cached User" {
		t.Errorf("expected cached user, got %s", response.Profile.Name)
	}
}
