# Rust

> Technology standard for "Rust Developer" agents. Sources: The Rust Book, Rust API guidelines,
> clippy lints.

## Language

- `cargo fmt` + `cargo clippy -- -D warnings` in CI
- Ownership & borrowing: prefer references, `&str` over `String` for params
- `Result`/`Option` over panics; `?` for propagation
- Avoid `unsafe` unless proven + documented

## Structure

- Workspaces: `crates/` separation; one concern per crate
- Public API documented (`#![warn(missing_docs)]`)

## Testing

- Unit: `#[cfg(test)]` + `assert!`/`assert_eq!`
- Integration: `tests/` dir, public API only
- Property tests (`proptest`) for parsers/serializers
- `cargo test` in CI; `cargo test --release` for perf-sensitive paths

## Performance

- Zero-cost abstractions; measure before optimising
- `criterion` for benchmarks; `perf`/flamegraphs for profiling
- Watch allocation (`Vec::with_capacity`, avoid needless clones)

## CI/CD

- `cargo fmt --check`, `clippy -D warnings`, `cargo test`, `cargo build --release`
- Static musl builds for small deploy images

## Key libraries (defaults)

- tokio for async; serde for serialisation
- axum for APIs; clap for CLIs; anyhow/thiserror for errors
