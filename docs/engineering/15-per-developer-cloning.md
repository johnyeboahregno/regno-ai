# Per-Developer Cloning — retired

> Last updated: 2026-09-02

The former `clone-developer.sh` workflow created a full k3s namespace per developer. That
workflow and its Kubernetes assets have been removed.

## Current path

Create each developer's Architect through **Mothership → Architects → New Architect**.
The Mothership stores the blueprint and encrypted secrets, then its provision worker deploys
the full Docker Compose stack to the selected target machine.

See `docs/engineering/30-mothership-deploy.md` and `docs/engineering/31-architect-telemetry.md`.
