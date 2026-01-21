# Block Club - Roadmap

Neighborhood community app. Live in production, onboarding initial users.

---

## Feature Roadmap

### LBC-1: Job Availability
Allow neighbors to post availability for services (childcare, pet sitting, snow shoveling, lawn mowing, etc.).

- [ ] Design job availability model (user, type, description, availability)
- [ ] Build UI for posting availability
- [ ] Create browsable list by category

### LBC-2: Mobile App
Native mobile app with push notifications. Waiting for beta feedback before starting.

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

### LBC-5: Staff admin page overhaul ✓
Redesign and improve the staff admin interface for better usability.

- [x] More functional sorting of users, grouping by neighborhoods, etc
- [x] Click into neighborhoods to get a list of neighborhood-specific users
- [x] Maybe a neighborhood level "act as admin" that impersonates the admin straight to their dashboard
- [x] Split into routes?

### LBC-6: "How To"/"Guide" Page
Community-curated list of important information - trash day, block party date, local resources, etc.

TODO: Define exact scope and features.
Name TBD. "Neighborhood Notes", "Community Highlights", etc.
The name itself could be a definable by the admin - "How To Detroit Ave", "Maple St. Guide", etc.

Is this community-editable, or admin-only? Or is that an admin choice?

---

## Future Considerations

Ideas to revisit based on user feedback.

- One-click texting/calling from the library/posts pages
- Marketplace (buy/sell/trade within neighborhood), "free page" for giving away items - modification of library?
- Network-wide messages / announcements
- Integration with Local Services (city alerts, public transport updates)
- Links to other neighborhood/local platforms (Nextdoor, Facebook Groups, Transit app)
- Events & Gatherings (RSVPs, calendar)

---

## Small Improvements

- [ ] Allow users to delete their own account
- [ ] Add pagination for large neighborhoods
- [ ] Implement loading skeletons
- [ ] Dark mode support

---

## Tech Debt

- [ ] Add environment variable validation at startup
- [ ] Activity/audit log
- [ ] Next.js 16 cache components (`use cache` directive)
- [ ] React 19 useActionState migration (profile-form, library/new, posts/new)
- [ ] **Migrate existing forms to useActionState pattern** - Forms currently use manual useState for error/loading state. Prefer useActionState for server action forms. See CLAUDE.md for the pattern.
- [ ] **Standardize API route return types** - Update existing API routes to use `ApiResult<T>` from `@blockclub/shared`. Currently routes return inconsistent shapes.
- [ ] **Migrate pages to use centralized query layer** - Replace inline Supabase queries with functions from `@/lib/queries`. Start with library page as reference.
- [ ] **Accessibility audit of existing components** - Run axe-core or Lighthouse on key pages. Prioritize: signin, dashboard, library. Add missing labels, fix contrast issues, ensure keyboard navigation.

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

- [x] Storybook component library
- [ ] CONTRIBUTING.md with development guidelines
- [ ] Configuration system for customization (name, logo, colors)
- [ ] Add screenshots to README [blocker: UI/UX pass]

---

## Performance & Bug Fixes

(Add items as they arise)
