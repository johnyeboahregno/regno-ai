# Deployment (k3s) — retired

> Last updated: 2026-09-02

The former Kubernetes/k3s deployment has been removed. It was replaced by Docker Compose
for Architect targets and the dedicated Mothership control plane.

## Current path

- Deploy the Mothership with `docs/engineering/30-mothership-deploy.md`.
- Create Architect targets through **Mothership → Architects → New Architect**.
- The Mothership provision worker SSHs to the target and runs `deploy.sh`.

This file remains only as a marker for the retired deployment model. The old manifests and
scripts are intentionally no longer present.
