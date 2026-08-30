# Java

> Technology standard for "Java Developer" agents. Sources: Effective Java, Google Java style.

## Language

- Java 21; records, sealed types, pattern matching where applicable
- `final` fields; immutable value objects; avoid `null` (Optional at boundaries)
- Spotless/checkstyle formatting; no checked exceptions for flow control

## Structure

- Maven or Gradle; layered packages by feature
- Constructor injection; interfaces at module boundaries

## Testing

- JUnit 5 + AssertJ; Mockito at boundaries
- Testcontainers for real DBs; coverage ≥ 80%

## Performance

- Profile (JFR/async-profiler) before optimising; mind allocations in hot loops
- Connection pooling; virtual threads for I/O-bound work

## CI/CD

- `./gradlew build` or `mvn verify`; PMD/SpotBugs; slim JRE images
