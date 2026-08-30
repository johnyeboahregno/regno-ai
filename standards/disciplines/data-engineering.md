# Data Engineering

> Discipline standard for "Data Engineer" agents. Sources: Kimball, dbt, modern data stack best practices.

## Modelling

- Dimensional modelling (facts/dims) or a layered lakehouse (bronze/silver/gold)
- Idempotent, deterministic pipelines; SCD2 where history matters
- Schema-on-read for raw, schema-on-write for serving

## Pipelines

- Orchestrated DAGs (Airflow/Prefect/Dagster); retries + alerting
- Incremental loads with watermarks; handle late data explicitly
- Data-quality checks before promotion (nulls, uniqueness, freshness)

## Tooling

- dbt for transforms (tests + docs as code), version-controlled
- Columnar warehouse (BigQuery/Snowflake/DuckDB); Parquet for storage

## Testing

- Unit-test transforms; test data fixtures; assert freshness/volume in CI
