# Critical/High Release Validation Plan

**Date:** 2026-07-19  
**Scope:** `main...HEAD` branch validation  
**Status:** Execution plan  
**Related:** [`docs/architecture/data-integrity-and-authorization.md`](../architecture/data-integrity-and-authorization.md), [`docs/plans/2026-07-19-approved-mutation-inventory.md`](2026-07-19-approved-mutation-inventory.md)

## Purpose

This plan covers only **critical** and **high-risk** changed behavior. Medium-risk visual polish and general UX checks are intentionally deferred.

The branch changes database authorization, RLS, named RPCs, membership and loan lifecycles, soft deletion, centralized tenant-scoped queries, staff operations, impersonation, protected mutations, and invite/growth behavior.

Validation proceeds in blocks:

```text
Local clean reset and automated contracts
        ↓
Local browser/server wiring and seeded smoke flows
        ↓
Dev/stage migration rehearsal and production-like authorization tests
        ↓
Production backup, migration, canary, and monitoring
```

Do not advance an environment until the applicable block exit criteria pass.

## Automation versus manual validation

### Automate

Automate deterministic behavior that can be asserted without human judgment:

- Unit/state-machine/validation behavior.
- RLS, grants, policies, indexes, constraints, and RPC return contracts.
- Cross-neighborhood isolation.
- Staff actor/effective-user authorization.
- Soft-delete and history preservation.
- Loan lifecycle and concurrency.
- Migration reset and upgrade checks.
- Server-action/API authorization and affected-row behavior.
- Browser route redirects and deterministic form outcomes.
- Targeted accessibility rules that axe or DOM assertions can prove.

### Manual

Use manual testing where behavior depends on deployment, device, operational judgment, or production observation:

- Real Supabase/Vercel deployment and schema-cache behavior.
- Staff provisioning in the target environment.
- Two-browser session and impersonation review.
- Mobile Safari/Chrome native share behavior.
- Email/notification delivery.
- Production canary and monitoring.
- Backup/restore and rollback decision-making.

### Hybrid

Most release validation is hybrid: automate database and API assertions, then manually verify the visible browser result and deployment behavior.

## Seed database strategy

The repository has two different seed mechanisms:

- `supabase/seed.sql` is intentionally empty and is not a usable test fixture.
- `supabase/seed.dev.sql` is an idempotent development/demo seed. It requires an Auth user with:
  - email: `demo@lakewoodblock.club`
  - password: `demo1234`

`seed.dev.sql` creates the `maplewood-heights` neighborhood with five active members, items, posts, a guide, and an active loan. It is appropriate for local browser smoke tests and exploratory manual testing.

It is **not sufficient by itself** for critical/high contract coverage because it does not provide all required roles, a second tenant, forged staff identities, concurrency setup, or threshold-specific fixtures.

Use this split:

| Test purpose | Fixture strategy |
|---|---|
| RLS/RPC/constraint/concurrency contracts | Existing isolated integration fixtures in `apps/web/src/test/integration/client.ts` |
| Local browser smoke and seeded page rendering | `supabase/seed.dev.sql` |
| Cross-tenant browser testing | Add/use a second isolated neighborhood and user |
| Staff/impersonation browser testing | Dedicated staff and target-user credentials |
| Stage/prod validation | Dedicated non-production/canary accounts and neighborhood; never shared demo data |

The integration suite should continue creating unique users/neighborhoods per test. Do not make it depend on the shared demo seed.

## Required test identities and data

For local/stage validation, provision as needed:

- Ordinary member and borrower.
- Neighborhood admin in tenant A.
- Ordinary/admin user in tenant B.
- Staff admin.
- Authenticated but unallowlisted staff-like user.
- User with no membership.
- User with pending membership.
- Moved-out user.
- At least one item owner and borrower with requested, approved, active, returned, and cancelled loans.
- Posts with reactions and pinned state.
- Soft-deleted item, post, membership, and loan records.

For threshold/growth testing, use separate disposable neighborhoods with counts below and at the relevant thresholds. This is not a release blocker unless the growth feature is included in the release, but it is included here because the branch changes invite surfaces and dashboard behavior.

# Block 1: Local repository and schema gates

