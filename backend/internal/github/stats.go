package github

import (
	"fmt"
	"net/url"
	"sort"
	"time"
)

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
	query := fmt.Sprintf(`{
		user(login: "%s") {
			contributionsCollection {
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
	}`, username)

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
	var allCommits []Commit

	for _, repo := range repos {
		commits, err := c.GetCommits(username, repo.Name, "")
		if err != nil {
			continue
		}
		allCommits = append(allCommits, commits...)
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
		return nil, fmt.Errorf("failed to get contributions: %w", err)
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

	colors, err := c.GetLanguagesWithColors(username)
	if err != nil {
		colors = make(map[string]string)
	}

	var stats []LanguageStats
	for name, count := range langCount {
		color := colors[name]
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

func calculateStreak(contributions []ContributionWeek, total int) StreakStats {
	var allDays []ContributionDay
	for _, w := range contributions {
		allDays = append(allDays, w.Days...)
	}

	currentStreak := 0
	longestStreak := 0
	tempStreak := 0

	today := time.Now().Format("2006-01-02")

	sort.Slice(allDays, func(i, j int) bool {
		return allDays[i].Date > allDays[j].Date
	})

	for _, day := range allDays {
		if day.Count > 0 {
			tempStreak++
			if day.Date == today || currentStreak > 0 {
				currentStreak = tempStreak
			}
		} else {
			if tempStreak > longestStreak {
				longestStreak = tempStreak
			}
			tempStreak = 0
			if day.Date < today {
				currentStreak = max(currentStreak, 0)
			}
		}
	}

	if tempStreak > longestStreak {
		longestStreak = tempStreak
	}

	return StreakStats{
		CurrentStreak:      currentStreak,
		LongestStreak:      longestStreak,
		TotalContributions: total,
	}
}
