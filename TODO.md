# Block Club - Roadmap

Neighborhood community app. Live in production, onboarding initial users.

---

## Contribution Request

Professional UI/UX designer to help refine the look and feel of the app. If interested, please reach out to
hello@lakewoodblock.club!

## Feature Roadmap

### LBC-1: Job Availability
Allow neighbors to post availability for services (childcare, pet sitting, snow shoveling, lawn mowing, etc.).

- [ ] Design job availability model (user, type, description, availability)
- [ ] Build UI for posting availability
- [ ] Create browsable list by category

### LBC-2: Mobile App
Native mobile app with push notifications. Waiting for beta feedback before starting.
Blocker: UI/UX pass

- [ ] Authentication with secure token storage
- [ ] Core features: Dashboard, Directory, Library, Posts, Profile
- [ ] Push notifications (Expo)
- [ ] App Store / Play Store submission

### LBC-3: Scheduled Tasks Infrastructure
Build foundation for background jobs (cron) to enable time-based features.

- [ ] Evaluate options: Vercel Cron, Supabase pg_cron, or external service
- [ ] Implement scheduled task runner with logging/monitoring
- [ ] Add loan due date reminder emails (1 day before, day of)
- [ ] Add reminder preferences to notification settings

---

## Future Considerations

Ideas to revisit based on user feedback.

- One-click texting/calling from the library/posts pages
- Marketplace (buy/sell/trade within neighborhood), "free page" for giving away items - modification of library?
- Network-wide messages / announcements
- Integration with Local Services (city alerts, public transport updates)
- Links to other neighborhood/local platforms (Nextdoor, Facebook Groups, Transit app)
- Events & Gatherings (RSVPs, calendar)
- Dark mode - blocker: UI/UX pass

---

## Small Improvements

- [ ] Implement loading skeletons
- [ ] Dark mode support
- [ ] Allow users to delete their own account
- [ ] Add onboarding flow for new users
- [ ] Add pagination for large neighborhoods

---

## Tech Debt

- [ ] Add environment variable validation at startup
- [ ] Activity/audit log
- [ ] Next.js 16 cache components (`use cache` directive)
- [ ] React 19 useActionState migration (profile-form, library/new, posts/new)

---

## E2E Test Flows Needed

Currently only auth flows are covered. Prioritized by user impact.

### High Priority

- [ ] **Lending Library: Browse & Request** - Core feature; users browsing items and requesting to borrow
- [ ] **Lending Library: Owner Actions** - Approve/decline/return; completes the core borrowing loop
- [ ] **Posts: View & Create** - Second core feature; community communication
- [ ] **Join Flow** - Critical for growth; new users joining via invite link

### Medium Priority

- [ ] **Dashboard** - First thing users see after login
- [ ] **Directory: Browse & View Profile** - Core community feature
- [ ] **Profile: Edit** - Users need to set up their profile
- [ ] **Sign Up** - New user registration flow

---

## Developer Experience

- [ ] Storybook component library
- [ ] CONTRIBUTING.md with development guidelines
- [ ] Configuration system for customization (name, logo, colors)
- [ ] Add screenshots to README

---

## Performance & Bug Fixes

(Add items as they arise)
