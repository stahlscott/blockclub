# Next.js 16 + React 19 + Vitest 4 Upgrade Plan

**Estimated time:** 4-8 hours
**Risk:** High (core framework)
**Recommendation:** Do in a feature branch, test thoroughly before merging

---

## Pre-Upgrade Checklist

- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] Create feature branch: `git checkout -b upgrade/nextjs-16-react-19`
- [ ] Block off 4-8 hours of uninterrupted time

---

## Phase 1: Fix React 19 Incompatibilities (Before Upgrading)

These issues were found when testing `@types/react@18.3` and will break with React 19.

### 1.1 Fix async startTransition usage

React 19 no longer allows async functions in `startTransition`. The fix is to not await inside the transition.

**Files to fix:**

#### `apps/web/src/app/(protected)/neighborhoods/[slug]/library/new/page.tsx`
```tsx
// Before (broken in React 19)
startTransition(async () => {
  const result = await createItem({...});
  if (result.success) {
    router.push(...);
  }
});

// After (React 19 compatible)
startTransition(() => {
  createItem({...}).then((result) => {
    if (result.success) {
      router.push(...);
    } else {
      setError(result.error || "Something went wrong");
    }
  });
});
```

#### `apps/web/src/app/(protected)/neighborhoods/[slug]/posts/new/page.tsx`
Same pattern as above.

#### `apps/web/src/components/NeighborhoodSwitcher.tsx`
Same pattern as above.

### 1.2 Fix ReactNode type issues

#### `apps/web/src/components/AuthProvider.tsx`
#### `apps/web/src/components/NeighborhoodProvider.tsx`

The `children` prop type may need explicit typing:
```tsx
// Ensure children is typed as React.ReactNode
interface Props {
  children: React.ReactNode;
}
```

### 1.3 Verify no other deprecated patterns

Search for these patterns and fix if found:
```bash
# String refs (removed in React 19)
grep -r 'ref="' apps/web/src

# defaultProps on function components (removed in React 19)
grep -r '\.defaultProps' apps/web/src

# Legacy context (removed in React 19)
grep -r 'contextTypes\|getChildContext' apps/web/src
```

---

## Phase 2: Upgrade to React 18.3 (Deprecation Warnings)

This intermediate step shows deprecation warnings before React 19.

```bash
npm install react@18.3 react-dom@18.3 -w @blockclub/web
npm run typecheck
npm run dev:web
# Test the app, look for console warnings
```

---

## Phase 3: Upgrade to Next.js 15 + React 19

### 3.1 Run the official upgrade codemod

```bash
npx @next/codemod@canary upgrade 15
```

This will:
- Update `next`, `react`, `react-dom` packages
- Transform `params` and `searchParams` to async
- Update `cookies()`, `headers()`, `draftMode()` calls

### 3.2 Manual fixes after codemod

The codemod may miss some cases. Search for and fix:

```bash
# Find any remaining synchronous params access
grep -r "params\." apps/web/src/app --include="*.tsx" | grep -v "await params"

# Find any remaining synchronous searchParams access
grep -r "searchParams\." apps/web/src/app --include="*.tsx" | grep -v "await searchParams"
```

### 3.3 Update component patterns

#### Dynamic route pages (most pages in the app)
```tsx
// Before (Next.js 14)
export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  // ...
}

// After (Next.js 15+)
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}
```

#### Pages with searchParams
```tsx
// Before
export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q;
}

// After
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: query } = await searchParams;
}
```

### 3.4 Verify and test

```bash
npm run typecheck
npm run build:web
npm run dev:web
```

Test these critical flows:
- [ ] Sign in / sign out
- [ ] Dashboard loads
- [ ] Library list and detail pages
- [ ] Posts list and create
- [ ] Profile page
- [ ] All dynamic routes with [slug] or [id]

---

## Phase 4: Upgrade to Next.js 16

### 4.1 Run the upgrade

```bash
npx @next/codemod@canary upgrade latest
```

### 4.2 Turbopack compatibility

Next.js 16 uses Turbopack by default. Check for issues:

```bash
npm run dev:web
```

If you have custom webpack config in `next.config.js`, it will be ignored. Options:
- Migrate config to Turbopack format
- Use `--webpack` flag to keep using webpack

### 4.3 Review middleware (if any)

If you have `middleware.ts`, it still works. The `proxy.ts` rename is optional.

---

## Phase 5: Upgrade Vitest to v4

### 5.1 Update packages

```bash
npm install vitest@4 @vitest/coverage-v8@4 -D -w @blockclub/web
npm install vitest@4 @vitest/coverage-v8@4 -D -w @blockclub/shared
```

### 5.2 Update vitest.config.ts

```ts
// Before (Vitest 1.x)
export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});

// After (Vitest 4.x)
export default defineConfig({
  test: {
    isolate: false, // replaces singleThread
    maxWorkers: 1,  // replaces maxThreads
  },
});
```

### 5.3 Fix snapshot changes

If you have snapshots with mocks, the mock name changed:
- Before: `[MockFunction spy]`
- After: `[MockFunction]`

Update snapshots:
```bash
npm run test:unit -- -u
```

### 5.4 Run tests

```bash
npm run test:unit -w @blockclub/web
npm run test:unit -w @blockclub/shared
```

---

## Phase 6: Final Verification

### 6.1 Full test suite
```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build:web
```

### 6.2 Manual testing checklist

- [ ] Auth: Sign in, sign out, session persistence
- [ ] Dashboard: Loads with all sections
- [ ] Library: List, detail, create, edit items
- [ ] Posts: List, create, edit, delete, reactions
- [ ] Members: List, profile pages
- [ ] Settings: Profile edit, avatar upload
- [ ] Admin: Impersonation (if applicable)
- [ ] Mobile responsive: Check key pages

### 6.3 Merge

```bash
git add -A
git commit -m "Upgrade to Next.js 16, React 19, Vitest 4"
git checkout main
git merge upgrade/nextjs-16-react-19
git push
```

---

## Rollback Plan

If critical issues are found after merge:

```bash
git revert HEAD
git push
```

Then debug on the feature branch before re-attempting.

---

## Reference Links

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
