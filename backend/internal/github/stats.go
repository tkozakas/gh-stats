package github

import (
	"fmt"
	"log"
	"net/url"
	"sort"
	"sync"
	"time"
)

var defaultLanguageColors = map[string]string{
	"JavaScript":  "#f1e05a",
	"TypeScript":  "#3178c6",
	"Python":      "#3572A5",
	"Java":        "#b07219",
	"Go":          "#00ADD8",
	"Rust":        "#dea584",
	"C":           "#555555",
	"C++":         "#f34b7d",
	"C#":          "#178600",
	"Ruby":        "#701516",
	"PHP":         "#4F5D95",
	"Swift":       "#F05138",
	"Kotlin":      "#A97BFF",
	"Scala":       "#c22d40",
	"Shell":       "#89e051",
	"Bash":        "#89e051",
	"HTML":        "#e34c26",
	"CSS":         "#563d7c",
	"SCSS":        "#c6538c",
	"Vue":         "#41b883",
	"Svelte":      "#ff3e00",
	"Dart":        "#00B4AB",
	"Elixir":      "#6e4a7e",
	"Clojure":     "#db5855",
	"Haskell":     "#5e5086",
	"Lua":         "#000080",
	"R":           "#198CE7",
	"Julia":       "#a270ba",
	"Perl":        "#0298c3",
	"Objective-C": "#438eff",
	"Vim Script":  "#199f4b",
	"PowerShell":  "#012456",
	"Dockerfile":  "#384d54",
	"Makefile":    "#427819",
	"HCL":         "#844FBA",
	"Nix":         "#7e7eff",
	"Zig":         "#ec915c",
	"Nim":         "#ffc200",
	"OCaml":       "#3be133",
	"F#":          "#b845fc",
	"Erlang":      "#B83998",
	"Assembly":    "#6E4C13",
	"YAML":        "#cb171e",
	"JSON":        "#292929",
	"Markdown":    "#083fa1",
	"TeX":         "#3D6117",
}

