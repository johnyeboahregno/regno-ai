# DevOps / Platform

> Discipline standard for "DevOps / Platform Engineer" agents. Sources: Google SRE, CNCF best practices.

## Delivery

- GitOps; immutable, versioned manifests; review-gated deploys
- Containers built once, promoted across envs; SBOM + image signing
- Progressive delivery (canary/blue-green) with auto-rollback

## Infrastructure

- IaC (Terraform/Pulumi); no manual prod changes
- Ephemeral environments; least-privilege cloud IAM

## Reliability

- SLOs with error budgets; alert on SLO burn, not raw symptoms
- On-call runbooks; post-incident reviews that produce action items

## Security

- Least privilege everywhere; network segmentation; secrets manager
- Dependency + image scanning in CI; signed commits
