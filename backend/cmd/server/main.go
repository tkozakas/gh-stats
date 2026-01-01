package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"gh-stats/backend/internal/api"
	"gh-stats/backend/internal/cache"
	"gh-stats/backend/internal/github"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	token := os.Getenv("GITHUB_TOKEN")
	if token == "" {
		log.Fatal("GITHUB_TOKEN environment variable required")
	}

	username := os.Getenv("GITHUB_USERNAME")
	if username == "" {
		username = "tkozakas"
	}

	webhookSecret := os.Getenv("WEBHOOK_SECRET")

	gh := github.NewClient(token, username)
	store := cache.New()
	handler := api.NewHandler(gh, store, webhookSecret)

	if err := handler.RefreshStats(); err != nil {
		log.Printf("Warning: initial stats fetch failed: %v", err)
	}

	go scheduleDailyRefresh(handler)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/api/stats", handler.GetStats)
	r.Get("/api/repositories", handler.GetRepositories)
	r.Get("/api/repo", handler.GetRepoStats)
	r.Get("/api/fun", handler.GetFunStats)
	r.Post("/api/webhook/github", handler.Webhook)
	r.Get("/health", handler.Health)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func scheduleDailyRefresh(handler *api.Handler) {
	ticker := time.NewTicker(24 * time.Hour)
	for range ticker.C {
		log.Println("Running scheduled daily refresh...")
		if err := handler.RefreshStats(); err != nil {
			log.Printf("Scheduled refresh failed: %v", err)
		}
	}
}
