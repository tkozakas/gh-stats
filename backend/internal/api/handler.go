package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"me-site/backend/internal/cache"
	"me-site/backend/internal/github"
)

type Handler struct {
	gh            *github.Client
	store         *cache.Store
	webhookSecret string
}

func NewHandler(gh *github.Client, store *cache.Store, webhookSecret string) *Handler {
	return &Handler{
		gh:            gh,
		store:         store,
		webhookSecret: webhookSecret,
	}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := h.store.GetStats()
	if stats == nil {
		http.Error(w, "stats not available", http.StatusServiceUnavailable)
		return
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

func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	if h.webhookSecret != "" {
		signature := r.Header.Get("X-Hub-Signature-256")
		if signature == "" {
			http.Error(w, "missing signature", http.StatusUnauthorized)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}

		if !verifySignature(body, signature, h.webhookSecret) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
	}

	event := r.Header.Get("X-GitHub-Event")
	log.Printf("Received webhook event: %s", event)

	go func() {
		if err := h.RefreshStats(); err != nil {
			log.Printf("Failed to refresh stats: %v", err)
		}
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (h *Handler) RefreshStats() error {
	log.Println("Refreshing GitHub stats...")

	stats, err := h.gh.GetStats()
	if err != nil {
		return err
	}

	h.store.SetStats(stats)

	commits, err := h.gh.GetAllCommits(stats.Repositories)
	if err != nil {
		log.Printf("Warning: failed to fetch commits: %v", err)
	} else {
		h.store.SetCommits(commits)
		log.Printf("Fetched %d commits", len(commits))
	}

	log.Println("Stats refreshed successfully")
	return nil
}

func verifySignature(payload []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (h *Handler) GetRepositories(w http.ResponseWriter, r *http.Request) {
	stats := h.store.GetStats()
	if stats == nil {
		http.Error(w, "stats not available", http.StatusServiceUnavailable)
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

func (h *Handler) GetRepoStats(w http.ResponseWriter, r *http.Request) {
	repoName := r.URL.Query().Get("name")
	if repoName == "" {
		http.Error(w, "query parameter 'name' required", http.StatusBadRequest)
		return
	}

	stats := h.store.GetStats()
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

	commits := h.store.GetCommits()
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

func (h *Handler) GetFunStats(w http.ResponseWriter, r *http.Request) {
	stats := h.store.GetStats()
	commits := h.store.GetCommits()

	if stats == nil || commits == nil {
		http.Error(w, "stats not available", http.StatusServiceUnavailable)
		return
	}

	commitsByHour := make(map[int]int)
	commitsByDayOfWeek := make(map[string]int)
	commitsByMonth := make(map[string]int)
	commitsByRepo := make(map[string]int)

	var weekendCommits, nightCommits, earlyCommits int
	var firstCommit, lastCommit time.Time
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

		if firstCommit.IsZero() || c.Date.Before(firstCommit) {
			firstCommit = c.Date
		}
		if lastCommit.IsZero() || c.Date.After(lastCommit) {
			lastCommit = c.Date
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
