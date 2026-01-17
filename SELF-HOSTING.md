# Self-Hosting Guide

This guide walks you through forking and deploying your own Block Club instance for your neighborhood or community.

## What You'll Get

- A complete neighborhood community platform
- Resident directory with profiles and contact info
- Lending library for sharing items between neighbors
- Bulletin board for posts and announcements
- Multi-neighborhood support with admin controls
- Mobile-responsive web app

## Prerequisites

- **Node.js 18+** and **npm 10+**
- **Supabase account** (free tier works) - [supabase.com](https://supabase.com)
- **Vercel account** (free tier works) - [vercel.com](https://vercel.com)
- **Git** for cloning the repository

## Quick Start

### 1. Fork and Clone

Fork this repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/blockclub.git
cd blockclub
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning
3. Go to **Project Settings > API** and note your:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key (the publishable key)

### 3. Run Database Migrations

Install the Supabase CLI and apply the schema:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

This creates all tables, Row Level Security policies, triggers, and storage buckets.

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
STAFF_ADMIN_EMAILS=your-email@example.com
```

### 5. Deploy to Vercel

1. Push your fork to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the **Root Directory** to `apps/web`
4. Add the same environment variables from step 4
5. Deploy

Your app is now live!

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Your Supabase anon/public key |
| `STAFF_ADMIN_EMAILS` | Yes | Comma-separated emails for staff admin access |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `SENTRY_ORG` | No | Sentry organization slug (for source maps) |
| `SENTRY_PROJECT` | No | Sentry project slug (for source maps) |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token (for source maps) |

---

## Optional Services

### Error Monitoring (Sentry)

Sentry provides error tracking and session replay. To enable:

1. Create a project at [sentry.io](https://sentry.io)
2. Add the environment variables above
3. Errors will be automatically reported

To skip Sentry, simply don't set the `NEXT_PUBLIC_SENTRY_DSN` variable. The app will log errors to the console instead.

### Transactional Email (Resend)

By default, Supabase uses its built-in email service for authentication emails (signup confirmation, password reset). This works fine for small-scale use.

For custom email templates or higher volume, you can use [Resend](https://resend.com):

1. Create a Resend account and verify your domain
2. In Supabase Dashboard, go to **Project Settings > Auth > SMTP Settings**
3. Configure with your Resend SMTP credentials
4. Customize email templates under **Auth > Email Templates**

---

## Customization

### Branding

To rename the app for your community:

1. Search the codebase for "Block Club" and replace with your name
2. Update the `<title>` in `apps/web/src/app/layout.tsx`
3. Replace favicon/icons in `apps/web/public/`

### Item Categories

Lending library categories are defined in `packages/shared/src/types.ts`:

```typescript
export const ITEM_CATEGORIES = [
  "tools",
  "kitchen",
  "outdoor",
  // Add or modify categories here
] as const;
```

### Styling

Colors and design tokens are in `apps/web/src/app/globals.css`:

```css
:root {
  --color-primary: #2563eb;
  --color-background: #ffffff;
  /* Customize your color scheme */
}
```

---

## Deployment Options

### Vercel (Recommended)

Vercel offers the simplest deployment with automatic builds from GitHub:

1. Import your repository at [vercel.com/new](https://vercel.com/new)
2. Set Root Directory to `apps/web`
3. Framework Preset will auto-detect Next.js
4. Add environment variables
5. Deploy

Each push to `main` triggers automatic redeployment.

### Other Platforms

Block Club can run on any platform that supports Next.js:

- **Netlify**: Use the Next.js runtime adapter
- **Railway**: Direct Node.js deployment
- **Docker**: Build with `npm run build:web`, serve with Node.js
- **Self-hosted**: Run `npm run build:web && npm start` behind a reverse proxy

For non-Vercel deployments, ensure you:
- Set `NODE_ENV=production`
- Configure HTTPS (required for authentication cookies)
- Set all environment variables

---

## First Admin Setup

After deployment, set up your first neighborhood:

### 1. Create Your Account

1. Go to your deployed app URL
2. Click "Sign Up" and create an account with the email you set in `STAFF_ADMIN_EMAILS`
3. Confirm your email if required

### 2. Create a Neighborhood

As a staff admin, you'll see the admin menu:

1. Go to **Admin Settings** in the dropdown menu
2. Click **Create Neighborhood**
3. Fill in your neighborhood name, slug (URL-friendly), and description
4. You'll automatically be added as an admin of this neighborhood

### 3. Invite Neighbors

1. Go to **Settings** from the header dropdown
2. Copy your neighborhood's invite link
3. Share with neighbors - they'll sign up and you'll approve their membership

---

## Troubleshooting

### "Invalid API Key" Error

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are correct
- Make sure you're using the `anon` key, not the `service_role` key

### Migrations Failed

- Ensure you've linked to the correct Supabase project: `supabase link`
- Try running `supabase db reset` for a clean slate (warning: deletes all data)

### Authentication Emails Not Sending

- Check Supabase Dashboard > Auth > Email Templates
- For custom SMTP, verify credentials in Project Settings > Auth > SMTP Settings
- Check spam folders

### Storage Upload Errors

- Verify storage buckets were created by migrations
- Check RLS policies in Supabase Dashboard > Storage > Policies

### Build Failures on Vercel

- Ensure Root Directory is set to `apps/web`
- Check that all required environment variables are set
- Review build logs for specific errors

---

## Getting Help

- Check [GitHub Issues](https://github.com/stahlscott/blockclub/issues) for known problems
- Open an issue for bugs or feature requests

## License

MIT License - you're free to use, modify, and distribute this software.
