# Zig

> Technology standard for "Zig Developer" agents. Sources: Zig language reference, Zig standard library.

## Language

- Zig 0.13+; explicit allocators (`std.mem.Allocator`) passed down
- `errdefer`/`defer` for cleanup; errors as values, no hidden exceptions
- `zig fmt`; no hidden control flow

## Structure

- Build with `build.zig`; modules per concern
- `std.testing` for unit tests inline with code

## Testing

- Inline `test` blocks; fuzz via `std.testing.fuzzInput`
- Sanitizers + ReleaseSafe/ReleaseFast in CI

## Performance

- Compile-time (`comptime`) for generics/metaprogramming
- Explicit memory: no allocations in hot paths; arena allocators per request

## CI/CD

- `zig build test`; `zig fmt --check`; slim static binaries
