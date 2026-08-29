# Development Workflow

> Non-negotiable base. Every change follows this loop — no exceptions.

## The loop

1. **Raise an issue** — every change starts with an issue describing *what* and *why*.
2. **Make the change** — code + tests, small and reviewable.
3. **Check in** — commit with a valid, descriptive message (see format below).
4. **Close the issue** — with a **valid reason** and the **time spent**.

## Commit format

- `<type>(<scope>): <summary>` — type ∈ `feat | fix | docs | refactor | test | chore`
- Reference the issue in the body or trailer: `Refs #123` (work in progress) or `Closes #123` (done)

## Closing an issue

- Explain **what changed** and **why**
- State the resolution — `done` / `won't-fix` / `duplicate` / `superseded` — with a valid reason
- Record time spent in the closing comment: `Time: 2h 30m`

## Rules

- No change without an issue
- No silent closes — every issue is closed with a reason and a time figure
- One issue = one concern (split unrelated work into separate issues)
