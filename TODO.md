# Front Porch - Project TODO

Neighborhood community app with directory + lending library.

## Key Decisions
- **Name:** Front Porch
- **Multi-neighborhood support:** Yes, from day one
- **Tech stack:** Expo (mobile), Next.js (web), Supabase (backend), Turborepo (monorepo)
- **License:** MIT (open source)
- **Target scale:** ~100 users, low-cost hosting
- **Supabase:** Account ready with GitHub OAuth

---

## Phase 1: Project Setup & Architecture Planning
- [ ] Define tech stack (React Native/Expo for mobile, React for web, shared backend)
- [ ] Set up monorepo structure (apps/web, apps/mobile, packages/shared)
- [ ] Choose backend: Supabase (free tier, auth, DB, storage) or self-hosted alternative
- [ ] Set up GitHub repo with MIT/Apache license for open source
- [ ] Create README with project vision and setup instructions

## Phase 2: Database Schema & Backend Setup
- [ ] Design database schema with multi-neighborhood support (neighborhoods, users, households, items, events, childcare)
- [ ] Design neighborhood model (name, slug, description, location, settings, created_by)
- [ ] Design membership model (user + neighborhood + role) for multi-neighborhood users
- [ ] Set up Supabase project with tables and relationships
- [ ] Configure Row Level Security policies scoped to neighborhood membership
- [ ] Set up storage buckets for profile photos and item images
- [ ] Create database migration scripts for reproducibility

## Phase 3: Authentication & User Management
- [ ] Implement email/password authentication
- [ ] Add invite-only registration (neighborhood admin approves new users)
- [ ] Create user profile model (name, photo, bio, contact info)
- [ ] Build neighborhood selection/switching UI for users in multiple neighborhoods
- [ ] Build profile editing UI with privacy controls

## Phase 4: Resident Directory Feature
- [ ] Create household/address model linked to neighborhood and users
- [ ] Build directory list view with search/filter (scoped to current neighborhood)
- [ ] Create resident profile detail view
- [ ] Add contact buttons (call, text, email) respecting privacy settings

## Phase 5: Lending Library Feature
- [ ] Design item model (name, description, category, photos, owner, availability, neighborhood_id)
- [ ] Design loan/reservation model (item, borrower, dates, status)
- [ ] Build item listing UI with categories (kitchen, tools, outdoor, etc.)
- [ ] Create add/edit item form with photo upload
- [ ] Build request/approve loan workflow
- [ ] Add loan history and current loans view
- [ ] Implement return reminders/notifications

## Phase 6: Childcare Availability Feature
- [ ] Design availability model (user, neighborhood, date/time slots, capacity, notes)
- [ ] Build calendar view for posting availability
- [ ] Create request/booking system for childcare
- [ ] Add messaging between parents for coordination

## Phase 7: Events & Gatherings Feature
- [ ] Design event model (title, description, datetime, location, host, RSVPs, neighborhood_id)
- [ ] Build event creation form
- [ ] Create event list and calendar views
- [ ] Implement RSVP system with headcount
- [ ] Add event reminders/notifications

## Phase 8: Notifications & Messaging
- [ ] Set up push notifications (Expo for mobile)
- [ ] Implement in-app notification center
- [ ] Add optional email notifications for important events
- [ ] Consider simple direct messaging between neighbors

## Phase 9: Admin & Moderation
- [ ] Create admin/member roles at neighborhood level
- [ ] Build user approval/invitation workflow per neighborhood
- [ ] Add neighborhood creation flow for new communities
- [ ] Add ability to remove users or content if needed

## Phase 10: Polish & Deployment
- [ ] Add onboarding flow for new users
- [ ] Implement dark mode support
- [ ] Deploy web app (Vercel/Netlify free tier)
- [ ] Build and submit iOS app to App Store
- [ ] Build and submit Android app to Play Store
- [ ] Write deployment documentation for self-hosting

## Phase 11: Open Source Preparation
- [ ] Write comprehensive README with features and screenshots
- [ ] Create CONTRIBUTING.md with development guidelines
- [ ] Add environment variable templates (.env.example)
- [ ] Write self-hosting guide (Supabase setup, deployment options)
- [ ] Create configuration for neighborhood customization (name, logo, etc.)

---

## Data Model Overview

```
┌─────────────────┐       ┌─────────────────┐
│  neighborhoods  │       │     users       │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ name            │       │ email           │
│ slug            │       │ name            │
│ description     │       │ avatar_url      │
│ created_by      │       │ bio             │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌─────────────────┐  │
         └───►│   memberships   │◄─┘
              ├─────────────────┤
              │ user_id         │
              │ neighborhood_id │
              │ role (admin/member)
              │ household_id    │
              └─────────────────┘
                      │
              ┌───────▼───────┐
              │  households   │
              ├───────────────┤
              │ id            │
              │ neighborhood_id
              │ address       │
              └───────────────┘
```

All content (items, events, childcare) is scoped to a neighborhood via `neighborhood_id`.
