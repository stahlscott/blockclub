# Block Club

A neighborhood community app for Block Clubs.

## Features

- **Resident Directory** - Find and connect with neighbors, with search and multiple sort options (address, name, move-in year, join date)
- **Lending Library** - Share tools, kitchen items, and more with neighbors across 10 categories
- **Multi-Neighborhood Support** - Join multiple neighborhoods with a single account, set a primary neighborhood
- **Member Profiles** - Address, unit, move-in year, children, pets, bio, multiple phone numbers and emails with labels
- **Invite System** - Share invite links to bring neighbors into your community
- **Admin Controls** - Approve new members, manage roles, moderate content
- **Account Settings** - Change password, copy invite links

## Tech Stack

- **Monorepo**: Turborepo
- **Web**: Next.js 15 (React)
- **Mobile**: Expo (React Native) - scaffold only
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Language**: TypeScript

## Project Structure

```
blockclub/
├── apps/
│   ├── web/              # Next.js web application
│   │   └── src/
│   │       ├── app/      # App router pages and layouts
│   │       ├── components/  # Shared React components
│   │       └── lib/      # Utilities, Supabase client
│   └── mobile/           # Expo mobile application (scaffold)
├── packages/
│   └── shared/           # Shared types and Supabase client
├── supabase/
│   └── migrations/       # Database schema migrations
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json with workspaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Supabase account (free tier works)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/stahlscott/frontporch.git
   cd frontporch
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**
   1. Create a new project at [supabase.com](https://supabase.com)
   2. Install Supabase CLI and link your project:
      ```bash
      npm install -g supabase
      supabase login
      supabase link --project-ref your-project-ref
      ```
   3. Apply migrations:
      ```bash
      supabase db push
      ```
   4. Go to **Project Settings > API** and copy your credentials

4. **Set up environment variables**

   Copy the example env file:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Edit `apps/web/.env.local` with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   STAFF_ADMIN_EMAILS=your-email@example.com
   ```

5. **Run development server**

   ```bash
   npm run dev:web
   ```

6. **Open the app**
   - Web: http://localhost:3000

## User Roles

| Capability                   | Staff Admin | Neighborhood Admin | Member   |
| ---------------------------- | ----------- | ------------------ | -------- |
| Create neighborhoods         | Yes         | No                 | No       |
| Approve/reject join requests | Yes         | Own neighborhood   | No       |
| Remove members               | Yes         | Own neighborhood   | No       |
| Remove any item              | Yes         | Own neighborhood   | Own only |
| Promote member to admin      | Yes         | Own neighborhood   | No       |
| Demote admin to member       | Yes         | No                 | No       |

## Database Schema

The app uses a multi-tenant architecture where all data is scoped to neighborhoods:

```
┌─────────────────┐       ┌─────────────────┐
│  neighborhoods  │       │     users       │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ name            │       │ email           │
│ slug            │       │ name            │
│ description     │       │ bio             │
│ location        │       │ address / unit  │
│ settings        │       │ phones[]        │
└────────┬────────┘       │ emails[]        │
         │                │ move_in_year    │
         │                │ children / pets │
         │                └────────┬────────┘
         │    ┌─────────────────┐  │
         └───►│   memberships   │◄─┘
              ├─────────────────┤
              │ user_id         │
              │ neighborhood_id │
              │ role            │
              │ status          │
              └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     items       │       │     loans       │
├─────────────────┤       ├─────────────────┤
│ id              │◄──────│ item_id         │
│ neighborhood_id │       │ borrower_id     │
│ owner_id        │       │ status          │
│ name            │       │ due_date        │
│ category        │       │ returned_at     │
│ availability    │       └─────────────────┘
└─────────────────┘
```

All tables have Row Level Security (RLS) policies ensuring users can only access data in their neighborhoods.

## Environment Variables

| Variable                               | Description                                |
| -------------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                   |
| `STAFF_ADMIN_EMAILS`                   | Comma-separated list of staff admin emails |
| `NEXT_PUBLIC_SENTRY_DSN`               | Sentry DSN for error reporting             |
| `SENTRY_ORG`                           | Sentry organization slug (build-time)      |
| `SENTRY_PROJECT`                       | Sentry project slug (build-time)           |
| `SENTRY_AUTH_TOKEN`                    | Sentry auth token for source maps (build-time) |

## Infrastructure

| Service | Purpose | Notes |
| ------- | ------- | ----- |
| [Supabase](https://supabase.com) | Database, Auth, Storage | PostgreSQL with RLS, email/password auth, image storage |
| [Vercel](https://vercel.com) | Hosting, DNS | Automatic deploys from main branch |
| [Sentry](https://sentry.io) | Error Monitoring | Error tracking with source maps, session replay |
| [Resend](https://resend.com) | Transactional email | Auth emails (confirmation, password reset) via Supabase SMTP |
| [ImprovMX](https://improvmx.com) | Email forwarding | Forwards contact emails to personal address |

## Scripts

```bash
npm run dev:web    # Start web dev server
npm run build:web  # Build web app
npm run lint       # Lint all packages
```

## License

MIT License - see [LICENSE](LICENSE) for details.
