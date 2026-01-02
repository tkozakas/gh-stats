# GitHub Stats

GitHub analytics dashboard. [ghstats.fun](https://ghstats.fun)

![Preview](./demo.png)

## Setup

Create `.env` with GitHub credentials:

```bash
GITHUB_TOKEN=xxx              # Personal access token from https://github.com/settings/tokens
GITHUB_CLIENT_ID=xxx          # OAuth app from https://github.com/settings/developers
GITHUB_CLIENT_SECRET=xxx
```

## Run

```bash
docker compose --profile dev up   # development
docker compose --profile prod up  # production
```
