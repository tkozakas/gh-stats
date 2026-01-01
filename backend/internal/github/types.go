package github

import "time"

type Profile struct {
	Login       string `json:"login"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatar_url"`
	Bio         string `json:"bio"`
	Location    string `json:"location"`
	Company     string `json:"company"`
	Blog        string `json:"blog"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
	PublicRepos int    `json:"public_repos"`
	CreatedAt   string `json:"created_at"`
}

type Repository struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	URL         string `json:"html_url"`
	Stars       int    `json:"stargazers_count"`
	Forks       int    `json:"forks_count"`
	Language    string `json:"language"`
	UpdatedAt   string `json:"updated_at"`
	Fork        bool   `json:"fork"`
	Archived    bool   `json:"archived"`
	Private     bool   `json:"private"`
}

type Commit struct {
	SHA     string    `json:"sha"`
	Message string    `json:"message"`
	Author  string    `json:"author"`
	Email   string    `json:"email"`
	Date    time.Time `json:"date"`
	URL     string    `json:"url"`
	Repo    string    `json:"repo"`
}

type ContributionDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
	Level int    `json:"level"`
}

type ContributionWeek struct {
	Days []ContributionDay `json:"days"`
}

type LanguageStats struct {
	Name       string `json:"name"`
	Percentage int    `json:"percentage"`
	Color      string `json:"color"`
}

type StreakStats struct {
	CurrentStreak      int `json:"currentStreak"`
	LongestStreak      int `json:"longestStreak"`
	TotalContributions int `json:"totalContributions"`
}

type Stats struct {
	Profile       Profile            `json:"profile"`
	Repositories  []Repository       `json:"repositories"`
	Contributions []ContributionWeek `json:"contributions"`
	Languages     []LanguageStats    `json:"languages"`
	Streak        StreakStats        `json:"streak"`
	UpdatedAt     time.Time          `json:"updatedAt"`
}

type RepoStats struct {
	Repository    Repository     `json:"repository"`
	Commits       []Commit       `json:"commits"`
	TotalCommits  int            `json:"totalCommits"`
	FirstCommit   time.Time      `json:"firstCommit"`
	LastCommit    time.Time      `json:"lastCommit"`
	CommitsByDay  map[string]int `json:"commitsByDay"`
	CommitsByHour map[int]int    `json:"commitsByHour"`
}

type FunStats struct {
	MostProductiveHour    int            `json:"mostProductiveHour"`
	MostProductiveDay     string         `json:"mostProductiveDay"`
	CommitsByHour         map[int]int    `json:"commitsByHour"`
	CommitsByDayOfWeek    map[string]int `json:"commitsByDayOfWeek"`
	CommitsByMonth        map[string]int `json:"commitsByMonth"`
	AverageCommitsPerDay  float64        `json:"averageCommitsPerDay"`
	LongestCodingStreak   int            `json:"longestCodingStreak"`
	TotalCommits          int            `json:"totalCommits"`
	TotalRepositories     int            `json:"totalRepositories"`
	MostActiveRepo        string         `json:"mostActiveRepo"`
	MostActiveRepoCommits int            `json:"mostActiveRepoCommits"`
	WeekendWarriorPercent float64        `json:"weekendWarriorPercent"`
	NightOwlPercent       float64        `json:"nightOwlPercent"`
	EarlyBirdPercent      float64        `json:"earlyBirdPercent"`
}

type UserSearchResult struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	Type      string `json:"type"`
}

type Session struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	AccessToken string    `json:"-"`
	AvatarURL   string    `json:"avatar_url"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

type OAuthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

// CountryUser represents a user entry from the top-github-users cache
type CountryUser struct {
	Login                string `json:"login"`
	Name                 string `json:"name"`
	AvatarURL            string `json:"avatarUrl"`
	Location             string `json:"location"`
	Followers            int    `json:"followers"`
	PublicContributions  int    `json:"publicContributions"`
	PrivateContributions int    `json:"privateContributions"`
}

// CountryRanking holds all users for a specific country
type CountryRanking struct {
	Country   string        `json:"country"`
	Users     []CountryUser `json:"users"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

// UserRanking represents a user's ranking within their country and globally
type UserRanking struct {
	Username             string `json:"username"`
	Country              string `json:"country"`
	CountryRank          int    `json:"countryRank"`
	CountryTotal         int    `json:"countryTotal"`
	PublicContributions  int    `json:"publicContributions"`
	PrivateContributions int    `json:"privateContributions"`
	Followers            int    `json:"followers"`
}
