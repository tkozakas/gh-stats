package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"gh-stats/backend/internal/cache"
	"gh-stats/backend/internal/github"

	"github.com/go-chi/chi/v5"
)

func newTestHandler() *Handler {
	store := cache.New()
	return NewHandler(store, nil, "http://localhost:3000", "")
}

func TestNewHandler_ReturnsHandler(t *testing.T) {
	store := cache.New()
	oauth := &github.OAuthConfig{ClientID: "test"}
	frontendURL := "http://localhost:3000"

	handler := NewHandler(store, oauth, frontendURL, "")

	if handler == nil {
		t.Fatal("expected handler to be non-nil")
	}
	if handler.store != store {
		t.Error("expected store to match")
	}
	if handler.oauth != oauth {
		t.Error("expected oauth to match")
	}
	if handler.frontendURL != frontendURL {
		t.Errorf("expected frontendURL %q, got %q", frontendURL, handler.frontendURL)
	}
}

func TestHandler_Health_ReturnsOK(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	handler.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}
	if w.Body.String() != "ok" {
		t.Errorf("expected body %q, got %q", "ok", w.Body.String())
	}
}

func TestHandler_SearchUsers_RequiresQueryParam(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users/search", nil)
	w := httptest.NewRecorder()

	handler.SearchUsers(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserStats_RequiresUsername(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users//stats", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserStats_InvalidVisibility(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/stats?visibility=invalid", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserRepositories_RequiresUsername(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users//repositories", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/repositories", handler.GetUserRepositories)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserRepositories_ReturnsServiceUnavailableWithoutCache(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/repositories", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/repositories", handler.GetUserRepositories)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status %d, got %d", http.StatusServiceUnavailable, w.Code)
	}
}

func TestHandler_GetUserRepositories_ReturnsRepositoriesFromCache(t *testing.T) {
	handler := newTestHandler()
	handler.store.SetStats("testuser", &github.Stats{
		Repositories: []github.Repository{
			{Name: "repo1", Language: "Go"},
			{Name: "repo2", Language: "TypeScript"},
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/repositories", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/repositories", handler.GetUserRepositories)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]any
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if response["count"].(float64) != 2 {
		t.Errorf("expected count 2, got %v", response["count"])
	}
}

func TestHandler_GetUserRepositories_FiltersRepositoriesByQuery(t *testing.T) {
	handler := newTestHandler()
	handler.store.SetStats("testuser", &github.Stats{
		Repositories: []github.Repository{
			{Name: "awesome-go", Language: "Go"},
			{Name: "react-app", Language: "TypeScript"},
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/users/testuser/repositories?q=go", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/repositories", handler.GetUserRepositories)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]any
	json.NewDecoder(w.Body).Decode(&response)
	if response["count"].(float64) != 1 {
		t.Errorf("expected count 1, got %v", response["count"])
	}
}

func TestHandler_GetUserRepoStats_RequiresUsernameAndRepo(t *testing.T) {
	handler := newTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/users//repos/test", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/repos/{repo}", handler.GetUserRepoStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserFunStats_RequiresUsername(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users//fun", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/fun", handler.GetUserFunStats)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserFollowers_RequiresUsername(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users//followers", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/followers", handler.GetUserFollowers)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestHandler_GetUserFollowing_RequiresUsername(t *testing.T) {
	handler := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/users//following", nil)
	w := httptest.NewRecorder()

	r := chi.NewRouter()
	r.Get("/api/users/{username}/following", handler.GetUserFollowing)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCalculateLongestStreak_EmptyCommits(t *testing.T) {
	streak := calculateLongestStreak([]github.Commit{})
	if streak != 0 {
		t.Errorf("expected streak 0, got %d", streak)
	}
}

func TestCalculateLongestStreak_SingleCommit(t *testing.T) {
	commits := []github.Commit{
		{Date: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)},
	}
	streak := calculateLongestStreak(commits)
	if streak != 1 {
		t.Errorf("expected streak 1, got %d", streak)
	}
}

func TestCalculateLongestStreak_ConsecutiveDays(t *testing.T) {
	commits := []github.Commit{
		{Date: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 3, 12, 0, 0, 0, time.UTC)},
	}
	streak := calculateLongestStreak(commits)
	if streak != 3 {
		t.Errorf("expected streak 3, got %d", streak)
	}
}

func TestCalculateLongestStreak_WithGap(t *testing.T) {
	commits := []github.Commit{
		{Date: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 2, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 5, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 6, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 7, 12, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 8, 12, 0, 0, 0, time.UTC)},
	}
	streak := calculateLongestStreak(commits)
	if streak != 4 {
		t.Errorf("expected streak 4, got %d", streak)
	}
}

func TestCalculateLongestStreak_MultipleCommitsSameDay(t *testing.T) {
	commits := []github.Commit{
		{Date: time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 1, 14, 0, 0, 0, time.UTC)},
		{Date: time.Date(2025, 1, 1, 18, 0, 0, 0, time.UTC)},
	}
	streak := calculateLongestStreak(commits)
	if streak != 1 {
		t.Errorf("expected streak 1, got %d", streak)
	}
}

func TestFilterStatsByLanguage_FiltersCorrectly(t *testing.T) {
	stats := &github.Stats{
		Repositories: []github.Repository{
			{Name: "go-project", Language: "Go"},
			{Name: "ts-project", Language: "TypeScript"},
			{Name: "another-go", Language: "Go"},
		},
	}

	filtered := filterStatsByLanguage(stats, "Go")

	if len(filtered.Repositories) != 2 {
		t.Errorf("expected 2 repos, got %d", len(filtered.Repositories))
	}
	for _, repo := range filtered.Repositories {
		if repo.Language != "Go" {
			t.Errorf("expected language Go, got %s", repo.Language)
		}
	}
}

func TestFilterStatsByLanguage_CaseInsensitive(t *testing.T) {
	stats := &github.Stats{
		Repositories: []github.Repository{
			{Name: "go-project", Language: "Go"},
		},
	}

	filtered := filterStatsByLanguage(stats, "go")

	if len(filtered.Repositories) != 1 {
		t.Errorf("expected 1 repo, got %d", len(filtered.Repositories))
	}
}

func TestFilterStatsByLanguage_NoMatch(t *testing.T) {
	stats := &github.Stats{
		Repositories: []github.Repository{
			{Name: "go-project", Language: "Go"},
		},
	}

	filtered := filterStatsByLanguage(stats, "Rust")

	if len(filtered.Repositories) != 0 {
		t.Errorf("expected 0 repos, got %d", len(filtered.Repositories))
	}
}
