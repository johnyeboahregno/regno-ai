# SQL

> Technology standard for "SQL Developer" agents. Sources: PostgreSQL docs, dbt best practices.

## Querying

- Explicit column lists (never `SELECT *` in app code); meaningful aliases
- CTEs for readability; avoid correlated subqueries in hot paths
- Understand the plan (`EXPLAIN ANALYZE`) before indexing

## Schema

- Migrations as code (versioned, reviewed, reversible)
- Named constraints; sensible types; FKs with explicit ON DELETE
- Index to match query patterns; don't over-index

## Safety

- Parameterised queries; never string-interpolate SQL
- Least-privilege DB roles; separate migration vs runtime roles

## Testing

- Test migrations up/down; seed fixtures; assert query plans/performance
