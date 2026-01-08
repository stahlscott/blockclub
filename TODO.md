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

## Current Status: Preparing for Initial Deployment

The web app is functional with core features (Directory + Lending Library). Preparing for first deployment to Vercel with real users.

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
- [x] Create database migration scripts (00001-00008)
- [ ] Set up storage buckets for profile photos and item images

### Phase 3: Authentication & User Management
- [x] Implement email/password authentication
- [x] Add invite-only registration (neighborhood admin approves new users)
- [x] Create user profile model (name, photo, bio, contact info)
- [x] Build neighborhood selection/switching UI for users in multiple neighborhoods
- [x] Build profile editing UI
- [ ] Add privacy controls to profile

### Phase 4: Resident Directory Feature
- [x] Create household/address model linked to neighborhood and users
- [x] Build directory list view (scoped to current neighborhood)
- [x] Create resident profile detail view
- [x] Add contact buttons (call, text, email)
- [ ] Add search/filter to directory

### Phase 5: Lending Library Feature
- [x] Design item model (name, description, category, photos, owner, availability, neighborhood_id)
- [x] Design loan model (item, borrower, dates, status)
- [x] Build item listing UI with categories
- [x] Create add/edit item form
- [x] Build request/approve loan workflow
- [x] Add loan status views (pending requests, active loans)
- [x] Add due date tracking and overdue highlighting
- [ ] Add photo upload for items
- [ ] Implement return reminders/notifications

### Phase 9: Admin & Moderation
- [x] Create admin/member roles at neighborhood level
- [x] Create super admin role (system-wide)
- [x] Build user approval/invitation workflow per neighborhood
- [x] Add neighborhood creation flow (super admin only)
- [x] Add ability to remove items (admin moderation)
- [x] Add ability to promote/demote members

---

## Pre-Deployment Tasks (Current Sprint)

### Critical (Must Fix)
- [ ] Fix middleware protection for all authenticated routes
- [ ] Move super admin emails to environment variable
- [ ] Add environment variable validation at startup

### Recommended (Should Fix)
- [ ] Abstract error logging into a module (prep for Sentry)
- [ ] Add input validation with max lengths and error messages
- [ ] Implement soft deletes for items, loans, and members

### Deployment
- [ ] Configure Vercel project
- [ ] Set environment variables in Vercel
- [ ] Configure Supabase for production (allowed redirect URLs)
- [ ] Wipe/reset Supabase database for clean start
- [ ] Test full user flow as non-admin

---

## Post-Launch Improvements

### High Priority
- [ ] Add image upload for items and avatars (Supabase Storage)
- [ ] Handle missing/broken images gracefully
- [ ] Email notifications via Resend
  - [ ] Set up Resend account and verify domain
  - [ ] Loan requested notification (to owner)
  - [ ] Loan approved/rejected notification (to borrower)
  - [ ] Item returned notification (to owner)
  - [ ] Due date reminders
- [ ] Add search/filter to directory
- [ ] Add pagination for large neighborhoods

### Medium Priority
- [ ] Use Next.js `<Image>` component for optimized images
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
*Note: Database schema exists, UI not implemented*

### Phase 7: Events & Gatherings Feature
- [ ] Build event creation form
- [ ] Create event list and calendar views
- [ ] Implement RSVP system with headcount
- [ ] Add event reminders/notifications
*Note: Database schema exists, UI not implemented*

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
└────────┬────────┘       │ primary_neighborhood_id
         │                └────────┬────────┘
         │    ┌─────────────────┐  │
         └───►│   memberships   │◄─┘
              ├─────────────────┤
              │ user_id         │
              │ neighborhood_id │
              │ role (admin/member)
              │ household_id    │
              │ status          │
              └─────────────────┘
                      │
              ┌───────▼───────┐
              │  households   │
              ├───────────────┤
              │ id            │
              │ neighborhood_id
              │ address       │
              └───────────────┘

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

| Capability | Super Admin | Neighborhood Admin | Member |
|------------|-------------|-------------------|--------|
| Create neighborhoods | ✅ | ❌ | ❌ |
| Automatic admin in all neighborhoods | ✅ | ❌ | ❌ |
| Approve/reject join requests | ✅ | ✅ (own neighborhood) | ❌ |
| Remove members | ✅ | ✅ (own neighborhood) | ❌ |
| Remove any item | ✅ | ✅ (own neighborhood) | Own only |
| Promote member to admin | ✅ | ✅ (own neighborhood) | ❌ |
| Demote admin to member | ✅ | ❌ | ❌ |
