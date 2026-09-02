# Architect Brain Model

> Updated: 2026-09-02

Each provisioned Architect runs its own full Docker Compose stack and keeps its own MongoDB,
Redis, Qdrant, and Neo4j state. The Mothership owns the blueprint, encrypted deployment
secrets, provisioning queue, and telemetry registry; it does not become the Architect's brain.

## Provisioning

Use **Mothership → Architects → New Architect**. The provision worker writes `.env.prod` to
the target, runs `deploy.sh`, and registers the target's Cloudflare DNS record.

## Learning and serving

Recall & Serve and SMA focus tags remain part of the Architect application. The Mothership
only provisions and monitors those independent Architect stacks.
