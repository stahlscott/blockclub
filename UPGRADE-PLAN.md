# Major Dependency Upgrade Plan

This document outlines the upgrade path for major dependencies in the Block Club project.

## Recommended Upgrade Order

The dependencies have interdependencies, so order matters:

1. **ESLint 8 → 9** + **@typescript-eslint 7 → 8** (can do independently)
2. **Vitest 1 → 4** (can do independently)
3. **@supabase/ssr 0.5 → 0.8** (can do independently)
4. **React 18 → 19** + **Next.js 14 → 15 → 16** (must do together)

---

## 1. ESLint 8 → 9 + @typescript-eslint 7 → 8

**Effort:** Medium (2-4 hours)
**Risk:** Low (dev tooling only)

### Breaking Changes
- New "flat config" format replaces `.eslintrc.*` files
- Config file renamed to `eslint.config.js` (or `.mjs`)
- Array-based configuration instead of cascading inheritance
- `require-jsdoc` and `valid-jsdoc` rules removed

### Migration Steps
1. Install new versions:
   ```bash
   npm install eslint@9 @typescript-eslint/eslint-plugin@8 @typescript-eslint/parser@8 -D
   ```
2. Use migration helper if needed:
   ```bash
   npm install @eslint/eslintrc -D
   ```
3. Convert `.eslintrc.*` to `eslint.config.js` using flat config format
4. Update `eslint-config-next` to v16 (or use compat layer)
5. Run `npm run lint` and fix any new errors

### Resources
- [ESLint Configuration Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- [Migrate to v9.x](https://eslint.org/docs/latest/use/migrate-to-9.0.0)

---

## 2. Vitest 1 → 4

**Effort:** Low-Medium (1-3 hours)
**Risk:** Low (test tooling only)

### Breaking Changes
- `poolOptions` moved to top-level config
- `maxThreads`/`singleThread` → `maxWorkers`/`isolate`
- `workspace` renamed to `projects`
- `vi.fn().getMockName()` returns `vi.fn()` instead of `spy`
- `vi.restoreAllMocks` behavior changed
- Mock `invocationCallOrder` now starts at 1 (was 0)
- `basic` reporter removed
- `coverage.all` option removed
- Requires Vite 6 (not Vite 5)

### Migration Steps
1. Update packages:
   ```bash
   npm install vitest@4 @vitest/coverage-v8@4 -D -w @blockclub/web
   npm install vitest@4 @vitest/coverage-v8@4 -D -w @blockclub/shared
   ```
2. Update `vitest.config.ts` for new option names
3. Update any snapshot tests that include mock names
4. Run tests and fix failures

### Resources
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4)

---

## 3. @supabase/ssr 0.5 → 0.8

**Effort:** Low (1-2 hours)
**Risk:** Medium (auth changes)

### Breaking Changes
- API refinements ahead of v1.0
- Cookie encoding options added
- Console warnings for deprecated patterns

### Migration Steps
1. Update package:
   ```bash
   npm install @supabase/ssr@0.8 -w @blockclub/web
   ```
2. Review [CHANGELOG](https://github.com/supabase/ssr/blob/main/CHANGELOG.md) for specific changes
3. Test auth flows: sign in, sign out, session refresh
4. Test SSR/SSG pages that use auth

### Resources
- [Supabase SSR Releases](https://github.com/supabase/ssr/releases)
- [SSR Package CHANGELOG](https://github.com/supabase/ssr/blob/main/CHANGELOG.md)

---

## 4. React 18 → 19 + Next.js 14 → 16

**Effort:** High (4-8 hours)
**Risk:** High (core framework)

### Recommended Path
Upgrade in two steps: 14 → 15, then 15 → 16

### React 19 Breaking Changes
- `ReactDOM.render` removed (we use `createRoot`, so OK)
- `ReactDOM.hydrate` removed (use `hydrateRoot`)
- String refs removed
- PropTypes removed (we use TypeScript, so OK)
- `defaultProps` removed for function components (use ES6 defaults)
- `forwardRef` no longer needed (ref is now a regular prop)
- `startTransition` no longer accepts async functions (⚠️ we have this)

### Next.js 15 Breaking Changes
- Async Request APIs: `params`, `searchParams`, `cookies()`, `headers()` return Promises
- Caching is now opt-in (was opt-out)
- React 19 required

### Next.js 16 Breaking Changes
- Turbopack is default bundler (webpack config ignored unless `--webpack` flag)
- `middleware.ts` → `proxy.ts` rename option (edge runtime still works)
- `geo` and `ip` removed from NextRequest
- Synchronous access to request APIs fully removed

### Migration Steps

#### Step 1: Prepare codebase
1. Fix `startTransition` async usage in:
   - `library/new/page.tsx`
   - `posts/new/page.tsx`
   - `NeighborhoodSwitcher.tsx`
2. Replace any `defaultProps` with ES6 default parameters
3. Upgrade to React 18.3 first to see deprecation warnings

#### Step 2: Upgrade to Next.js 15 + React 19
```bash
npx @next/codemod@canary upgrade 15
```
This will:
- Update packages
- Run codemods for async request APIs
- Update `params`/`searchParams` usage

#### Step 3: Test thoroughly
- All auth flows
- All dynamic routes with params
- Server components
- Client components with cookies/headers

#### Step 4: Upgrade to Next.js 16
```bash
npx @next/codemod@canary upgrade latest
```
- Review Turbopack compatibility
- Test build with `--webpack` flag if issues arise

### Resources
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

## Files Requiring Changes for React 19

Based on the `@types/react@18.3` typecheck failure, these files use async `startTransition`:

| File | Issue |
|------|-------|
| `apps/web/src/app/(protected)/neighborhoods/[slug]/library/new/page.tsx` | async startTransition |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/posts/new/page.tsx` | async startTransition |
| `apps/web/src/components/NeighborhoodSwitcher.tsx` | async startTransition |
| `apps/web/src/components/AuthProvider.tsx` | ReactNode type |
| `apps/web/src/components/NeighborhoodProvider.tsx` | ReactNode type |

---

## Mobile App (Low Priority)

The mobile app is scaffold-only. These can wait:
- expo 51 → 54
- react-native 0.74 → 0.83
- Related Expo packages

---

## Summary Timeline

| Phase | Packages | Effort | Can Parallelize |
|-------|----------|--------|-----------------|
| 1 | ESLint 9 + typescript-eslint 8 | 2-4h | Yes |
| 2 | Vitest 4 | 1-3h | Yes |
| 3 | @supabase/ssr 0.8 | 1-2h | Yes |
| 4 | React 19 + Next.js 15/16 | 4-8h | No (do last) |

**Total estimated effort:** 8-17 hours