**Risk:** Critical  
**Primary mode:** Automated  
**Purpose:** Prove the branch builds, migrations apply cleanly, and required database boundaries exist.

## Automated steps

From a clean working tree:

```bash
supabase start
supabase db reset --local

npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build:web

npm run check:database-boundaries
npm run check:static-inventory
npm run check:component-sizes
npm run check:doc-links
npm run check:finding-dispositions

git diff --check main...HEAD
```

Run integration tests through `npm run test:integration`; the preflight must be allowed to validate local Supabase and non-empty test discovery.

## Assertions

- Migrations `00022` through `00033` apply after a clean reset.
- Unit, integration, lint, typecheck, and build pass.
- Database inspection finds required indexes and ordinary RPCs.
- Staff-only functions have no `anon`, `authenticated`, or `public` grants.
- Deprecated broad loan update policy is absent.
- Ordinary hard-delete policies are absent.
- Static inventory and documentation gates pass.
- `git diff --check` passes or has an explicitly approved nonfunctional exception.

## Exit criteria

No unresolved build, schema, authorization-boundary, or repository-gate failure.

# Block 2: Local database authorization and tenant isolation

**Risk:** Critical  
**Primary mode:** Automated integration tests  
**Secondary mode:** Manual review of failure output  
**Purpose:** Prove that ordinary, admin, staff, anonymous, and cross-tenant callers cannot exceed their authority.

## Existing automated coverage to run and review

- `apps/web/src/test/integration/rls.characterization.integration.test.ts`
- `apps/web/src/test/integration/membership-moderation.integration.test.ts`
- `apps/web/src/test/integration/membership-rejoin.integration.test.ts`
- `apps/web/src/test/integration/move-out.integration.test.ts`
- `apps/web/src/test/integration/role-promotion.integration.test.ts`
- `apps/web/src/test/integration/query-layer.integration.test.ts`
- `apps/web/src/test/integration/item-removal.integration.test.ts`
- `apps/web/src/test/integration/post-rpc.integration.test.ts`

## Required scenarios

### Anonymous denial

Attempt anonymous invocation/read/write for:

- Loan lifecycle RPCs.
- Move-out.
- Membership moderation.
- Role promotion.
- Post/item mutation RPCs.
- Staff-only RPCs.

Expected: denied; no row or side effect changes.

### Authenticated ordinary-user denial

Attempt direct table mutations and staff RPCs as an authenticated browser user.

Expected:

- Staff commands return denial or are unavailable.
- Direct hard deletes fail.
- Direct lifecycle status changes fail.
- Immutable loan relationships cannot be changed.

### Cross-neighborhood isolation

With users and data in neighborhoods A and B, attempt reads and writes across:

- Items.
- Posts and reactions.
- Directory members.
- Loans.
- Memberships/pending members.
- Neighborhood settings.

Expected: no foreign-tenant data is returned or changed.

### Soft-delete isolation

Soft-delete item, post, membership, and loan records using the authorized path. Query through ordinary and centralized admin/query-layer paths.

Expected:

- Deleted records disappear from user-visible reads.
- History remains available where the contract permits it.
- Deleted rows cannot be resurrected by ordinary updates.

### Staff actor/effective-user checks

Test:

- Valid allowlisted actor and valid target.
- Unallowlisted actor.
- Inactive staff allowlist row.
- Forged effective user.
- Missing actor/target IDs.
- Browser-role invocation of staff RPC.

Expected: only valid service-role staff operations succeed; audit fields identify the correct staff actor and effective user.

## Exit criteria

All authorization denials are enforced at the database boundary, not only in application code. No cross-tenant read/write or staff escalation is observed.

# Block 3: Local loan lifecycle, concurrency, and history

**Risk:** Critical  
**Primary mode:** Automated integration tests  
**Secondary mode:** Manual database-state review  
**Purpose:** Prove the loan state machine, item availability, reservation uniqueness, and administrative closures.

## Happy-path automation

Run:

- `apps/web/src/test/integration/loan-rpc.integration.test.ts`
- Loan portions of `apps/web/src/test/integration/rls.characterization.integration.test.ts`

Assert:

```text
requested → approved → active → returned
```

