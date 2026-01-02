package github

import (
	"testing"
	"time"
)

func TestLevelToNumber_ValidLevels(t *testing.T) {
	tests := []struct {
		level    string
		expected int
	}{
		{"NONE", 0},
		{"FIRST_QUARTILE", 1},
		{"SECOND_QUARTILE", 2},
		{"THIRD_QUARTILE", 3},
		{"FOURTH_QUARTILE", 4},
	}

	for _, tt := range tests {
		t.Run(tt.level, func(t *testing.T) {
			got := levelToNumber(tt.level)
			if got != tt.expected {
				t.Errorf("levelToNumber(%q) = %d, want %d", tt.level, got, tt.expected)
			}
		})
	}
}

func TestLevelToNumber_UnknownLevel(t *testing.T) {
	got := levelToNumber("UNKNOWN")
	if got != 0 {
		t.Errorf("levelToNumber(UNKNOWN) = %d, want 0", got)
	}
}

func TestCalculateStreak_EmptyContributions(t *testing.T) {
	contributions := []ContributionWeek{}
	streak := calculateStreak(contributions, 0)

	if streak.CurrentStreak != 0 {
		t.Errorf("expected current streak 0, got %d", streak.CurrentStreak)
	}
	if streak.LongestStreak != 0 {
		t.Errorf("expected longest streak 0, got %d", streak.LongestStreak)
	}
	if streak.TotalContributions != 0 {
		t.Errorf("expected total 0, got %d", streak.TotalContributions)
	}
}

func TestCalculateStreak_SingleDayContribution(t *testing.T) {
	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: "2025-01-01", Count: 5, Level: 2},
		}},
	}
	streak := calculateStreak(contributions, 5)

	if streak.TotalContributions != 5 {
		t.Errorf("expected total 5, got %d", streak.TotalContributions)
	}
}

func TestCalculateStreak_ConsecutiveDays(t *testing.T) {
	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: "2025-01-01", Count: 1, Level: 1},
			{Date: "2025-01-02", Count: 2, Level: 1},
			{Date: "2025-01-03", Count: 3, Level: 2},
			{Date: "2025-01-04", Count: 0, Level: 0},
			{Date: "2025-01-05", Count: 1, Level: 1},
		}},
	}
	streak := calculateStreak(contributions, 7)

	if streak.LongestStreak != 3 {
		t.Errorf("expected longest streak 3, got %d", streak.LongestStreak)
	}
}

func TestCalculateStreak_CurrentStreakFromToday(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	twoDaysAgo := time.Now().AddDate(0, 0, -2).Format("2006-01-02")

	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: twoDaysAgo, Count: 1, Level: 1},
			{Date: yesterday, Count: 2, Level: 1},
			{Date: today, Count: 3, Level: 2},
		}},
	}
	streak := calculateStreak(contributions, 6)

	if streak.CurrentStreak != 3 {
		t.Errorf("expected current streak 3, got %d", streak.CurrentStreak)
	}
}

func TestCalculateStreak_CurrentStreakFromYesterday(t *testing.T) {
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	twoDaysAgo := time.Now().AddDate(0, 0, -2).Format("2006-01-02")
	threeDaysAgo := time.Now().AddDate(0, 0, -3).Format("2006-01-02")

	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: threeDaysAgo, Count: 1, Level: 1},
			{Date: twoDaysAgo, Count: 2, Level: 1},
			{Date: yesterday, Count: 3, Level: 2},
		}},
	}
	streak := calculateStreak(contributions, 6)

	// Current streak should still count if yesterday had contributions
	if streak.CurrentStreak != 3 {
		t.Errorf("expected current streak 3 (from yesterday), got %d", streak.CurrentStreak)
	}
}

func TestCalculateStreak_NoCurrentStreakWhenGap(t *testing.T) {
	threeDaysAgo := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
	fourDaysAgo := time.Now().AddDate(0, 0, -4).Format("2006-01-02")
	fiveDaysAgo := time.Now().AddDate(0, 0, -5).Format("2006-01-02")

	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: fiveDaysAgo, Count: 1, Level: 1},
			{Date: fourDaysAgo, Count: 2, Level: 1},
			{Date: threeDaysAgo, Count: 3, Level: 2},
		}},
	}
	streak := calculateStreak(contributions, 6)

	// No contributions today or yesterday, so current streak should be 0
	if streak.CurrentStreak != 0 {
		t.Errorf("expected current streak 0 (gap of 2+ days), got %d", streak.CurrentStreak)
	}
	if streak.LongestStreak != 3 {
		t.Errorf("expected longest streak 3, got %d", streak.LongestStreak)
	}
}

func TestCalculateStreak_LongestStreakInPast(t *testing.T) {
	today := time.Now().Format("2006-01-02")

	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: "2024-06-01", Count: 1, Level: 1},
			{Date: "2024-06-02", Count: 1, Level: 1},
			{Date: "2024-06-03", Count: 1, Level: 1},
			{Date: "2024-06-04", Count: 1, Level: 1},
			{Date: "2024-06-05", Count: 1, Level: 1},
			{Date: "2024-06-06", Count: 0, Level: 0},
			{Date: today, Count: 1, Level: 1},
		}},
	}
	streak := calculateStreak(contributions, 6)

	if streak.CurrentStreak != 1 {
		t.Errorf("expected current streak 1, got %d", streak.CurrentStreak)
	}
	if streak.LongestStreak != 5 {
		t.Errorf("expected longest streak 5, got %d", streak.LongestStreak)
	}
}

func TestCalculateStreak_PreservesTotalContributions(t *testing.T) {
	contributions := []ContributionWeek{
		{Days: []ContributionDay{
			{Date: "2025-01-01", Count: 10, Level: 4},
		}},
	}
	total := 100

	streak := calculateStreak(contributions, total)

	if streak.TotalContributions != total {
		t.Errorf("expected total %d, got %d", total, streak.TotalContributions)
	}
}

func TestNewClient_ReturnsClientWithToken(t *testing.T) {
	token := "ghp_testtoken"
	client := NewClient(token)

	if client == nil {
		t.Fatal("expected client to be non-nil")
	}
	if client.token != token {
		t.Errorf("expected token %q, got %q", token, client.token)
	}
	if client.http == nil {
		t.Error("expected http client to be non-nil")
	}
}

func TestNewPublicClient_ReturnsClientWithoutToken(t *testing.T) {
	client := NewPublicClient()

	if client == nil {
		t.Fatal("expected client to be non-nil")
	}
	if client.token != "" {
		t.Errorf("expected empty token, got %q", client.token)
	}
}

func TestClient_WithToken_ReturnsNewClientWithToken(t *testing.T) {
	original := NewPublicClient()
	newToken := "ghp_newtoken"

	newClient := original.WithToken(newToken)

	if newClient.token != newToken {
		t.Errorf("expected token %q, got %q", newToken, newClient.token)
	}
	if original.token != "" {
		t.Error("original client should not be modified")
	}
}
