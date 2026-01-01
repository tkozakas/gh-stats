package github

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	rankingBaseURL = "https://raw.githubusercontent.com/gayanvoice/top-github-users/main/cache"
	rankingTTL     = 6 * time.Hour
)

type RankingService struct {
	mu      sync.RWMutex
	cache   map[string]*CountryRanking
	httpGet func(url string) (*http.Response, error)
}

func NewRankingService() *RankingService {
	return &RankingService{
		cache:   make(map[string]*CountryRanking),
		httpGet: http.Get,
	}
}

func (r *RankingService) GetCountryRanking(country string) (*CountryRanking, error) {
	normalizedCountry := normalizeCountryName(country)

	r.mu.RLock()
	cached, ok := r.cache[normalizedCountry]
	r.mu.RUnlock()

	if ok && time.Since(cached.UpdatedAt) < rankingTTL {
		return cached, nil
	}

	ranking, err := r.fetchCountryRanking(normalizedCountry)
	if err != nil {
		if cached != nil {
			return cached, nil
		}
		return nil, err
	}

	r.mu.Lock()
	r.cache[normalizedCountry] = ranking
	r.mu.Unlock()

	return ranking, nil
}

func (r *RankingService) fetchCountryRanking(country string) (*CountryRanking, error) {
	url := fmt.Sprintf("%s/%s.json", rankingBaseURL, country)

	resp, err := r.httpGet(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ranking data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("country not found: %s", country)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var users []CountryUser
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, fmt.Errorf("failed to decode ranking data: %w", err)
	}

	return &CountryRanking{
		Country:   country,
		Users:     users,
		UpdatedAt: time.Now(),
	}, nil
}

func (r *RankingService) GetUserRanking(username string, country string) (*UserRanking, error) {
	ranking, err := r.GetCountryRanking(country)
	if err != nil {
		return nil, err
	}

	return r.findUserInRanking(username, ranking), nil
}

func (r *RankingService) FindUserRanking(username string) (*UserRanking, error) {
	r.mu.RLock()
	for _, ranking := range r.cache {
		if result := r.findUserInRanking(username, ranking); result != nil {
			r.mu.RUnlock()
			return result, nil
		}
	}
	r.mu.RUnlock()

	return nil, nil
}

func (r *RankingService) findUserInRanking(username string, ranking *CountryRanking) *UserRanking {
	lowerUsername := strings.ToLower(username)
	for i, user := range ranking.Users {
		if strings.ToLower(user.Login) == lowerUsername {
			return &UserRanking{
				Username:             user.Login,
				Country:              ranking.Country,
				CountryRank:          i + 1,
				CountryTotal:         len(ranking.Users),
				PublicContributions:  user.PublicContributions,
				PrivateContributions: user.PrivateContributions,
				Followers:            user.Followers,
			}
		}
	}
	return nil
}

func normalizeCountryName(country string) string {
	country = strings.ToLower(country)
	country = strings.ReplaceAll(country, " ", "_")
	country = strings.ReplaceAll(country, "-", "_")
	return country
}

func (r *RankingService) GetAvailableCountries() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	countries := make([]string, 0, len(r.cache))
	for country := range r.cache {
		countries = append(countries, country)
	}
	return countries
}
