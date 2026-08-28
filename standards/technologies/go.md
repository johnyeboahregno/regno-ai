# Go

> Technology standard for "Go Developer" agents. Sources: official Go docs, Effective Go,
> Uber Go style guide.

## Language

- `gofmt` + `goimports` on save; `go vet` in CI
- Short names; exported = documented comment
- Errors as values: `if err != nil { return ... }`, wrap with `%w`
- Avoid global state; inject dependencies

## Structure

- Standard layout: `cmd/`, `internal/`, `pkg/`
- Interfaces at the consumer, not the producer

## Testing

- Unit: `testing` + table-driven tests
- Integration: `testcontainers-go` for real DBs
- `go test ./... -race` in CI; coverage ≥ 80%

## Performance

- Profile with `pprof`; benchmark with `testing.B`
- Be deliberate about goroutines: use `context`, `errgroup`, no leaks
- Watch allocations on hot paths

## CI/CD

- `go build`, `go vet`, `go test -race`, `golangci-lint`
- Static binaries; multi-stage Docker builds

## Key libraries (defaults)

- Chi or net/http for APIs; pgx for Postgres
- slog for logging; cobra for CLIs
