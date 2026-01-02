package github

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	rankingBaseURL      = "https://raw.githubusercontent.com/gayanvoice/top-github-users/main/cache"
	countriesListURL    = "https://api.github.com/repos/gayanvoice/top-github-users/contents/cache"
	rankingTTL          = 6 * time.Hour
	countriesRefreshTTL = 24 * time.Hour
)

type GlobalUser struct {
	Login               string `json:"login"`
	Country             string `json:"country"`
	PublicContributions int    `json:"publicContributions"`
}

type RankingService struct {
	mu                 sync.RWMutex
	cache              map[string]*CountryRanking
	globalIndex        []GlobalUser
	globalMap          map[string]int
	availableCountries []string
	countriesUpdatedAt time.Time
	httpGet            func(url string) (*http.Response, error)
}

func NewRankingService() *RankingService {
	rs := &RankingService{
		cache:              make(map[string]*CountryRanking),
		globalIndex:        []GlobalUser{},
		globalMap:          make(map[string]int),
		availableCountries: []string{},
		httpGet:            http.Get,
	}
	go rs.refreshCountriesList()
	return rs
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
	r.rebuildGlobalIndex()
	r.mu.Unlock()

	return ranking, nil
}

func (r *RankingService) rebuildGlobalIndex() {
	var allUsers []GlobalUser
	for country, ranking := range r.cache {
		for _, user := range ranking.Users {
			allUsers = append(allUsers, GlobalUser{
				Login:               user.Login,
				Country:             country,
				PublicContributions: user.PublicContributions,
			})
		}
	}

	sort.Slice(allUsers, func(i, j int) bool {
		return allUsers[i].PublicContributions > allUsers[j].PublicContributions
	})

	r.globalIndex = allUsers
	r.globalMap = make(map[string]int, len(allUsers))
	for i, user := range allUsers {
		r.globalMap[strings.ToLower(user.Login)] = i
	}
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
			globalRank := 0
			globalTotal := len(r.globalIndex)
			if idx, ok := r.globalMap[lowerUsername]; ok {
				globalRank = idx + 1
			}

			return &UserRanking{
				Username:             user.Login,
				Country:              ranking.Country,
				CountryRank:          i + 1,
				CountryTotal:         len(ranking.Users),
				GlobalRank:           globalRank,
				GlobalTotal:          globalTotal,
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

	if time.Since(r.countriesUpdatedAt) > countriesRefreshTTL {
		go r.refreshCountriesList()
	}

	if len(r.availableCountries) > 0 {
		result := make([]string, len(r.availableCountries))
		copy(result, r.availableCountries)
		return result
	}

	countries := make([]string, 0, len(r.cache))
	for country := range r.cache {
		countries = append(countries, country)
	}
	return countries
}

func (r *RankingService) GetGlobalRanking(limit int) []GlobalUser {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if limit <= 0 || limit > len(r.globalIndex) {
		limit = len(r.globalIndex)
	}

	result := make([]GlobalUser, limit)
	copy(result, r.globalIndex[:limit])
	return result
}

func (r *RankingService) refreshCountriesList() {
	resp, err := r.httpGet(countriesListURL)
	if err != nil {
		log.Printf("Failed to fetch countries list: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Failed to fetch countries list: status %d", resp.StatusCode)
		return
	}

	var contents []struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&contents); err != nil {
		log.Printf("Failed to decode countries list: %v", err)
		return
	}

	countries := make([]string, 0, len(contents))
	for _, c := range contents {
		if strings.HasSuffix(c.Name, ".json") {
			countries = append(countries, strings.TrimSuffix(c.Name, ".json"))
		}
	}
	sort.Strings(countries)

	r.mu.Lock()
	r.availableCountries = countries
	r.countriesUpdatedAt = time.Now()
	r.mu.Unlock()

	log.Printf("Refreshed countries list: %d countries available", len(countries))
}
