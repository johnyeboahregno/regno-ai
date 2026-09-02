# Agent Wizard & Spawner — retired

> Status: retired · Last updated: 2026-09-02

The former namespace spawner created k3s environments from the `/app/agents` surface. It has
been removed. `/app/agents` now manages Subject Matter Expert profiles, not infrastructure.

## Current path

Architect infrastructure is created only through **Mothership → Architects → New Architect**.
The Mothership provision worker deploys the target over SSH and updates its status through
telemetry. See `docs/engineering/30-mothership-deploy.md`.