At each step verify:

- Approval does not activate the loan.
- Activation sets `start_date` and item availability to `borrowed`.
- Return sets `returned_at`, closure reason, and availability correctly.
- Affected loan/item counts are correct.
- Notifications/revalidation are not represented as success before the RPC result succeeds.

## Negative automation

Reject or conflict on:

- Self-borrow.
- Non-member request.
- Cross-neighborhood request.
- Duplicate non-terminal reservation.
- Owner/borrower role misuse.
- Invalid state transition.
- Terminal loan resurrection.
- Immutable `item_id` or `borrower_id` mutation.
- Invalid notes or due-date values.
- Activation when item is no longer available.

## Concurrency automation

Run concurrent:

1. Duplicate requests for one item.
2. Two activation attempts.
3. Borrower cancellation versus owner activation.
4. Move-out/item removal versus loan lifecycle operation.

Expected:

- Deterministic one-winner/conflict outcomes.
- At most one non-terminal reservation per item.
- No impossible loan/item combinations.
- No orphaned active loan.
- Correct administrative closure reason where applicable.

## Manual review

After selected automated runs, inspect the final rows for:

- `status`.
- `availability`.
- `closure_reason`.
- `closed_by_user_id`.
- `returned_at`.
- `deleted_at`.

## Exit criteria

All state transitions and races produce valid, deterministic results with preserved history and consistent item availability.

# Block 4: Local membership, move-out, moderation, and staff operations

**Risk:** Critical  
**Primary mode:** Automated integration/API tests  
**Secondary mode:** Manual browser verification  
**Purpose:** Prove membership state transitions and privileged operations.

## Automated scenarios

### Move-out

Run `move-out.integration.test.ts` and verify:

- Own active membership can move out.
- Membership becomes `moved_out`.
- Owned items are soft-deleted.
- Requested/approved loans are cancelled with `administrative_move_out`.
- Active loans are administratively returned with the same reason.
- Unrelated/inactive/deleted memberships are rejected without side effects.

### Rejoin

Run `membership-rejoin.integration.test.ts` and verify:

- Only the owning user can rejoin.
- Only `moved_out` memberships qualify.
- Approval-required neighborhoods remain pending.
- Existing active memberships prevent invalid rejoin.
- Stale/missing rows do not report success.

### Membership moderation

Run `membership-moderation.integration.test.ts` and verify:

- Target neighborhood admin can approve/decline pending membership.
- Cross-neighborhood admin cannot moderate.
- Non-admin and anonymous callers are rejected.
- Decline preserves history through soft deletion.
- Repeated or invalid state operations return a clear failure.

### Staff membership operations

Test all operations through the staff command boundary:

- `add`
- `approve`
- `decline`
- `remove`
- `reactivate`
- `promote`
- `demote`

Verify immutable user and neighborhood identity fields, soft-delete behavior, affected-row counts, and `staff_actor_id` attribution.

### Neighborhood admin promotion

Run `role-promotion.integration.test.ts` and verify:

- Target-neighborhood admin can promote an active member.
- Ordinary members cannot promote.
- Cross-neighborhood admins cannot promote.
- Already-admin, inactive, deleted, and anonymous cases fail safely.

## Manual browser scenarios

Using the local app and seeded or dedicated accounts:

- Active member moves out through settings.
- Pending member is approved/declined through the admin UI.
- Admin promotes a member.
- Staff performs membership operation through the staff UI.
- Refresh after each operation and verify the visible status matches the database result.

## Exit criteria

Membership and staff transitions are atomic, correctly scoped, history-preserving, and visible in the browser without stale success states.

# Block 5: Local server-action/API and query-layer wiring

**Risk:** High  
**Primary mode:** Automated server/action/API tests where available  
**Secondary mode:** Manual browser flow  
**Purpose:** Prove application boundaries call the right database contracts and gate side effects correctly.

## Automated scenarios

Review all production mutation sites listed in `docs/plans/2026-07-19-approved-mutation-inventory.md`.

For each changed action/API route, verify:

