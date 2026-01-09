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

## Current Status: Deployed to Production

The web app is live on Vercel with core features (Directory + Lending Library). Initial users are testing.

---

## Completed

### Phase 1: Project Setup & Architecture

- [x] Define tech stack (React Native/Expo for mobile, React for web, shared backend)
- [x] Set up monorepo structure (apps/web, apps/mobile, packages/shared)
- [x] Choose backend: Supabase (free tier, auth, DB, storage)
- [x] Set up GitHub repo
- [x] Create basic README

### Phase 2: Database Schema & Backend Setup

- [x] Design database schema with multi-neighborhood support
- [x] Design neighborhood model (name, slug, description, location, settings, created_by)
- [x] Design membership model (user + neighborhood + role)
- [x] Set up Supabase project with tables and relationships
- [x] Configure Row Level Security policies scoped to neighborhood membership
- [x] Create database migration scripts
- [x] Auto-create user profile on signup via database trigger
- [x] Set up storage buckets for profile photos and item images

### Phase 3: Authentication & User Management

- [x] Implement email/password authentication
- [x] Add invite-only registration (neighborhood admin approves new users)
- [x] Create user profile model (name, photo, bio, contact info)
- [x] Build neighborhood selection/switching UI for users in multiple neighborhoods
- [x] Build profile editing UI

### Phase 4: Resident Directory Feature

- [x] Create household/address model linked to neighborhood and users
- [x] Build directory list view (scoped to current neighborhood)
- [x] Create resident profile detail view
- [x] Add contact buttons (call, text, email)
- [x] Add search/filter to directory
- [x] Add sorting to directory
- [x] Add profile fields (address, move-in year, children, pets)
- [x] Mobile responsive profile page

### Phase 5: Lending Library Feature

- [x] Design item model (name, description, category, photos, owner, availability, neighborhood_id)
- [x] Design loan model (item, borrower, dates, status)
- [x] Build item listing UI with categories
- [x] Create add/edit item form
- [x] Build request/approve loan workflow
- [x] Add loan status views (pending requests, active loans)
- [x] Add due date tracking and overdue highlighting
- [x] Add photo upload for items
- [ ] Implement return reminders/notifications

### Phase 9: Admin & Moderation

- [x] Create admin/member roles at neighborhood level
- [x] Create super admin role (system-wide)
- [x] Build user approval/invitation workflow per neighborhood
- [x] Add neighborhood creation flow (super admin only)
- [x] Add ability to remove items (admin moderation)
- [x] Add ability to promote/demote members
- [x] Hide super admin from neighborhood member lists and counts

---

## Pre-Deployment Tasks (Completed)

### Critical (Must Fix)

- [x] Fix middleware protection for all authenticated routes
- [x] Move super admin emails to environment variable
- [ ] Add environment variable validation at startup

### Recommended (Should Fix)

- [x] Abstract error logging into a module (prep for Sentry)
- [x] Add input validation with max lengths and error messages
- [x] Implement soft deletes for loans and members (items use hard delete)

### Deployment

- [x] Configure Vercel project
- [x] Set environment variables in Vercel
- [x] Configure Supabase for production (allowed redirect URLs)
- [x] Wipe/reset Supabase database for clean start
- [x] Test full user flow as non-admin

---

## Next Priority

- [x] Add image upload for items and avatars (Supabase Storage)
  - [x] Handle missing/broken images gracefully
  - [x] Use Next.js `<Image>` component for optimized images
- [ ] Neighborhood Links Page / Bulletin Board
  - [ ] Create links table (neighborhood_id, title, url, order, created_by)
  - [ ] Build links list view on neighborhood page
  - [ ] Add admin UI to add/edit/remove/reorder links
  - [ ] Use cases: Facebook group, HOA website, local resources, etc.
- [ ] Set up Resend for transactional emails (requires custom domain)
  - [ ] Create Resend account and verify domain
  - [ ] Configure Supabase SMTP settings to use Resend
  - [ ] Re-enable email confirmation for signup
  - [ ] Loan requested notification (to owner)
  - [ ] Loan approved/rejected notification (to borrower)
  - [ ] Item returned notification (to owner)
  - [ ] Due date reminders

## Post-Launch Improvements

### High Priority

- [ ] Add pagination for large neighborhoods
- [ ] Allow users to delete their own account
- [ ] Allow users to remove themselves from a neighborhood (e.g., moved away)

### Medium Priority

- [ ] Add error boundaries around critical components
- [ ] Implement proper loading skeletons
- [ ] Add onboarding flow for new users

### Lower Priority

- [ ] Dark mode support
- [ ] Activity/audit log

---

## Future Features (Deferred)

### Phase 6: Childcare Availability Feature

- [ ] Build calendar view for posting availability
- [ ] Create request/booking system for childcare
- [ ] Add messaging between parents for coordination
      _Note: Database schema exists, UI not implemented_

### Phase 7: Events & Gatherings Feature

- [ ] Build event creation form
- [ ] Create event list and calendar views
- [ ] Implement RSVP system with headcount
- [ ] Add event reminders/notifications
      _Note: Database schema exists, UI not implemented_

### Phase 8: Notifications & Messaging

- [ ] Set up push notifications (Expo for mobile)
- [ ] Implement in-app notification center
- [ ] Consider simple direct messaging between neighbors

### Phase 10: Mobile App

- [ ] Build and submit iOS app to App Store
- [ ] Build and submit Android app to Play Store

### Phase 11: Open Source Preparation

- [ ] Write comprehensive README with features and screenshots
- [ ] Create CONTRIBUTING.md with development guidelines
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
└────────┬────────┘       │ address         │
         │                │ unit            │
         │                │ move_in_year    │
         │                │ children        │
         │                │ pets            │
         │                │ primary_neighborhood_id
         │                └────────┬────────┘
         │    ┌─────────────────┐  │
         └───►│   memberships   │◄─┘
              ├─────────────────┤
              │ user_id         │
              │ neighborhood_id │
              │ role (admin/member)
              │ status          │
              └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     items       │       │     loans       │
├─────────────────┤       ├─────────────────┤
│ id              │◄──────│ item_id         │
│ neighborhood_id │       │ borrower_id     │
│ owner_id        │       │ status          │
│ name            │       │ start_date      │
│ category        │       │ due_date        │
│ availability    │       │ returned_at     │
│ deleted_at      │       │ deleted_at      │
└─────────────────┘       └─────────────────┘
```

All content (items, events, childcare) is scoped to a neighborhood via `neighborhood_id`.

---

## Admin Roles

| Capability                           | Super Admin | Neighborhood Admin    | Member   |
| ------------------------------------ | ----------- | --------------------- | -------- |
| Create neighborhoods                 | ✅          | ❌                    | ❌       |
| Automatic admin in all neighborhoods | ✅          | ❌                    | ❌       |
| Approve/reject join requests         | ✅          | ✅ (own neighborhood) | ❌       |
| Remove members                       | ✅          | ✅ (own neighborhood) | ❌       |
| Remove any item                      | ✅          | ✅ (own neighborhood) | Own only |
| Promote member to admin              | ✅          | ✅ (own neighborhood) | ❌       |
| Demote admin to member               | ✅          | ❌                    | ❌       |
