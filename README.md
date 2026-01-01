# gh-stats

GitHub stats dashboard. [ghstats.fun](https://ghstats.fun)

## Run

```bash
docker compose --profile dev up --build
```

For login functionality, create OAuth App at https://github.com/settings/developers and add to `.env`:

```bash
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```
