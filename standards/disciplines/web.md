# Web Development

> Discipline standard for "Web Developer" agents. Sources: MDN, web.dev, framework docs.

## Fundamentals

- Semantic HTML; accessibility first (WCAG AA): labels, roles, focus states, keyboard nav
- Responsive, mobile-first layouts; test at multiple breakpoints
- Performance budget: LCP < 2.5s, CLS < 0.1, INP < 200ms

## Frontend

- Component-driven UI with a typed framework; co-locate state/styles per feature
- Styles via design tokens / CSS variables; avoid inline magic numbers
- TypeScript everywhere on the frontend; no `any`

## Data & State

- Fetch via a thin API layer; handle loading/empty/error states explicitly
- Server state cached; local state minimal
- Validate all client/server boundaries (zod or equivalent)

## Testing

- Unit: components + pure logic; integration: user flows (Playwright)
- Accessibility checks in CI (axe); visual regression on critical pages

## Build

- SSG/SSR where content is public; bundle analysis; code-splitting
- Security headers (CSP); no secrets in the client bundle
