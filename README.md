# gh-stats

Personal GitHub stats dashboard.

## Features

- Profile, contributions graph, streak stats
- Top repositories with language filtering
- Commit search

## Run

```bash
# Get token: https://github.com/settings/tokens (read:user scope)
export GITHUB_TOKEN=xxx

# Development
docker compose --profile dev up --build

# Production
export DOMAIN=example.com
docker compose --profile prod up -d
```

Frontend: http://localhost:3000
Backend: http://localhost:8080
