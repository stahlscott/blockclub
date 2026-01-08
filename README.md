# Front Porch

A neighborhood community app for building stronger local connections.

## Features

- **Resident Directory** - Find and connect with neighbors
- **Lending Library** - Share tools, kitchen items, and more with neighbors
- **Events & Gatherings** - Organize and RSVP to neighborhood events
- **Childcare Coordination** - Share childcare availability with trusted neighbors
- **Multi-Neighborhood Support** - Join multiple neighborhoods with a single account

## Tech Stack

- **Monorepo**: Turborepo
- **Web**: Next.js 14 (React)
- **Mobile**: Expo SDK 51 (React Native)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Language**: TypeScript

## Project Structure

```
frontporch/
├── apps/
│   ├── web/              # Next.js web application
│   └── mobile/           # Expo mobile application
├── packages/
│   └── shared/           # Shared types, utilities, and Supabase client
├── supabase/
│   ├── migrations/       # Database schema migrations
│   ├── seed.sql          # Sample data for development
│   └── config.toml       # Supabase local config
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json with workspaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- iOS Simulator (for iOS development) or Android Studio (for Android)
- Supabase account (free tier works)
- Supabase CLI (optional, for local development)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/frontporch.git
   cd frontporch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   **Option A: Using Supabase Cloud (Recommended for getting started)**
   
   1. Create a new project at [supabase.com](https://supabase.com)
   2. Go to **SQL Editor** and run the migration files in order:
      - `supabase/migrations/00001_initial_schema.sql`
      - `supabase/migrations/00002_row_level_security.sql`
      - `supabase/migrations/00003_storage_buckets.sql`
   3. (Optional) Run `supabase/seed.sql` for sample data
   4. Go to **Project Settings > API** and copy:
      - **Project URL** (e.g., `https://abc123.supabase.co`)
      - **Publishable Key** (labeled "anon public" in some versions)

   **Option B: Using Supabase CLI (Local development)**
   
   ```bash
   # Install Supabase CLI
   brew install supabase/tap/supabase
   
   # Start local Supabase (requires Docker)
   supabase start
   
   # Apply migrations
   supabase db push
   
   # (Optional) Seed data
   supabase db reset --seed
   ```
   
   Local Supabase will output your local credentials when it starts.

4. **Set up environment variables**
   
   Copy the example env files:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```
   
   Edit each `.env.local` file with your Supabase credentials:
   
   **apps/web/.env.local:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   **apps/mobile/.env.local:**
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Run development servers**
   ```bash
   # Run web only
   npx turbo dev --filter=@frontporch/web
   
   # Run mobile only (in apps/mobile directory)
   cd apps/mobile && npx expo start --ios
   
   # Or run both
   npm run dev
   ```

6. **Open the apps**
   - Web: http://localhost:3000
   - Mobile: Scan QR code with Expo Go app (or press `i` for iOS simulator)

## Database Schema

The app uses a multi-tenant architecture where all data is scoped to neighborhoods:

```
┌─────────────────┐       ┌─────────────────┐
│  neighborhoods  │       │     users       │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ name            │       │ email           │
│ slug            │       │ name            │
│ description     │       │ avatar_url      │
│ settings        │       │ bio             │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌─────────────────┐  │
         └───►│   memberships   │◄─┘
              ├─────────────────┤
              │ user_id         │
              │ neighborhood_id │
              │ role            │
              │ status          │
              │ household_id    │
              └─────────────────┘
```

**Key tables:**
- `users` - User profiles (linked to Supabase Auth)
- `neighborhoods` - Communities with settings
- `memberships` - Links users to neighborhoods with roles
- `households` - Addresses within neighborhoods
- `items` - Lending library items
- `loans` - Item borrowing records
- `events` - Neighborhood events
- `event_rsvps` - Event responses
- `childcare_availability` - Childcare scheduling
- `childcare_requests` - Childcare bookings

All tables have Row Level Security (RLS) policies ensuring users can only access data in their neighborhoods.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (web) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key (web) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (mobile) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key (mobile) |
| `SUPABASE_SECRET_KEY` | Secret key for server-side only (never expose to client) |

## Scripts

```bash
npm run dev       # Start all dev servers
npm run build     # Build all packages
npm run lint      # Lint all packages
npm run format    # Format code with Prettier
npm run clean     # Clean all build artifacts
```

## License

MIT License - see [LICENSE](LICENSE) for details.
