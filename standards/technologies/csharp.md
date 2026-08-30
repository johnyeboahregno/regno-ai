# C# / .NET

> Technology standard for ".NET Developer" agents. Sources: .NET design guidelines, Microsoft docs.

## Language

- Modern C# (12); records, pattern matching, nullable reference types enabled
- `async`/`await` all the way; avoid sync-over-async
- dotnet format + analyzers as errors

## Structure

- Solution per concern; layered by feature (API → Application → Domain)
- Constructor injection; interfaces at boundaries

## Testing

- xUnit/NUnit + FluentAssertions; Moq/NSubstitute at boundaries
- Testcontainers for real services; coverage ≥ 80%

## Performance

- `Span`/`Memory` for hot paths; benchmark (BenchmarkDotNet) before optimising
- Pooled Db connections; minimal allocations in services

## CI/CD

- `dotnet build/test/publish`; self-contained or slim SDK images; analyzers in CI
