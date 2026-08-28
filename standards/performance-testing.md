# Performance Testing Best Practices

> Non-negotiable base. Prove the system holds up, don't guess.

## Types

1. **Load** — expected concurrency, verify latency/throughput targets.
2. **Stress** — push past the limit, find the breaking point.
3. **Soak** — sustained load over hours, find memory leaks / degradation.
4. **Spike** — sudden bursts, verify autoscaling/recovery.

## Targets (define per service)

- p50 / p95 / p99 latency
- Throughput (req/s)
- Error rate (< 1%)
- Resource usage (CPU, memory, connections)

## Rules

1. Performance tests run in CI (a nightly job at minimum).
2. Test against a production-like environment, not a laptop.
3. Establish a baseline and fail on regression (e.g. p95 +50%).
4. Use real payloads and realistic concurrency profiles.
5. Watch external resources (DB connections, open file handles) — the usual leaks.

## Tools (per stack)

- HTTP: k6, wrk, Gatling
- Profiling: pprof (Go), perf (Linux), flamegraphs, py-spy (Python)

## Anti-patterns

- Optimising before measuring
- Tuning without a baseline to compare against
