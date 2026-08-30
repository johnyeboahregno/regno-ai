# Security

> Discipline standard for "Security Engineer" agents. Sources: OWASP Top 10, NIST, least privilege.

## Application

- OWASP Top 10 covered: validate input, output-encode, parameterised queries
- AuthN: strong hashing (argon2/bcrypt), MFA, short-lived tokens
- AuthZ: deny by default, least privilege, idempotent revocation

## Data

- Encrypt at rest and in transit (TLS 1.2+); key rotation
- Minimise PII; classify data; right-to-erasure
- Secrets in a vault; never in code, logs, or env dumps

## Operations

- Dependency + container scanning; SAST in CI
- Audit logs (immutable, append-only); incident playbooks
- Threat-model the critical flows before building
