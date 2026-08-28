# Testing Strategy

> Non-negotiable base. Every build ships with tests, or it is not done.

## Required layers

- **Unit tests** — every pure function/service module
- **Integration tests** — API endpoints and data-layer paths
- **End-to-end (optional but preferred)** — critical user flows

## Coverage

- Minimum line coverage: **80%** on new code (edit to your threshold)
- Coverage must not decrease in a PR

## Practices

- Red → green → refactor (TDD) for new logic
- Deterministic tests: no flaky waits, no external calls in unit tests
- Mock at the boundary, not the internals

## CI gate

- Tests run on every push; failing tests block merge

*(Replace with your organisation's real testing rules.)*
