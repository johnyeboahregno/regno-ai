# Elixir

> Technology standard for "Elixir Developer" agents. Sources: Elixir style guide, Phoenix docs.

## Language

- Pattern matching; pipe operator for pipelines; no `if` nesting
- Immutable data; processes + message passing over shared state
- `mix format` + Credo (strict)

## Structure

- Mix + umbrella for large apps; contexts (Phoenix) for boundaries
- GenServers supervised; crash-and-restart philosophy

## Testing

- ExUnit; property-based (StreamData); async tests default
- Mox for boundaries; integration against real DBs

## Concurrency

- OTP: Supervisors, Tasks, GenStage/Flow for backpressure
- Let it crash; supervision trees for fault tolerance

## CI/CD

- `mix format --check-formatted`, `mix credo`, `mix test`; slim Elixir releases
