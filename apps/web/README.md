# Block Club Web App

The primary web application for Block Club, built with Next.js 14.

## Quick Start

```bash
# From monorepo root
npm run dev:web

# Or from this directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Public auth routes (signin, signup)
│   ├── (protected)/       # Authenticated routes
│   ├── api/               # API routes
│   ├── join/              # Public join flow
│   ├── globals.css        # Design tokens and global styles
│   └── responsive.module.css  # Grid utilities
├── components/            # Shared React components
├── lib/                   # Utilities and services
│   ├── supabase/          # Supabase client configuration
│   ├── auth.ts            # Auth helpers
│   ├── validation.ts      # Input validation
│   ├── storage.ts         # File upload utilities
│   └── logger.ts          # Logging
└── test/                  # Test utilities
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
STAFF_ADMIN_EMAILS=admin@example.com
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
npm run test:unit    # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run test:coverage # Coverage report
```

## Key Patterns

- **Server Components** by default - only add `"use client"` when needed
- **CSS Modules** for components, **inline styles** for pages
- **Design tokens** in `globals.css` for colors, spacing, typography
- See `CLAUDE.md` for detailed development patterns

## Testing

**Unit tests** are in `lib/__tests__/` and test utilities/helpers.

**E2E tests** are in `e2e/` and test complete user flows.

```bash
# Run all tests
npm run test:unit
npm run test:e2e

# Run with UI
npm run test:e2e -- --ui
```
