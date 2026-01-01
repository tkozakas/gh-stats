package github

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewRankingService(t *testing.T) {
	service := NewRankingService()
	if service == nil {
		t.Fatal("expected service to be non-nil")
	}
	if service.cache == nil {
		t.Error("expected cache to be initialized")
	}
}

func TestNormalizeCountryName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Lithuania", "lithuania"},
		{"United States", "united_states"},
		{"bosnia-and-herzegovina", "bosnia_and_herzegovina"},
		{"United Kingdom", "united_kingdom"},
		{"new zealand", "new_zealand"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := normalizeCountryName(tt.input)
			if got != tt.expected {
				t.Errorf("normalizeCountryName(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestRankingService_GetCountryRanking(t *testing.T) {
	mockUsers := []CountryUser{
		{Login: "user1", Name: "User One", Followers: 100, PublicContributions: 500},
		{Login: "user2", Name: "User Two", Followers: 50, PublicContributions: 300},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/test_country.json" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(mockUsers)
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	service := NewRankingService()
	service.httpGet = func(url string) (*http.Response, error) {
		return http.Get(server.URL + "/test_country.json")
	}

	ranking, err := service.GetCountryRanking("test_country")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if ranking == nil {
		t.Fatal("expected ranking to be non-nil")
	}
	if len(ranking.Users) != 2 {
		t.Errorf("expected 2 users, got %d", len(ranking.Users))
	}
	if ranking.Users[0].Login != "user1" {
		t.Errorf("expected first user to be user1, got %s", ranking.Users[0].Login)
	}
}

func TestRankingService_GetCountryRanking_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))
	defer server.Close()

	service := NewRankingService()
	service.httpGet = func(url string) (*http.Response, error) {
		return http.Get(server.URL + "/nonexistent.json")
	}

	_, err := service.GetCountryRanking("nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent country")
	}
}

func TestRankingService_GetCountryRanking_CachesResult(t *testing.T) {
	callCount := 0
	mockUsers := []CountryUser{
		{Login: "user1", Name: "User One"},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockUsers)
	}))
	defer server.Close()

	service := NewRankingService()
	service.httpGet = func(url string) (*http.Response, error) {
		return http.Get(server.URL + "/cached_country.json")
	}

	service.GetCountryRanking("cached_country")
	service.GetCountryRanking("cached_country")

	if callCount != 1 {
		t.Errorf("expected 1 HTTP call (cached), got %d", callCount)
	}
}

func TestRankingService_FindUserInRanking(t *testing.T) {
	service := NewRankingService()
	ranking := &CountryRanking{
		Country: "test",
		Users: []CountryUser{
			{Login: "FirstUser", Name: "First", Followers: 100, PublicContributions: 500},
			{Login: "SecondUser", Name: "Second", Followers: 50, PublicContributions: 300},
			{Login: "ThirdUser", Name: "Third", Followers: 25, PublicContributions: 100},
		},
	}

	result := service.findUserInRanking("seconduser", ranking)
	if result == nil {
		t.Fatal("expected to find user")
	}
	if result.CountryRank != 2 {
		t.Errorf("expected rank 2, got %d", result.CountryRank)
	}
	if result.CountryTotal != 3 {
		t.Errorf("expected total 3, got %d", result.CountryTotal)
	}
	if result.Username != "SecondUser" {
		t.Errorf("expected username SecondUser, got %s", result.Username)
	}
}

func TestRankingService_FindUserInRanking_NotFound(t *testing.T) {
	service := NewRankingService()
	ranking := &CountryRanking{
		Country: "test",
		Users: []CountryUser{
			{Login: "user1"},
		},
	}

	result := service.findUserInRanking("nonexistent", ranking)
	if result != nil {
		t.Error("expected nil for non-existent user")
	}
}

func TestRankingService_GetUserRanking(t *testing.T) {
	mockUsers := []CountryUser{
		{Login: "TopUser", Followers: 1000, PublicContributions: 5000},
		{Login: "TestUser", Followers: 500, PublicContributions: 2500},
		{Login: "OtherUser", Followers: 100, PublicContributions: 500},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(mockUsers)
	}))
	defer server.Close()

	service := NewRankingService()
	service.httpGet = func(url string) (*http.Response, error) {
		return http.Get(server.URL + "/test.json")
	}

	ranking, err := service.GetUserRanking("testuser", "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if ranking == nil {
		t.Fatal("expected ranking to be non-nil")
	}
	if ranking.CountryRank != 2 {
		t.Errorf("expected rank 2, got %d", ranking.CountryRank)
	}
	if ranking.PublicContributions != 2500 {
		t.Errorf("expected 2500 contributions, got %d", ranking.PublicContributions)
	}
}

func TestRankingService_GetAvailableCountries(t *testing.T) {
	service := NewRankingService()

	service.cache["lithuania"] = &CountryRanking{Country: "lithuania"}
	service.cache["germany"] = &CountryRanking{Country: "germany"}

	countries := service.GetAvailableCountries()

	if len(countries) != 2 {
		t.Errorf("expected 2 countries, got %d", len(countries))
	}
}
