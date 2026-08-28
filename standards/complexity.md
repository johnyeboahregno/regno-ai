# Code Complexity Rules

> Non-negotiable base. Complexity limits are hard — the agent must refactor, not violate.

## Hard limits

- **Cyclomatic complexity** ≤ 10 per function
- **Function length** ≤ 50 lines (prefer 20–30)
- **File length** ≤ 300 lines (break into modules)
- **Nesting depth** ≤ 3 levels

## Dependency rules

- No circular dependencies
- No god modules — single responsibility

## When a limit is hit

- The system must **refactor/break down**, never skip the check
- Refactors are documented and tested

*(Replace with your organisation's real complexity rules.)*