- Authentication is required.
- Route neighborhood/target IDs are resolved authoritatively.
- Effective-user context is used when impersonating.
- Ownership/admin checks use authoritative database state.
- Update/delete predicates include tenant and non-deleted constraints.
- Exactly one affected row/result is required for success.
- Notifications, revalidation, redirects, and success responses occur only after success.

High-priority routes/actions:

- Library item create/edit/remove.
- Loan request and lifecycle actions.
- Posts/reactions/pin/update/delete.
- Join/rejoin.
- Pending membership moderation.
- Move-out.
- Role changes.
- Profile and notification settings.
- Neighborhood switching/settings.
- Staff membership APIs.

## Query-layer scenarios

Run `query-layer.integration.test.ts` and review every changed query helper for:

- Neighborhood predicate.
- Effective-user predicate where relevant.
- `deleted_at IS NULL` filtering.
- Correct joins and ordering.
- Empty-result behavior.

## Manual browser smoke

Use `supabase/seed.dev.sql` for the normal local browser account and verify:

- Dashboard loads.
- Directory, posts, library, loans, profile, and settings load.
- Demo active loan displays correctly.
- Item/post mutations show the expected result after refresh.
- Failed actions show an error and do not claim success.

The seeded demo is only five active members and does not exercise cross-tenant or staff cases; use dedicated accounts for those.

## Exit criteria

Changed server actions/API routes are demonstrably wired to the intended authorization boundary, and visible success/error states match the actual mutation result.

# Block 6: Local staff impersonation

**Risk:** Critical/high  
**Primary mode:** Automated integration plus Playwright where fixtures exist  
**Secondary mode:** Manual two-session browser validation  
**Purpose:** Prove actor/effective-user separation and prevent impersonation privilege leaks.

## Automated scenarios

Use existing integration staff tests and `apps/web/e2e/impersonation.spec.ts` where credentials are available.

Verify:

- Only allowlisted staff reaches `/staff`.
- Staff can begin and end impersonation.
- Non-staff cannot forge impersonation context.
- Impersonation context persists across navigation.
- Staff actor remains distinct from effective user.
- Staff-only operations record the real staff actor.
- Unsupported/destructive impersonated mutations are rejected where intentionally disabled.

## Manual two-browser scenario

1. Browser A: sign in as staff.
2. Browser A: impersonate target user.
3. Browser B: sign in as the target user normally.
4. Compare dashboard, neighborhood, profile, and available actions.
5. Perform one permitted mutation from Browser A.
6. Confirm the result as the target user in Browser B.
7. Exit impersonation in Browser A.

Expected:

- Browser A sees the target context with a clear banner.
- Browser B is unaffected as a session.
- The mutation applies only to the target context.
- Exiting returns staff to the staff panel.

## Exit criteria

No actor/effective-user confusion, target substitution, unauthorized staff access, or cross-session leakage.

# Block 7: Dev/stage migration and production-like validation

**Risk:** Critical  
**Primary mode:** Automated deployment/API/database checks  
**Secondary mode:** Manual operational and browser validation  
**Purpose:** Prove the branch works after deployment against a representative non-local database.

## Automated deployment checks

Against an isolated dev/stage Supabase project:

1. Capture a backup/restore point.
2. Apply migrations `00022`–`00033` to a representative pre-branch database.
3. Confirm migration version and schema cache availability.
4. Run database-boundary inspection using stage credentials.
5. Run API/RPC checks as anonymous, authenticated, and service-role clients.
6. Run protected Playwright tests with non-skippable credentials.
7. Run build/deployed smoke checks.

Do not point the default local integration run at a shared or production database. If using the integration harness against an isolated stage project, set the explicit complete credential triplet and intentionally enable non-local use.

## Migration upgrade scenarios

Validate with existing users and records:

- Active and returned loans.
- Existing deleted records.
- Existing memberships and posts/items.
- Existing staff users before synchronization.
- Existing records that are valid under the new constraints.

Expected:

- No data loss.
- No unexpected user lockout.
- No failed backfill.
- No missing RPC after schema reload.
- Existing valid records remain usable.

## Manual stage scenarios

Run as ordinary member, neighborhood admin, staff admin, impersonated target, pending user, and no-membership user:

