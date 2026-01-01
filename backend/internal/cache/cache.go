package cache

import (
	"sync"
	"time"

	"gh-stats/backend/internal/github"
)

type Store struct {
	mu      sync.RWMutex
	stats   *github.Stats
	commits []github.Commit
}

func New() *Store {
	return &Store{}
}

func (s *Store) GetStats() *github.Stats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.stats
}

func (s *Store) SetStats(stats *github.Stats) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stats = stats
}

func (s *Store) GetCommits() []github.Commit {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.commits
}

func (s *Store) SetCommits(commits []github.Commit) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commits = commits
}

func (s *Store) IsStale(maxAge time.Duration) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.stats == nil {
		return true
	}

	return time.Since(s.stats.UpdatedAt) > maxAge
}
