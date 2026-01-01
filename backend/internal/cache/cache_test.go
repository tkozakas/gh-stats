package cache

import (
	"testing"
	"time"

	"gh-stats/backend/internal/github"
)

func TestNew_ReturnsInitializedStore(t *testing.T) {
	store := New()

	if store == nil {
		t.Fatal("expected store to be non-nil")
	}
	if store.users == nil {
		t.Error("expected users map to be initialized")
	}
	if store.sessions == nil {
		t.Error("expected sessions map to be initialized")
	}
	if store.states == nil {
		t.Error("expected states map to be initialized")
	}
}

func TestStore_SetAndGetStats(t *testing.T) {
	store := New()
	username := "testuser"
	stats := &github.Stats{
		Profile: github.Profile{Login: username},
	}

	store.SetStats(username, stats)
	got := store.GetStats(username)

	if got == nil {
		t.Fatal("expected stats to be non-nil")
	}
	if got.Profile.Login != username {
		t.Errorf("expected login %q, got %q", username, got.Profile.Login)
	}
}

func TestStore_GetStats_ReturnsNilForUnknownUser(t *testing.T) {
	store := New()

	got := store.GetStats("unknownuser")

	if got != nil {
		t.Error("expected nil for unknown user")
	}
}

func TestStore_SetAndGetCommits(t *testing.T) {
	store := New()
	username := "testuser"
	commits := []github.Commit{
		{SHA: "abc123", Message: "test commit"},
		{SHA: "def456", Message: "another commit"},
	}

	store.SetCommits(username, commits)
	got := store.GetCommits(username)

	if len(got) != 2 {
		t.Errorf("expected 2 commits, got %d", len(got))
	}
	if got[0].SHA != "abc123" {
		t.Errorf("expected SHA %q, got %q", "abc123", got[0].SHA)
	}
}

func TestStore_GetCommits_ReturnsNilForUnknownUser(t *testing.T) {
	store := New()

	got := store.GetCommits("unknownuser")

	if got != nil {
		t.Error("expected nil for unknown user")
	}
}

func TestStore_IsStale_ReturnsTrueForUnknownUser(t *testing.T) {
	store := New()

	if !store.IsStale("unknownuser", time.Hour) {
		t.Error("expected stale for unknown user")
	}
}

func TestStore_IsStale_ReturnsTrueForNilStats(t *testing.T) {
	store := New()
	store.mu.Lock()
	store.users["testuser"] = &UserData{Stats: nil}
	store.mu.Unlock()

	if !store.IsStale("testuser", time.Hour) {
		t.Error("expected stale for nil stats")
	}
}

func TestStore_IsStale_ReturnsFalseForFreshData(t *testing.T) {
	store := New()
	store.SetStats("testuser", &github.Stats{})

	if store.IsStale("testuser", time.Hour) {
		t.Error("expected fresh data to not be stale")
	}
}

func TestStore_IsStale_ReturnsTrueForOldData(t *testing.T) {
	store := New()
	store.mu.Lock()
	store.users["testuser"] = &UserData{
		Stats:     &github.Stats{},
		UpdatedAt: time.Now().Add(-2 * time.Hour),
	}
	store.mu.Unlock()

	if !store.IsStale("testuser", time.Hour) {
		t.Error("expected old data to be stale")
	}
}

func TestStore_CreateAndValidateState(t *testing.T) {
	store := New()

	state := store.CreateState()

	if state == "" {
		t.Fatal("expected non-empty state")
	}
	if len(state) != 32 {
		t.Errorf("expected 32 character state, got %d", len(state))
	}

	if !store.ValidateState(state) {
		t.Error("expected state to be valid")
	}

	if store.ValidateState(state) {
		t.Error("expected state to be invalid after first validation")
	}
}

func TestStore_ValidateState_ReturnsFalseForUnknownState(t *testing.T) {
	store := New()

	if store.ValidateState("unknownstate") {
		t.Error("expected false for unknown state")
	}
}

func TestStore_CreateSession(t *testing.T) {
	store := New()
	username := "testuser"
	token := "ghp_testtoken"
	avatar := "https://example.com/avatar.png"

	session := store.CreateSession(username, token, avatar)

	if session == nil {
		t.Fatal("expected session to be non-nil")
	}
	if session.ID == "" {
		t.Error("expected non-empty session ID")
	}
	if session.Username != username {
		t.Errorf("expected username %q, got %q", username, session.Username)
	}
	if session.AccessToken != token {
		t.Errorf("expected token %q, got %q", token, session.AccessToken)
	}
	if session.AvatarURL != avatar {
		t.Errorf("expected avatar %q, got %q", avatar, session.AvatarURL)
	}
	if session.ExpiresAt.Before(time.Now()) {
		t.Error("expected session to expire in the future")
	}
}

func TestStore_GetSession_ReturnsValidSession(t *testing.T) {
	store := New()
	created := store.CreateSession("testuser", "token", "avatar")

	got := store.GetSession(created.ID)

	if got == nil {
		t.Fatal("expected session to be non-nil")
	}
	if got.Username != "testuser" {
		t.Errorf("expected username %q, got %q", "testuser", got.Username)
	}
}

func TestStore_GetSession_ReturnsNilForUnknownSession(t *testing.T) {
	store := New()

	got := store.GetSession("unknownsession")

	if got != nil {
		t.Error("expected nil for unknown session")
	}
}

func TestStore_GetSession_ReturnsNilForExpiredSession(t *testing.T) {
	store := New()
	session := store.CreateSession("testuser", "token", "avatar")

	store.mu.Lock()
	store.sessions[session.ID].ExpiresAt = time.Now().Add(-time.Hour)
	store.mu.Unlock()

	got := store.GetSession(session.ID)

	if got != nil {
		t.Error("expected nil for expired session")
	}
}

func TestStore_DeleteSession(t *testing.T) {
	store := New()
	session := store.CreateSession("testuser", "token", "avatar")

	store.DeleteSession(session.ID)
	got := store.GetSession(session.ID)

	if got != nil {
		t.Error("expected nil after deletion")
	}
}

func TestStore_GetUserData(t *testing.T) {
	store := New()
	store.SetStats("testuser", &github.Stats{})
	store.SetCommits("testuser", []github.Commit{{SHA: "abc"}})

	data := store.GetUserData("testuser")

	if data == nil {
		t.Fatal("expected user data to be non-nil")
	}
	if data.Stats == nil {
		t.Error("expected stats to be non-nil")
	}
	if len(data.Commits) != 1 {
		t.Errorf("expected 1 commit, got %d", len(data.Commits))
	}
}
