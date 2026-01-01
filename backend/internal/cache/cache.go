package cache

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"gh-stats/backend/internal/github"
)

const (
	StatsCacheTTL = 10 * time.Minute
)

type UserData struct {
	Stats     *github.Stats
	Commits   []github.Commit
	UpdatedAt time.Time
}

type Store struct {
	mu       sync.RWMutex
	users    map[string]*UserData
	sessions map[string]*github.Session
	states   map[string]time.Time
}

func New() *Store {
	store := &Store{
		users:    make(map[string]*UserData),
		sessions: make(map[string]*github.Session),
		states:   make(map[string]time.Time),
	}
	go store.cleanupExpired()
	return store
}

func (s *Store) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for id, session := range s.sessions {
			if now.After(session.ExpiresAt) {
				delete(s.sessions, id)
			}
		}
		for state, created := range s.states {
			if now.Sub(created) > 10*time.Minute {
				delete(s.states, state)
			}
		}
		for key, data := range s.users {
			if now.Sub(data.UpdatedAt) > StatsCacheTTL {
				delete(s.users, key)
			}
		}
		s.mu.Unlock()
	}
}

func (s *Store) GetUserData(username string) *UserData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.users[username]
}

func (s *Store) GetStats(username string) *github.Stats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.users[username]; ok {
		if time.Since(data.UpdatedAt) <= StatsCacheTTL {
			return data.Stats
		}
	}
	return nil
}

func (s *Store) SetStats(username string, stats *github.Stats) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.users[username] == nil {
		s.users[username] = &UserData{}
	}
	s.users[username].Stats = stats
	s.users[username].UpdatedAt = time.Now()
}

func (s *Store) GetCommits(username string) []github.Commit {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.users[username]; ok {
		if time.Since(data.UpdatedAt) <= StatsCacheTTL {
			return data.Commits
		}
	}
	return nil
}

func (s *Store) SetCommits(username string, commits []github.Commit) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.users[username] == nil {
		s.users[username] = &UserData{UpdatedAt: time.Now()}
	}
	s.users[username].Commits = commits
}

func (s *Store) IsStale(username string, maxAge time.Duration) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, ok := s.users[username]
	if !ok || data.Stats == nil {
		return true
	}

	return time.Since(data.UpdatedAt) > maxAge
}

func (s *Store) CreateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	state := hex.EncodeToString(b)
	s.mu.Lock()
	s.states[state] = time.Now()
	s.mu.Unlock()
	return state
}

func (s *Store) ValidateState(state string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.states[state]; ok {
		delete(s.states, state)
		return true
	}
	return false
}

func (s *Store) CreateSession(username, accessToken, avatarURL string) *github.Session {
	b := make([]byte, 32)
	rand.Read(b)
	session := &github.Session{
		ID:          hex.EncodeToString(b),
		Username:    username,
		AccessToken: accessToken,
		AvatarURL:   avatarURL,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(24 * time.Hour),
	}
	s.mu.Lock()
	s.sessions[session.ID] = session
	s.mu.Unlock()
	return session
}

func (s *Store) GetSession(id string) *github.Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[id]
	if !ok || time.Now().After(session.ExpiresAt) {
		return nil
	}
	return session
}

func (s *Store) DeleteSession(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}
