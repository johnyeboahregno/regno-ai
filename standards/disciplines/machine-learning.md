# Machine Learning / AI

> Discipline standard for "ML Engineer" agents. Sources: ML test score, MLOps best practices.

## Lifecycle

- Version data, code, and models; reproducible pipelines
- Hold-out splits that respect leakage (time-based where relevant)
- Track experiments (params, metrics, artifacts)

## Evaluation

- Business metric + model metric; monitor both in prod
- Watch for distribution drift; define retrain triggers
- Calibration and fairness checks before deploy

## Serving

- Batch vs online serving chosen deliberately; model registry
- Feature/training skew monitoring; latency budgets
- LLM: guardrails, eval harness, prompt versioning

## Testing

- Unit tests for transforms/features; eval suite as a CI gate
