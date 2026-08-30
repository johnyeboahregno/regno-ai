# API Key Rotation (Anthropic / OpenAI / Google / DeepSeek)

> Status: stable · Last updated: 2026-08-30

## What it is

The canonical procedure for adding or rotating the AI provider API keys
(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `DEEPSEEK_API_KEY`)
on SYS-GAME-1 (`213.32.7.227`).

## The core rule

`.env.prod` **on the box** is the single source of truth for secrets. It is:

- never committed to git (it is gitignored),
- read once when app containers are **created** — editing the file alone does **not**
  change what already-running containers hold,
- read by the k3s deploy pipeline to rebuild the `regno-env` Secret on every deploy.

So every key change has exactly two steps: **1) update `.env.prod` on the box** and
**2) recreate/roll out the app so the new value is injected.** Step 2 can be done via
CI/CD — the pipeline needs no manual SSH for the redeploy.

## Where to get the keys

| Variable | Where to create/view |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `GOOGLE_AI_API_KEY` | https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api_keys |

Provider keys are shown **once** at creation — if lost, create a new key and revoke the old.
Anthropic keys start `sk-ant-api03-`, OpenAI `sk-proj-`/`sk-`, Google `AIza...`, DeepSeek `sk-`.

## Step 1 — update `.env.prod` on the box (the only manual step)

```bash
ssh ubuntu@213.32.7.227
nano ~/regno/.env.prod     # path is ~/regno or /opt/regno
chmod 600 ~/regno/.env.prod
```

Add/update the lines, e.g.:

```dotenv
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
```

## Step 2a — deploy via CI/CD (preferred)

From a local checkout:

```bash
cd regno-ai
git add -A && git commit -m "chore: rotate provider API keys"
git push origin master
```

The `Deploy (production)` workflow then: builds images → rebuilds the `regno-env`
Secret **from the updated `.env.prod`** → applies manifests → rolls out pods with a fresh
image tag (so pods restart and read the new Secret) → validates `/api/health` → rolls back
on failure.

**Gotcha — manual re-run without a new commit:** the deploy tags images
`sha-<GITHUB_SHA>`. Re-running the action with no new commit means an unchanged tag → the
Secret is recreated but the pods may not restart. Fix: push a trivial commit
(`git commit --allow-empty`) so the sha changes, or on the box:
`kubectl -n default rollout restart deployment/web deployment/execution`.

## Step 2b — deploy via Docker Compose (if the box runs compose)

```bash
ssh ubuntu@213.32.7.227
cd ~/regno
sudo docker compose --env-file .env.prod up -d --build web execution
```

`up -d` recreates the containers when the env-file changes. Only `web` and `execution`
consume API keys; `realtime` doesn't. Drop `--build` if the code didn't change.

## Step 3 — verify the keys are loaded

Compose:

```bash
sudo docker compose --env-file .env.prod exec web printenv | grep -E 'API_KEY'
sudo docker compose --env-file .env.prod exec execution printenv | grep -E 'API_KEY'
```

k3s:

```bash
sudo kubectl -n default get secret regno-env -o yaml        # values are base64
sudo kubectl -n default exec deploy/web -- env | grep API_KEY
```

## Step 4 — re-run skipped seeding (only if OPENAI was blank at first deploy)

`deploy.sh` runs `seed-brain` / `seed-history` only when `OPENAI_API_KEY` was present on
first boot. If it was blank then, re-seed now:

```bash
bash ~/regno/seed-brain.sh   # restarts web/execution, seeds docs corpus + repos + GitHub org
```

## Step 5 — smoke-test an LLM call

```bash
curl -s https://<DOMAIN>/api/health
curl -s -X POST https://<DOMAIN>/api/executions -H 'Content-Type: application/json' \
  -d '{"prompt":"Scaffold a small Node.js API for notes"}'
sudo docker compose logs -f execution     # or: kubectl -n default logs -f deploy/execution
```

## Files involved

- `~/regno/.env.prod` (on the box — never committed)
- `.env.example` (repo — empty template, safe to commit)
- `.env` (local dev only, gitignored)
- `scripts/k8s-deploy.sh` — builds `regno-env` Secret from `.env.prod`
- `migrate-k3s.sh` — manual Secret rebuild + apply (compose/k3s fallback)
- `seed-brain.sh` — re-seed after enabling keys
- `.github/workflows/deploy.yml` — the CI/CD path
- `docker-compose.yml` — env passthrough for the compose path

## Notes

- GitHub Actions secrets (`DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`) are for image push
  auth **only** — the pipeline never reads provider keys from GitHub; `.env.prod` on the
  box is the only secret source.
- Keep `.env.prod` at `chmod 600`; it is the only copy of the secrets.
- On key rotation, revoke the old key in the provider console *after* the new one is
  verified live (Steps 3–5), to avoid an outage window.