- Sign in and protected-route redirects.
- Join/rejoin.
- Dashboard/directory/posts/library/loans.
- Loan lifecycle.
- Membership moderation.
- Role promotion.
- Staff impersonation.
- Profile/settings updates.
- Error and retry behavior.

Review application, Supabase, Vercel, and Sentry logs during each mutation.

## Exit criteria

The deployed stage environment passes schema, authorization, protected browser, and representative migration-upgrade checks without skipped required suites.

# Block 8: Production backup, canary, and observation

**Risk:** Critical  
**Primary mode:** Manual operational validation with automated smoke/monitoring  
**Purpose:** Safely validate production behavior without destructive tests against real user data.

## Pre-deploy requirements

- Backup/restore point confirmed.
- Migration order and forward-only implications reviewed.
- Canary neighborhood selected.
- Dedicated canary users and records identified.
- Staff admin synchronization plan reviewed.
- On-call and rollback decision owner assigned.
- No unresolved critical authorization or data-integrity failure.

## Production sequence

1. Apply migrations.
2. Confirm migration completion.
3. Reload schema cache if required.
4. Run grant/policy/function/index inspection.
5. Run staff synchronization.
6. Deploy the application.
7. Perform read-only canary checks.
8. Perform controlled canary mutations.
9. Monitor before broad rollout.

## Automated/read-only canary

Check:

- Public sign-in.
- Protected route access.
- Dashboard.
- Directory.
- Posts.
- Library.
- Loans.
- Profile/settings.
- Neighborhood switching.

Expected:

- No unexpected redirects.
- No cross-tenant records.
- No missing-column/schema-cache errors.
- No material 5xx increase.

## Manual controlled mutation canary

Using only dedicated canary records:

- Create/update one post.
- Create one item.
- Submit and approve one loan request.
- Perform one controlled membership moderation action.
- Perform one role promotion if operationally approved.
- Verify staff impersonation and exit.

For each action verify both visible browser result and database/audit state.

Do not test move-out, item removal, or destructive membership operations against real resident data. If those operations need production proof, prepare dedicated canary records and obtain explicit approval first.

## Observation window

Monitor:

- HTTP 4xx/5xx.
- Supabase RPC and PostgREST errors.
- Auth failures.
- RLS denial spikes.
- Query latency.
- Constraint violations.
- Notification failures.
- Sentry and Vercel errors.
- Staff authorization failures.
- Loan conflict/error rates.

## Exit criteria

Canary behavior is correct, no critical/high production regression is observed during the agreed observation window, and engineering/operations sign off on expansion.

# Stop-ship criteria

Stop advancement or roll back the application for any of the following:

- Cross-neighborhood data exposure.
- Unauthorized staff operation or forged actor acceptance.
- Browser invocation of staff-only RPC succeeds.
- Loan/item state inconsistency.
- Duplicate non-terminal item reservations.
- Partial move-out or membership operation.
- Terminal loan resurrection.
- Unexpected physical deletion of history.
- Migration data loss, constraint corruption, or broad user lockout.
- Impersonated mutation applies to the wrong user.
- Protected E2E suites silently skip because required fixtures are absent.
- Missing RPCs, grants, indexes, or schema-cache failures after deployment.
- Material increase in production 5xx/auth/database errors.

# Evidence and signoff

For each block record:

- Environment and Supabase project.
- Git SHA.
- Migration version.
- Commands/tests run.
- Pass/fail result.
- Fixture/account identifiers without secrets.
- Screenshots/traces for manual failures.
- Database before/after evidence for lifecycle mutations.
- Logs/monitoring links.
- Owner and signoff.

| Block | Result | Evidence | Owner | Signoff |
|---|---|---|---|---|
| 1. Local gates | **PASS with hygiene exception** | `supabase db reset --local`; lint; typecheck; unit: 11 files / 146 tests; integration: 10 files / 60 tests; build; database-boundary inspection; four repository gates | Execute facet | Pending operator acceptance of known docs whitespace exception |
| 2. Local authorization/isolation | | | | |
| 3. Loan lifecycle/concurrency | | | | |
| 4. Membership/staff operations | | | | |
| 5. Server-action/query wiring | | | | |
| 6. Impersonation | | | | |
| 7. Dev/stage | | | | |
| 8. Production canary | | | | |