func (c *Client) GetProfile(username string) (*Profile, error) {
	var profile Profile
	endpoint := "/users/" + username
	if username == "" {
		endpoint = "/user"
	}
	if err := c.request(endpoint, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}

func (c *Client) GetRepositories(username string) ([]Repository, error) {
	return c.GetRepositoriesWithVisibility(username, "public")
}

func (c *Client) GetRepositoriesWithVisibility(username string, visibility string) ([]Repository, error) {
	var allRepos []Repository
	page := 1

	for {
		var repos []Repository
		var endpoint string

		if visibility == "all" || visibility == "private" {
			endpoint = fmt.Sprintf("/user/repos?sort=updated&per_page=100&page=%d&affiliation=owner", page)
			if visibility == "all" {
				endpoint += "&visibility=all"
			} else {
				endpoint += "&visibility=private"
			}
		} else {
			endpoint = fmt.Sprintf("/users/%s/repos?sort=updated&per_page=100&page=%d", username, page)
		}

		if err := c.request(endpoint, &repos); err != nil {
			return allRepos, err
		}

		if len(repos) == 0 {
			break
		}

		for _, r := range repos {
			if !r.Fork && !r.Archived {
				if visibility == "private" && !r.Private {
					continue
				}
				if visibility == "public" && r.Private {
					continue
				}
				allRepos = append(allRepos, r)
			}
		}

		if len(repos) < 100 {
			break
		}
		page++
	}

	return allRepos, nil
}

func (c *Client) GetContributions(username string) ([]ContributionWeek, int, error) {
	return c.GetContributionsForYear(username, 0)
}

func (c *Client) GetContributionsForYear(username string, year int) ([]ContributionWeek, int, error) {
	var dateRange string
	if year > 0 {
		dateRange = fmt.Sprintf(`(from: "%d-01-01T00:00:00Z", to: "%d-12-31T23:59:59Z")`, year, year)
	}

	query := fmt.Sprintf(`{
		user(login: "%s") {
			contributionsCollection%s {
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							contributionCount
							date
							contributionLevel
						}
					}
				}
			}
		}
	}`, username, dateRange)

	var result struct {
		Data struct {
			User struct {
				ContributionsCollection struct {
					ContributionCalendar struct {
						TotalContributions int `json:"totalContributions"`
						Weeks              []struct {
							ContributionDays []struct {
								ContributionCount int    `json:"contributionCount"`
								Date              string `json:"date"`
								ContributionLevel string `json:"contributionLevel"`
							} `json:"contributionDays"`
						} `json:"weeks"`
					} `json:"contributionCalendar"`
				} `json:"contributionsCollection"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := c.graphql(query, &result); err != nil {
		return nil, 0, err
	}

	calendar := result.Data.User.ContributionsCollection.ContributionCalendar
	weeks := make([]ContributionWeek, len(calendar.Weeks))

	for i, w := range calendar.Weeks {
		days := make([]ContributionDay, len(w.ContributionDays))
		for j, d := range w.ContributionDays {
			days[j] = ContributionDay{
				Date:  d.Date,
				Count: d.ContributionCount,
				Level: levelToNumber(d.ContributionLevel),
			}
		}
		weeks[i] = ContributionWeek{Days: days}
	}

	return weeks, calendar.TotalContributions, nil
}

func levelToNumber(level string) int {
	levels := map[string]int{
		"NONE":            0,
		"FIRST_QUARTILE":  1,
		"SECOND_QUARTILE": 2,
		"THIRD_QUARTILE":  3,
		"FOURTH_QUARTILE": 4,
	}
	if n, ok := levels[level]; ok {
		return n
	}
	return 0
}

func (c *Client) GetCommits(username, repo, branch string) ([]Commit, error) {
	var allCommits []Commit
	page := 1

	for {
		endpoint := fmt.Sprintf("/repos/%s/%s/commits?per_page=100&page=%d", username, repo, page)
		if branch != "" {
			endpoint += "&sha=" + branch
		}

		var response []struct {
			SHA    string `json:"sha"`
			Commit struct {
				Message string `json:"message"`
				Author  struct {
					Name  string `json:"name"`
					Email string `json:"email"`
					Date  string `json:"date"`
				} `json:"author"`
			} `json:"commit"`
			HTMLURL string `json:"html_url"`
		}

		if err := c.request(endpoint, &response); err != nil {
			return allCommits, err
		}

		if len(response) == 0 {
			break
		}

		for _, r := range response {
			date, _ := time.Parse(time.RFC3339, r.Commit.Author.Date)
			allCommits = append(allCommits, Commit{
				SHA:     r.SHA,
				Message: r.Commit.Message,
				Author:  r.Commit.Author.Name,
				Email:   r.Commit.Author.Email,
				Date:    date,
				URL:     r.HTMLURL,
				Repo:    repo,
			})
		}

		if len(response) < 100 {
			break
		}
		page++
	}

	return allCommits, nil
}

func (c *Client) GetAllCommits(username string, repos []Repository) ([]Commit, error) {
	return c.GetAllCommitsWithLimit(username, repos, 0)
}

func (c *Client) GetAllCommitsWithLimit(username string, repos []Repository, limit int) ([]Commit, error) {
	if len(repos) == 0 {
		return []Commit{}, nil
	}

	sortedRepos := make([]Repository, len(repos))
	copy(sortedRepos, repos)
	sort.Slice(sortedRepos, func(i, j int) bool {
		return sortedRepos[i].Stars > sortedRepos[j].Stars
	})

	if limit > 0 && len(sortedRepos) > limit {
		sortedRepos = sortedRepos[:limit]
	}

	const maxWorkers = 10
	numWorkers := min(maxWorkers, len(sortedRepos))

	type result struct {
		commits []Commit
		err     error
	}

	repoChan := make(chan Repository, len(sortedRepos))
	resultChan := make(chan result, len(sortedRepos))

	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for repo := range repoChan {
				commits, err := c.GetCommits(username, repo.Name, "")
				resultChan <- result{commits: commits, err: err}
			}
		}()
	}

	for _, repo := range sortedRepos {
		repoChan <- repo
	}
	close(repoChan)

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	var allCommits []Commit
	for res := range resultChan {
		if res.err != nil {
			continue
		}
		allCommits = append(allCommits, res.commits...)
	}

	sort.Slice(allCommits, func(i, j int) bool {
		return allCommits[i].Date.After(allCommits[j].Date)
	})

	return allCommits, nil
}

func (c *Client) GetStats(username string) (*Stats, error) {
	return c.GetStatsWithVisibility(username, "public")
}

func (c *Client) GetStatsWithVisibility(username string, visibility string) (*Stats, error) {
	profile, err := c.GetProfile(username)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	repos, err := c.GetRepositoriesWithVisibility(username, visibility)
	if err != nil {
		return nil, fmt.Errorf("failed to get repositories: %w", err)
	}
	if repos == nil {
		repos = []Repository{}
	}

	contributions, total, err := c.GetContributions(username)
	if err != nil {
		log.Printf("get contributions error for %s: %v", username, err)
		contributions = []ContributionWeek{}
		total = 0
	}
	if contributions == nil {
		contributions = []ContributionWeek{}
	}

	languages := c.CalculateLanguages(username, repos)
	if languages == nil {
		languages = []LanguageStats{}
	}
	streak := calculateStreak(contributions, total)

	return &Stats{
		Profile:       *profile,
		Repositories:  repos,
		Contributions: contributions,
		Languages:     languages,
		Streak:        streak,
		UpdatedAt:     time.Now(),
	}, nil
}

func (c *Client) GetLanguagesWithColors(username string) (map[string]string, error) {
	query := fmt.Sprintf(`{
		user(login: "%s") {
			repositories(first: 100, ownerAffiliations: OWNER) {
				nodes {
					languages(first: 10) {
						edges {
							node {
								name
								color
							}
							size
						}
					}
				}
			}
		}
	}`, username)

	var result struct {
		Data struct {
			User struct {
				Repositories struct {
					Nodes []struct {
						Languages struct {
							Edges []struct {
								Node struct {
									Name  string `json:"name"`
									Color string `json:"color"`
								} `json:"node"`
								Size int `json:"size"`
							} `json:"edges"`
						} `json:"languages"`
					} `json:"nodes"`
				} `json:"repositories"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := c.graphql(query, &result); err != nil {
		return nil, err
	}

	colors := make(map[string]string)
	for _, repo := range result.Data.User.Repositories.Nodes {
		for _, edge := range repo.Languages.Edges {
			if edge.Node.Color != "" {
				colors[edge.Node.Name] = edge.Node.Color
			}
		}
	}

	return colors, nil
}

func (c *Client) CalculateLanguages(username string, repos []Repository) []LanguageStats {
	langCount := make(map[string]int)
	total := 0

	for _, repo := range repos {
		if repo.Language != "" {
			langCount[repo.Language]++
			total++
		}
	}

	if total == 0 {
		return nil
	}

	colors, _ := c.GetLanguagesWithColors(username)
	if colors == nil {
		colors = make(map[string]string)
	}

	var stats []LanguageStats
	for name, count := range langCount {
		color := colors[name]
		if color == "" {
			color = defaultLanguageColors[name]
		}
		if color == "" {
			color = "#8b8b8b"
		}
		stats = append(stats, LanguageStats{
			Name:       name,
			Percentage: (count * 100) / total,
			Color:      color,
		})
	}

	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Percentage > stats[j].Percentage
	})

	return stats
}

func (c *Client) SearchUsers(query string) ([]Profile, error) {
	var result struct {
		Items []Profile `json:"items"`
	}
	endpoint := fmt.Sprintf("/search/users?q=%s&per_page=20", url.QueryEscape(query))
	if err := c.request(endpoint, &result); err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (c *Client) GetFollowers(username string) ([]Profile, error) {
	var followers []Profile
	endpoint := fmt.Sprintf("/users/%s/followers?per_page=100", username)
	if err := c.request(endpoint, &followers); err != nil {
		return nil, err
	}
	return followers, nil
}

func (c *Client) GetFollowing(username string) ([]Profile, error) {
	var following []Profile
	endpoint := fmt.Sprintf("/users/%s/following?per_page=100", username)
	if err := c.request(endpoint, &following); err != nil {
		return nil, err
	}
	return following, nil
}

func (c *Client) GetCodeFrequency(username string, repos []Repository) (*CodeFrequency, error) {
	if len(repos) == 0 {
		return &CodeFrequency{Weeks: []CodeFrequencyWeek{}}, nil
	}

	const maxWorkers = 10
	numWorkers := min(maxWorkers, len(repos))

	type result struct {
		data [][]int64
		err  error
	}

	repoChan := make(chan Repository, len(repos))
	resultChan := make(chan result, len(repos))

	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for repo := range repoChan {
				var data [][]int64
				endpoint := fmt.Sprintf("/repos/%s/%s/stats/code_frequency", username, repo.Name)
				err := c.request(endpoint, &data)
				resultChan <- result{data: data, err: err}
			}
		}()
	}

	for _, repo := range repos {
		repoChan <- repo
	}
	close(repoChan)

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	weeklyData := make(map[int64]*CodeFrequencyWeek)
	totalAdditions := 0
	totalDeletions := 0

	for res := range resultChan {
		if res.err != nil || res.data == nil {
			continue
		}
		for _, week := range res.data {
			if len(week) < 3 {
				continue
			}
			timestamp := week[0]
			additions := int(week[1])
			deletions := int(-week[2])

			if _, exists := weeklyData[timestamp]; !exists {
				weeklyData[timestamp] = &CodeFrequencyWeek{Week: timestamp}
			}
			weeklyData[timestamp].Additions += additions
			weeklyData[timestamp].Deletions += deletions
			totalAdditions += additions
			totalDeletions += deletions
		}
	}

	weeks := make([]CodeFrequencyWeek, 0, len(weeklyData))
	for _, w := range weeklyData {
		weeks = append(weeks, *w)
	}
	sort.Slice(weeks, func(i, j int) bool {
		return weeks[i].Week < weeks[j].Week
	})

	return &CodeFrequency{
		Weeks:          weeks,
		TotalAdditions: totalAdditions,
		TotalDeletions: totalDeletions,
	}, nil
}

func calculateStreak(contributions []ContributionWeek, total int) StreakStats {
	var allDays []ContributionDay
	for _, w := range contributions {
		allDays = append(allDays, w.Days...)
	}

	if len(allDays) == 0 {
		return StreakStats{TotalContributions: total}
	}

	sort.Slice(allDays, func(i, j int) bool {
		return allDays[i].Date < allDays[j].Date
	})

	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	currentStreak := 0
	longestStreak := 0
	tempStreak := 0
	var prevDate time.Time

	for _, day := range allDays {
		currDate, err := time.Parse("2006-01-02", day.Date)
		if err != nil {
			continue
		}

		if day.Count > 0 {
			if tempStreak == 0 || currDate.Sub(prevDate).Hours() == 24 {
				tempStreak++
			} else {
				if tempStreak > longestStreak {
					longestStreak = tempStreak
				}
				tempStreak = 1
			}
			prevDate = currDate
		} else {
			if tempStreak > longestStreak {
				longestStreak = tempStreak
			}
			tempStreak = 0
		}
	}

	if tempStreak > longestStreak {
		longestStreak = tempStreak
	}

	if tempStreak > 0 && (allDays[len(allDays)-1].Date == today || allDays[len(allDays)-1].Date == yesterday) {
		lastContribDate := prevDate.Format("2006-01-02")
		if lastContribDate == today || lastContribDate == yesterday {
			currentStreak = tempStreak
		}
	}

	return StreakStats{
		CurrentStreak:      currentStreak,
		LongestStreak:      longestStreak,
		TotalContributions: total,
	}
}
