package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"gh-stats/backend/internal/cache"
	"gh-stats/backend/internal/github"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store            *cache.Store
	oauth            *github.OAuthConfig
	frontendURL      string
	ranking          *github.RankingService
	publicClient     *github.Client
	publicTokenOwner string // username of the GITHUB_TOKEN owner (to prevent exposing their private data)
}

func NewHandler(store *cache.Store, oauth *github.OAuthConfig, frontendURL string, githubToken string) *Handler {
	var publicClient *github.Client
	var publicTokenOwner string

	if githubToken != "" {
		publicClient = github.NewClient(githubToken)
		if profile, err := publicClient.GetProfile(""); err == nil {
			publicTokenOwner = profile.Login
			log.Printf("GITHUB_TOKEN owner: %s (their private data protected from public access)", publicTokenOwner)
		}
	} else {
		publicClient = github.NewPublicClient()
	}

	return &Handler{
		store:            store,
		oauth:            oauth,
		frontendURL:      frontendURL,
		ranking:          github.NewRankingService(),
		publicClient:     publicClient,
		publicTokenOwner: publicTokenOwner,
	}
}

func (h *Handler) writeRateLimitError(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusTooManyRequests)
	json.NewEncoder(w).Encode(map[string]any{
		"error":          "rate_limited",
		"message":        "GitHub API rate limit exceeded. Please login for higher limits.",
		"login_required": true,
	})
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (h *Handler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter 'q' required", http.StatusBadRequest)
		return
	}

	client := h.getClientForRequest(r)
	users, err := client.SearchUsers(query)
	if err != nil {
		log.Printf("search users error: %v", err)
		if strings.Contains(err.Error(), "403") {
			h.writeRateLimitError(w)
			return
		}
		http.Error(w, "search failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"count": len(users),
		"users": users,
	})
}

