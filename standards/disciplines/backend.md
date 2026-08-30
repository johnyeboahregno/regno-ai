# Backend / APIs

> Discipline standard for "Backend Developer" agents. Sources: 12-factor app, REST/gRPC best practices.

## Design

- 12-factor principles; stateless services; config via env
- REST or gRPC consistently; versioned APIs; idempotent writes
- Explicit error model: stable codes, machine-readable bodies, no stack traces to clients

## Structure

- Domain/feature layering: routes → services → repositories
- Dependency injection; interfaces at boundaries
- Migrations as code; never mutate prod schema by hand

## Resilience

- Timeouts, retries with backoff, circuit breakers, rate limits
- Graceful shutdown; health + readiness endpoints
- Observability: structured logs, metrics, traces (correlation ids)

## Security

- AuthN/AuthZ at the edge; least privilege; validate all input
- Secrets in a vault, never in code or logs
- Parameterised queries / ORM; no mass assignment

## Testing

- Unit services; integration against real DBs (testcontainers); contract tests
- Load-test the critical paths
