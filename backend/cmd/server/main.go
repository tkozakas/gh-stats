package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"gh-stats/backend/internal/api"
	"gh-stats/backend/internal/cache"
	"gh-stats/backend/internal/github"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURL := os.Getenv("GITHUB_REDIRECT_URL")
	frontendURL := os.Getenv("FRONTEND_URL")
	githubToken := os.Getenv("GITHUB_TOKEN")

	if redirectURL == "" {
		redirectURL = "http://localhost:8080/api/auth/callback"
	}
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	store := cache.New()

	var oauth *github.OAuthConfig
	if clientID != "" && clientSecret != "" {
		oauth = &github.OAuthConfig{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"read:user", "repo"},
		}
		log.Println("OAuth enabled")
	} else {
		log.Println("OAuth disabled (no GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET)")
	}

	if githubToken != "" {
		log.Println("GitHub token configured for public requests (5000 req/hour)")
	} else {
		log.Println("Warning: No GITHUB_TOKEN set, public requests limited to 60 req/hour")
	}

	handler := api.NewHandler(store, oauth, frontendURL, githubToken)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/api/auth/login", handler.Login)
	r.Get("/api/auth/callback", handler.Callback)
	r.Post("/api/auth/logout", handler.Logout)
	r.Get("/api/auth/me", handler.Me)

	r.Get("/api/users/search", handler.SearchUsers)
	r.Get("/api/users/{username}/stats", handler.GetUserStats)
	r.Get("/api/users/{username}/repositories", handler.GetUserRepositories)
	r.Get("/api/users/{username}/repos/{repo}", handler.GetUserRepoStats)
	r.Get("/api/users/{username}/fun", handler.GetUserFunStats)
	r.Get("/api/users/{username}/followers", handler.GetUserFollowers)
	r.Get("/api/users/{username}/following", handler.GetUserFollowing)

	r.Get("/api/rankings/country/{country}", handler.GetCountryRanking)
	r.Get("/api/rankings/user/{username}", handler.GetUserRanking)

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
	allowedOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(allowedOrigins) == 0 || allowedOrigins[0] == "" {
		allowedOrigins = []string{"http://localhost:3000"}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowed := range allowedOrigins {
			if origin == strings.TrimSpace(allowed) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
