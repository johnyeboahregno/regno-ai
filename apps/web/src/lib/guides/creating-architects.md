# Creating Architects (provisioning)

The **Architects** page (`/app/architects`) is the Mothership control plane. From it you
provision a full Regno Architect for each developer: a complete stack deployed over SSH onto
its own machine, with its name registered as a subdomain.

## Model

```mermaid
flowchart LR
  U[You] --> W[Architects page\nwizard]
  W --> A[API + encrypted vault]
  A --> Q[BullMQ provision queue]
  Q --> E[Execution worker]
  E -->|SSH| T[Target machine\nfresh Architect]
  E -->|DNS| C[Cloudflare\nslug.regno.ai]
```

- **Mothership** — this app, running a lightweight profile (web + execution + mongo + redis).
- **Architect** — the full stack (Neo4j, Mongo, Qdrant, Redis, web, execution, realtime, Caddy)
  on its own machine (8 GB+ RAM recommended for Neo4j's 4 GB heap).

## Authentication

The page uses the **same SSO as `sysadmin.regnocloud.com`** — Regno Identity
(`identity.regnocloud.com`). An unauthenticated visitor is redirected there, and only users
with an admin/sysadmin role can open the wizard. The first SSO user is granted the owner role.

## Wizard steps

1. **Developer** — full name, architect name (slug), email, GitHub username. The slug becomes
   `slug.regno.ai` (lowercase, digits, hyphens — no spaces).
2. **Target machine** — host/IP, SSH user/port, deploy mode, **wipe-before-deploy** toggle,
   and SSH credentials (private key or password).
3. **AI provider keys** — OpenAI, Anthropic, Google AI, DeepSeek (all optional).
4. **Email / SMTP** — prefilled with the standard Regno defaults.
5. **Databases & security** — Neo4j/Mongo passwords and JWT secret (⚡ auto-generates), GitHub
   org + token (with a **Test** button), Docker Hub credentials.
6. **Review & launch** — masked summary, then Save & launch.

Secrets are stored AES-256-GCM encrypted as one vault entry per architect
(`architect:<slug>:env`) — never written plaintext.

## Wipe & redeploy

Tick **"Wipe existing deployment before build"** to `docker compose down -v` on the target
before rebuilding. Use this to repurpose an existing box (e.g. `213.32.7.227`) as a fresh
Architect under a new name.

## Name rules

- Lowercase `a–z`, digits `0–9`, hyphens `-` — no spaces.
- Reserved names are rejected (`www`, `api`, `admin`, `cortex`, …).

## After launch

The list shows each Architect's status (`draft → provisioning → healthy/error`). A failed
provision surfaces its error inline; fix it and press **Launch** again.
