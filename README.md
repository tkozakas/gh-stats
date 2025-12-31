# me-site

Personal GitHub stats dashboard with live updates and semantic commit search.

## Features

- Profile, contributions graph, streak stats
- Top repositories with language filtering
- Semantic commit search
- Auto-updates via GitHub webhooks

## Run

```bash
export GITHUB_TOKEN=xxx

# Development (build from source)
docker compose --profile dev up --build

# Production (pre-built images, auto-updates)
docker login ghcr.io -u tkozakas
docker compose --profile prod up -d
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8080
