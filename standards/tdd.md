# TDD Best Practices

> Non-negotiable base. Source: Kent Beck's Test-Driven Development, widely-adopted consensus.

## The loop

**Red → Green → Refactor.** Write a failing test, make it pass with the simplest code, then
refactor with the test as the safety net.

## Rules

1. Never write production code before a failing test.
2. One assertion per test (or one behaviour per test).
3. Smallest step that turns the test green.
4. Refactor only on green.
5. Tests must be fast (< 100ms each; slow tests belong in integration).

## Naming

- `describe("<unit>")` / `it("should <behaviour>")`
- Test names describe behaviour, not implementation.

## What to test

- Pure logic, edge cases, and boundaries
- Not: framework internals, getters/setters, third-party code

## Anti-patterns

- Writing tests after the fact (test-first only)
- Tests that depend on order or shared mutable state
- Skipping refactoring ("it works, don't touch it")
