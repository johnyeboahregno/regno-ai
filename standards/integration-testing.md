# Integration Testing Best Practices

> Non-negotiable base. Verify the seams between modules and external systems.

## What it is

Tests that exercise multiple units together — databases, APIs, queues, file systems — against
real or containerised dependencies (not mocks).

## Rules

1. Use **Testcontainers** (or docker compose) for real DBs/queues — not in-memory substitutes.
2. One integration test per critical path (auth, data write/read, queue consume).
3. Clean state per test: transactional rollback or truncate between tests.
4. Timeouts on every external call; never wait on wall-clock sleeps — poll with a deadline.
5. Fail fast with actionable messages (include request + response).

## Coverage

- Every API endpoint: happy path + auth failure + validation failure
- Every DB migration: up and down
- Every queue consumer: poison-message handling

## Anti-patterns

- Mocking the thing you're integrating with
- Tests that pass locally but fail in CI (environment drift)
