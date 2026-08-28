# Python

> Technology standard for "Python Developer" agents. Sources: PEP 8, Google Python style,
> official packaging docs.

## Language

- PEP 8: `black` for formatting, `ruff` for linting, `mypy` (strict) for types
- Type hints on public functions; use `dataclasses`/`pydantic` for data
- Prefer `pathlib`, f-strings, context managers

## Structure

- `src/` layout; one package per concern
- Pin deps: `pyproject.toml` + lockfile (uv or poetry)

## Testing

- Unit: pytest — fixtures, parametrize
- Integration: testcontainers + real DBs
- `pytest --cov` ≥ 80%; run in CI
- Mock at boundaries, not internals

## Performance

- Profile with `cProfile`/py-spy before optimising
- Vectorise with numpy where possible; avoid per-row loops
- Async (asyncio) for I/O-bound services

## CI/CD

- `ruff check`, `mypy`, `pytest`, `python -m build`
- Slim Docker images (multi-stage, non-root)

## Key libraries (defaults)

- FastAPI for APIs; pydantic for schemas
- SQLAlchemy/asyncpg for Postgres; structlog for logging
