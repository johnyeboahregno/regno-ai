# Engineering Documentation — Index

> Every change in this system has a dedicated `.md` file explaining **what**, **why**, **how**, and
> **exactly how to reproduce it**. This is the documentation standard for the whole project.

## The template (use for every new change)

```markdown
# <Feature name>

> Status: stable | in-progress | scaffold · Last updated: YYYY-MM-DD

## What it is
(one or two sentences)

## Why
(the problem it solves)

## How it works
(the mechanism, data flow, key files)

## Files involved
- `path/to/file` — role

## Reproduce / verify
\`\`\`bash
# exact, copy-pasteable commands
\`\`\`
```

## Index

| # | Doc | Topic |
|---|---|---|
| 01 | [`01-architecture.md`](./01-architecture.md) | Monorepo, packages, services |
| 02 | [`02-data-layer.md`](./02-data-layer.md) | Mongo/Qdrant/Neo4j/Redis + three-store sync |
| 03 | [`03-cortex-brain.md`](./03-cortex-brain.md) | Knowledge ingestion, patterns, memories |
| 04 | [`04-cortex-flow-engine.md`](./04-cortex-flow-engine.md) | Agent routing, plan, tools, refine loop |
| 05 | [`05-auth-and-session.md`](./05-auth-and-session.md) | Register/login, JWT sessions |
| 06 | [`06-ui-and-design-system.md`](./06-ui-and-design-system.md) | Design tokens, pages, logo |
| 07 | [`07-cli.md`](./07-cli.md) | The `regno` CLI |
| 08 | [`08-credentials-vault.md`](./08-credentials-vault.md) | AES-256-GCM credential vault |
| 09 | [`09-email-notifications.md`](./09-email-notifications.md) | SMTP + BullMQ notifications |
| 10 | [`10-deployment-k3s.md`](./10-deployment-k3s.md) | k3s migration + deploy |
| 11 | [`11-chat-architect.md`](./11-chat-architect.md) | Chat ("talk to the architect") |
| 12 | [`12-memory-and-patterns.md`](./12-memory-and-patterns.md) | Manual memory/pattern tools |
| 13 | [`13-sma-cloning-model.md`](./13-sma-cloning-model.md) | Base standards + flavour + personas |
| 14 | [`14-rebuild-from-scratch.md`](./14-rebuild-from-scratch.md) | The master reproducibility runbook |
| 15 | [`15-per-developer-cloning.md`](./15-per-developer-cloning.md) | Clone a namespace per developer |
| 16 | [`16-documentation-pipeline.md`](./16-documentation-pipeline.md) | Auto-document every artifact |
| 17 | [`17-agent-wizard-spawner.md`](./17-agent-wizard-spawner.md) | Create agents + spawn namespaces |
| 18 | [`18-architect-brain-model.md`](./18-architect-brain-model.md) | Architect = full stack + own brain + base knowledge |
| 19 | [`19-cicd.md`](./19-cicd.md) | GitHub Actions → k3s deploy + validation |

## Golden rule

**Documentation is the point.** Every change: add/update its `.md`, then `git commit`.
