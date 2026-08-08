# Web App Instructions

These instructions apply to `apps/web`. Repository-wide guidance is in [`../../AGENTS.md`](../../AGENTS.md).

## Web App Structure

- App Router routes live in `src/app/`.
- Shared React components live in `src/components/`.
- Web-specific utilities and services live in `src/lib/`.
- Integration tests live in `src/test/integration/` and use the repository integration preflight.
- Playwright tests live in `e2e/`.

## Web-Specific Styling

- Use CSS Modules for reusable components and styles requiring responsive or stateful behavior.
- Use an inline `styles` object for one-off page-specific layouts.
- Use CSS variables from `src/app/globals.css` for colors, spacing, typography, shadows, and transitions.
- Use `src/app/responsive.module.css` for shared responsive grid utilities.
- Prefer Flexbox for one-dimensional layouts and CSS Grid for two-dimensional layouts.
- Use the `gap` property for spacing between flex/grid children.

## Web-Specific React Patterns

- Server Components are the default; add `"use client"` only for state, effects, event handlers, browser APIs, or client-only libraries.
- Prefer Server Actions for form mutations.
- Prefer React 19 `useActionState` for forms backed by Server Actions.
- Use the centralized query layer in `src/lib/queries/` rather than inline Supabase queries.
- Use `getAuthContext()` for server actions and API routes that need staff-admin or impersonation-aware authorization.
- Use the server Supabase client from `@/lib/supabase/server` in Server Components and the browser client from `@/lib/supabase/client` in Client Components.

## Web-Specific Testing Commands

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

For test selectors, prefer `data-testid` values using the `{context}-{component}-{element}` convention. Use role- or label-based selectors when the test is specifically validating accessibility.

## Web-Specific Accessibility

- Use semantic HTML before ARIA or generic containers.
- Pair form controls with labels.
- Keep interactive targets keyboard accessible and provide visible focus states.
- Do not rely on color alone to convey meaning.
- Respect `prefers-reduced-motion`.
- Maintain WCAG AA contrast requirements.