func (h *Handler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	visibility := r.URL.Query().Get("visibility")
	if visibility == "" {
		visibility = "public"
	}
	if visibility != "public" && visibility != "private" && visibility != "all" {
		http.Error(w, "visibility must be public, private, or all", http.StatusBadRequest)
		return
	}

	client := h.getClientForUser(r, username)
	session := h.getSession(r)
	isOwnProfile := session != nil && strings.EqualFold(session.Username, username)

	if (visibility == "private" || visibility == "all") && !isOwnProfile {
		http.Error(w, "private visibility only available for your own profile", http.StatusForbidden)
		return
	}

	cacheKey := username + ":" + visibility
	if isOwnProfile {
		cacheKey = username + ":auth:" + visibility
	}

	stats := h.store.GetStats(cacheKey)
	if stats == nil {
		var err error
		stats, err = client.GetStatsWithVisibility(username, visibility)
		if err != nil {
			log.Printf("get stats error for %s: %v", username, err)
			if strings.Contains(err.Error(), "not found") {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			if strings.Contains(err.Error(), "403") {
				h.writeRateLimitError(w)
				return
			}
			http.Error(w, "failed to fetch stats", http.StatusInternalServerError)
			return
		}
		h.store.SetStats(cacheKey, stats)

		go func() {
			commits, err := client.GetAllCommits(username, stats.Repositories)
			if err != nil {
				log.Printf("Warning: failed to fetch commits for %s: %v", username, err)
				return
			}
			h.store.SetCommits(cacheKey, commits)
			log.Printf("Fetched %d commits for %s", len(commits), username)
		}()
	}

	lang := r.URL.Query().Get("language")
	if lang != "" {
		stats = filterStatsByLanguage(stats, lang)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func filterStatsByLanguage(stats *github.Stats, lang string) *github.Stats {
	filtered := *stats
	var repos []github.Repository

	for _, repo := range stats.Repositories {
		if strings.EqualFold(repo.Language, lang) {
			repos = append(repos, repo)
		}
	}

	filtered.Repositories = repos
	return &filtered
}

func (h *Handler) GetUserRepositories(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	session := h.getSession(r)
	isOwnProfile := session != nil && strings.EqualFold(session.Username, username)

	cacheKey := username
	if isOwnProfile {
		cacheKey = username + ":auth"
	}

	stats := h.store.GetStats(cacheKey)
	if stats == nil {
		stats = h.store.GetStats(username)
	}
	if stats == nil {
		http.Error(w, "stats not available, fetch user stats first", http.StatusServiceUnavailable)
		return
	}

	query := strings.ToLower(r.URL.Query().Get("q"))
	repos := stats.Repositories

	if query != "" {
		var filtered []github.Repository
		for _, repo := range repos {
			if strings.Contains(strings.ToLower(repo.Name), query) ||
				strings.Contains(strings.ToLower(repo.Description), query) ||
				strings.Contains(strings.ToLower(repo.Language), query) {
				filtered = append(filtered, repo)
			}
		}
		repos = filtered
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"count":        len(repos),
		"repositories": repos,
	})
}

func (h *Handler) GetUserRepoStats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	repoName := chi.URLParam(r, "repo")

	if username == "" || repoName == "" {
		http.Error(w, "username and repo required", http.StatusBadRequest)
		return
	}

	session := h.getSession(r)
	isOwnProfile := session != nil && strings.EqualFold(session.Username, username)

	cacheKey := username
	if isOwnProfile {
		cacheKey = username + ":auth"
	}

	stats := h.store.GetStats(cacheKey)
	if stats == nil {
		stats = h.store.GetStats(username)
	}
	if stats == nil {
		http.Error(w, "stats not available", http.StatusServiceUnavailable)
		return
	}

	var repo *github.Repository
	for _, r := range stats.Repositories {
		if strings.EqualFold(r.Name, repoName) {
			repo = &r
			break
		}
	}

	if repo == nil {
		http.Error(w, "repository not found", http.StatusNotFound)
		return
	}

	commits := h.store.GetCommits(cacheKey)
	if commits == nil {
		commits = h.store.GetCommits(username)
	}
	var repoCommits []github.Commit
	for _, c := range commits {
		if strings.EqualFold(c.Repo, repoName) {
			repoCommits = append(repoCommits, c)
		}
	}

	commitsByDay := make(map[string]int)
	commitsByHour := make(map[int]int)
	var firstCommit, lastCommit time.Time

	for _, c := range repoCommits {
		day := c.Date.Weekday().String()
		commitsByDay[day]++
		commitsByHour[c.Date.Hour()]++

		if firstCommit.IsZero() || c.Date.Before(firstCommit) {
			firstCommit = c.Date
		}
		if lastCommit.IsZero() || c.Date.After(lastCommit) {
			lastCommit = c.Date
		}
	}

	repoStats := github.RepoStats{
		Repository:    *repo,
		Commits:       repoCommits,
		TotalCommits:  len(repoCommits),
		FirstCommit:   firstCommit,
		LastCommit:    lastCommit,
		CommitsByDay:  commitsByDay,
		CommitsByHour: commitsByHour,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(repoStats)
}

func (h *Handler) GetUserFunStats(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	session := h.getSession(r)
	isOwnProfile := session != nil && strings.EqualFold(session.Username, username)

	cacheKey := username
	if isOwnProfile {
		cacheKey = username + ":auth"
	}

	stats := h.store.GetStats(cacheKey)
	if stats == nil {
		stats = h.store.GetStats(username)
	}
	commits := h.store.GetCommits(cacheKey)
	if commits == nil {
		commits = h.store.GetCommits(username)
	}

	if stats == nil {
		http.Error(w, "stats not available", http.StatusServiceUnavailable)
		return
	}

	if commits == nil {
		commits = []github.Commit{}
	}

	commitsByHour := make(map[int]int)
	commitsByDayOfWeek := make(map[string]int)
	commitsByMonth := make(map[string]int)
	commitsByRepo := make(map[string]int)

	var weekendCommits, nightCommits, earlyCommits int
	uniqueDays := make(map[string]bool)

	for _, c := range commits {
		commitsByHour[c.Date.Hour()]++
		commitsByDayOfWeek[c.Date.Weekday().String()]++
		commitsByMonth[c.Date.Format("2006-01")]++
		commitsByRepo[c.Repo]++
		uniqueDays[c.Date.Format("2006-01-02")] = true

		hour := c.Date.Hour()
		if hour >= 22 || hour < 6 {
			nightCommits++
		}
		if hour >= 5 && hour < 9 {
			earlyCommits++
		}

		if c.Date.Weekday() == time.Saturday || c.Date.Weekday() == time.Sunday {
			weekendCommits++
		}
	}

	mostProductiveHour := 0
	maxHourCommits := 0
	for hour, count := range commitsByHour {
		if count > maxHourCommits {
			maxHourCommits = count
			mostProductiveHour = hour
		}
	}

	mostProductiveDay := ""
	maxDayCommits := 0
	for day, count := range commitsByDayOfWeek {
		if count > maxDayCommits {
			maxDayCommits = count
			mostProductiveDay = day
		}
	}

	mostActiveRepo := ""
	mostActiveRepoCommits := 0
	for repo, count := range commitsByRepo {
		if count > mostActiveRepoCommits {
			mostActiveRepoCommits = count
			mostActiveRepo = repo
		}
	}

	totalDays := len(uniqueDays)
	avgCommitsPerDay := 0.0
	if totalDays > 0 {
		avgCommitsPerDay = float64(len(commits)) / float64(totalDays)
	}

	total := float64(len(commits))
	weekendPercent := 0.0
	nightPercent := 0.0
	earlyPercent := 0.0
	if total > 0 {
		weekendPercent = float64(weekendCommits) / total * 100
		nightPercent = float64(nightCommits) / total * 100
		earlyPercent = float64(earlyCommits) / total * 100
	}

	longestStreak := calculateLongestStreak(commits)

	funStats := github.FunStats{
		MostProductiveHour:    mostProductiveHour,
		MostProductiveDay:     mostProductiveDay,
		CommitsByHour:         commitsByHour,
		CommitsByDayOfWeek:    commitsByDayOfWeek,
		CommitsByMonth:        commitsByMonth,
		AverageCommitsPerDay:  avgCommitsPerDay,
		LongestCodingStreak:   longestStreak,
		TotalCommits:          len(commits),
		TotalRepositories:     len(stats.Repositories),
		MostActiveRepo:        mostActiveRepo,
		MostActiveRepoCommits: mostActiveRepoCommits,
		WeekendWarriorPercent: weekendPercent,
		NightOwlPercent:       nightPercent,
		EarlyBirdPercent:      earlyPercent,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(funStats)
}

func (h *Handler) GetUserFollowers(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	client := h.getClientForUser(r, username)
	followers, err := client.GetFollowers(username)
	if err != nil {
		log.Printf("get followers error: %v", err)
		if strings.Contains(err.Error(), "403") {
			h.writeRateLimitError(w)
			return
		}
		http.Error(w, "failed to fetch followers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"count":     len(followers),
		"followers": followers,
	})
}

func (h *Handler) GetUserFollowing(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	client := h.getClientForUser(r, username)
	following, err := client.GetFollowing(username)
	if err != nil {
		log.Printf("get following error: %v", err)
		if strings.Contains(err.Error(), "403") {
			h.writeRateLimitError(w)
			return
		}
		http.Error(w, "failed to fetch following", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"count":     len(following),
		"following": following,
	})
}

func calculateLongestStreak(commits []github.Commit) int {
	if len(commits) == 0 {
		return 0
	}

	days := make(map[string]bool)
	for _, c := range commits {
		days[c.Date.Format("2006-01-02")] = true
	}

	var sortedDays []string
	for day := range days {
		sortedDays = append(sortedDays, day)
	}
	sort.Strings(sortedDays)

	longest := 1
	current := 1

	for i := 1; i < len(sortedDays); i++ {
		prev, _ := time.Parse("2006-01-02", sortedDays[i-1])
		curr, _ := time.Parse("2006-01-02", sortedDays[i])

		if curr.Sub(prev).Hours() == 24 {
			current++
			if current > longest {
				longest = current
			}
		} else {
			current = 1
		}
	}

	return longest
}

func (h *Handler) GetCountryRanking(w http.ResponseWriter, r *http.Request) {
	country := chi.URLParam(r, "country")
	if country == "" {
		http.Error(w, "country required", http.StatusBadRequest)
		return
	}

	ranking, err := h.ranking.GetCountryRanking(country)
	if err != nil {
		log.Printf("get country ranking error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "country not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to fetch ranking", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ranking)
}

func (h *Handler) GetUserRanking(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	country := r.URL.Query().Get("country")
	var ranking *github.UserRanking
	var err error

	if country != "" {
		ranking, err = h.ranking.GetUserRanking(username, country)
	} else {
		ranking, err = h.ranking.FindUserRanking(username)
	}

	if err != nil {
		log.Printf("get user ranking error: %v", err)
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, "country not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to fetch ranking", http.StatusInternalServerError)
		return
	}

	if ranking == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"found": false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"found":   true,
		"ranking": ranking,
	})
}
