# gh-stats

GitHub stats dashboard. [ghstats.fun](https://ghstats.fun)

![Preview](demo.png)

## Setup

Create `.env` with GitHub OAuth credentials from https://github.com/settings/developers:

```bash
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

## Development

```bash
docker compose --profile dev up
```

## Production

```bash
docker compose --profile prod --profile tunnel up -d
```
