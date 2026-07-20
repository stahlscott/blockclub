# Codebase Panel Review Follow-up — 2026-07-14

Independent whole-repository adversarial panel review (report-only), run after and compared against `docs/reviews/2026-07-14-codebase-panel-review.md`. This report is a separate adjudication; the earlier report was treated as an untrusted reviewer artifact, not as source-of-truth.

**Scope:** entire current `blockclub` repository at `/Users/scottstahl/code/blockclub`, branch `main`, not a diff. The working tree had only the pre-existing untracked `docs/reviews/` directory; no source files were changed by the review.

**Standards loaded:** root `CLAUDE.md`, `apps/web/CLAUDE.md`, and `packages/shared/CLAUDE.md`. No separate `docs/coding-standards.md` was present. Relevant explicit requirements include neighborhood scoping/RLS, soft-delete filtering, centralized queries, server-side authorization, shared loan permissions/state machine, accessible controls, CSS tokens, component size limits, and authorization tests.

## Panel and method

The requested `panel-review` procedure was found at `~/work/.polytoken/skills/panel-review/SKILL.md` and followed, with the full-repository scope explicitly requested by the operator rather than a branch diff.

Completed read-only lanes:

1. Default-full correctness lane: **started but failed to produce a terminal result**; the first run was cancelled after extended investigation, and a retry was cancelled after an internal tool-batch error. Its interim claims were retained only where independently verified.
2. Default-full broad generalist: completed.
3. `zai/glm-5.2` broad diversity generalist: completed.
4. Default-mini standards/accessibility/maintainability lane: completed.
5. `zai/glm-5.2` tests/performance/data-access backstop: completed.

Reviewer output was independently checked against current source and migrations. Agreement across lanes was used as supporting evidence, not as a substitute for verification.

## Executive disposition

The previous report's central security and data-integrity concerns are substantially confirmed. The most urgent cluster is still:

1. self move-out/rejoin writes are not covered by membership RLS policies and are treated as successful when they affect zero rows;
2. move-out and deletion paths hard-delete records despite the soft-delete schema, with item deletion cascading into loan history;
3. loan lifecycle actions trust client-supplied IDs, omit ownership/state checks, and fire item updates, notifications, revalidation, and success responses after writes that may have affected zero rows;
4. the owner loan UPDATE policy has no `WITH CHECK`, allowing direct browser writes to forge arbitrary loan statuses;
5. impersonated staff views and interactive mutations do not consistently use the effective user context.

One prior finding is rebutted: **F12**, the blank dashboard for users without a neighborhood, is unreachable for ordinary users because the protected layout redirects them to `/waiting` or `/get-started`. **F8 remains real**, but its explanation is stale: migration `00012_bulletin_rls_fix.sql` fixed the post soft-delete policy, so hard deletion is no longer justified by the cited RLS problem.

## Critical findings

### C1 / F1 — Move-out can report success, leave membership active, and destroy items and loan history
`apps/web/src/app/api/memberships/[id]/move-out/route.ts:69-104`; `supabase/migrations/00001_initial_schema.sql:314-369, 118`

The route permits self move-out, but the schema has only an admin membership UPDATE policy. The UPDATE checks only `error`, so an RLS-blocked update can return no error and affect zero rows. The route then hard-deletes the target user's items, ignores item deletion failure, and returns success. `loans.item_id` has `ON DELETE CASCADE`, so item deletion can permanently remove loan history while the membership remains active.

**Disposition:** `real` — confirmed by all completed lanes and direct source/migration inspection.

**Fix:** Add a narrow self-move-out policy or use an authorized server-side operation; verify returned affected rows before proceeding; soft-delete items and handle dependent loans deliberately; do not return success after a zero-row mutation.

## Important findings

### I1 / F2 — Rejoin for moved-out members silently no-ops
`apps/web/src/app/join/[slug]/page.tsx:163-177`; `supabase/migrations/00001_initial_schema.sql:314-325`

The browser client updates a moved-out membership without a covering self-update policy. The code checks only `updateError`, then redirects to `/dashboard`; a zero-row RLS result is treated as success and the status remains `moved_out`.

**Disposition:** `real` — confirmed.

**Fix:** Add a narrowly constrained self-rejoin policy or a server action with explicit ownership/state validation, and require an affected-row check.

### I2 / F3 + N1 — Loan approval/return actions trust form IDs and perform side effects after unconfirmed writes
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/loan-actions.ts:24-79, 136-188`

`loanId`, `itemId`, and `slug` come from form data. The actions never fetch the authoritative loan, never cross-check `loan.item_id` against `itemId`, and never verify caller ownership or the current loan state. They check only `error` on the loan and item updates. Consequently, an RLS-blocked or mismatched loan update can still be followed by an item update, notification, `revalidatePath`, and `{ success: true }`. This creates split-brain item/loan state and forged or misleading emails.

**Disposition:** `real` — confirmed by all completed lanes and direct inspection.

**Fix:** Fetch the loan server-side; derive the item ID from that row; use `canManageLoanRequest`/`canMarkLoanReturned`; enforce `canTransitionLoan`; update atomically or compensate safely; verify returned rows before item updates, notifications, revalidation, or success.

### I3 / N2 — Owner loan UPDATE policy permits arbitrary direct status changes
`supabase/migrations/00001_initial_schema.sql:402-410`

The `Owners can update loan status` policy has a `USING` predicate proving only that the caller owns the item. It has no `WITH CHECK`, and it does not constrain changed columns or status transitions. An item owner can therefore use the browser client to set arbitrary loan statuses, including resurrecting terminal loans or setting inconsistent states, outside the application state machine.

**Disposition:** `real` — independently confirmed; this is a distinct database-level exposure beyond the server-action issue.

**Fix:** Replace the broad policy with narrowly defined transition policies/RPCs, add a `WITH CHECK` constraint where appropriate, or route lifecycle writes through validated server actions and remove the unrestricted owner update path.

### I4 / F4 — Borrower can invoke decline and receive a misleading decline notification
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/loan-actions.ts:87-128`; `supabase/migrations/00001_initial_schema.sql:412-415`

`declineLoan` authenticates only that a user exists and updates by client-supplied loan ID. It does not require the caller to be the item owner. The borrower-facing cancellation policy can permit the borrower to affect a requested loan, while the action sends the decline notification and reports success.

**Disposition:** `real` — confirmed.

**Fix:** Make decline owner-only and add a separate borrower `cancelLoan` action with distinct messaging and state checks.

### I5 / F5 — Loan actions bypass the shared state machine
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/loan-actions.ts:49-56`; `packages/shared/src/loans.ts` and its tests

The shared `canTransitionLoan`, `getNextLoanStatus`, and permission helpers exist and are unit-tested, but the web loan actions do not call them. Approval writes `active` and fresh dates without checking current state; terminal or invalid loans can be re-approved.

**Disposition:** `real` — confirmed.

**Fix:** Use the shared state machine and permission helpers in the mutation path, with tests around each server action.

### I6 / F6 — Owners can request loans for their own items
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/actions.ts:37-78`; `supabase/migrations/00001_initial_schema.sql:390-400`

`requestLoan` checks item existence and availability but does not enforce `item.owner_id !== borrower_id`. The UI guard is not a server-side authorization boundary, and the insert policy also lacks an owner exclusion.

**Disposition:** `real` — confirmed.

**Fix:** Reject self-borrowing in the action and optionally add the invariant to the INSERT policy.

### I7 / F7 — Posts query exposes soft-deleted posts to staff/admin views
`apps/web/src/app/(protected)/neighborhoods/[slug]/posts/page.tsx:17-31`

The query relies on RLS to hide deleted rows, but `getNeighborhoodAccess` can supply an admin client that bypasses RLS. There is no explicit `.is("deleted_at", null)`.

**Disposition:** `real` — confirmed.

**Fix:** Add the explicit predicate or use the centralized query function.

### I8 / F9 — Member profile query exposes soft-deleted items to staff/admin views
`apps/web/src/app/(protected)/neighborhoods/[slug]/members/[id]/page.tsx:50-57`

The item query scopes by owner and neighborhood but omits `deleted_at`. Admin-client access bypasses the RLS read filter.

**Disposition:** `real` — confirmed.

**Fix:** Add `.is("deleted_at", null)` or use the centralized item query.

### I9 / F8 + F10 — Item and post deletion hard-delete records despite soft-delete design
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/owner-actions.tsx:124-149`; `admin-actions.tsx:20-40`; `posts/posts-client.tsx:105-129`; `supabase/migrations/00001_initial_schema.sql:118`

Item deletion permanently removes records and can cascade into loan history. Post deletion permanently removes records and related reactions. The post code comments that soft delete was failing due to RLS, but `00012_bulletin_rls_fix.sql` subsequently fixed the UPDATE policy; that explanation is stale.

**Disposition:** `real` for the hard-delete behavior; the prior RLS-workaround premise is `rebutted`.

**Fix:** Soft-delete items and posts, preserve history/reactions, and cancel or resolve active/requested loans before removing an item from circulation.

### I10 / F11 — My Loans is not neighborhood-scoped
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/loans/page.tsx:17-37`

The query does not select or filter `neighborhood_id`. The JavaScript filter only removes rows with no owner, despite a comment claiming neighborhood filtering. A user with memberships in multiple neighborhoods can see loans from other neighborhoods.

**Disposition:** `real` — confirmed.

**Fix:** Filter by the current neighborhood in SQL or select the neighborhood ID and filter against the current route context.

### I11 / F14 — Centralized query functions are dead architecture
`apps/web/src/lib/queries/*`; `apps/web/src/lib/supabase/queries.ts`

The query modules implement soft-delete/scoping-aware functions, but application pages and actions continue to use inline queries. Only exports, documentation, and the deprecated shim reference the query functions; the types remain used.

**Disposition:** `real` — confirmed, with the narrower statement that the **functions** are dead while some query-layer types are still used.

**Fix:** Migrate reads through the centralized layer and add tests for its guarantees, then remove the deprecated shim; or delete unused function abstractions rather than retaining misleading architecture.

### I12 / N3 — `switchNeighborhood` accepts an arbitrary neighborhood ID
`apps/web/src/app/actions/neighborhood.ts:9-35`

The action writes a client-supplied `neighborhoodId` to the current/effective user's profile without verifying active membership in that neighborhood. Per-page access checks limit direct data exposure, but the stored primary-neighborhood pointer can reference an unrelated neighborhood and produce inconsistent routing/dashboard state.

**Disposition:** `real` — confirmed.

**Fix:** Verify an active, non-deleted membership for the effective user before updating the profile.

### I13 / N4–N5 — Several client mutations treat RLS-blocked zero-row writes as success
`owner-actions.tsx:74-149`; `posts-client.tsx:62-149`

Due-date, item availability, post pin, reaction, and deletion paths generally check only `error`. RLS can return no error with zero rows; handlers then refresh or navigate as if the operation succeeded. This repeats the cross-cutting false-green mutation problem outside the loan actions.

**Disposition:** `real` — confirmed for the cited paths; severity is Important when it can create state confusion or destructive false success, otherwise Minor per individual path.

**Fix:** Request returned rows/counts and handle zero-row results as authorization/conflict failures. Use server actions/API routes for sensitive mutations.

### I14 / N9 — Impersonated staff views and mutations use different identities
`apps/web/src/lib/auth-context.ts:56-85`; `apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/owner-actions.tsx:74-149`; `loan-actions.ts:38-74`

Server-rendered pages can use `getAuthContext()` to query as the effective/impersonated user through an admin client. Interactive components create the ordinary browser client, and the loan server actions call `createClient()` without `getAuthContext()`. A staff member acting as another user can therefore see target-user data while client/server mutations authenticate as the staff account, causing rejected or incorrectly attributed actions and inconsistent UI.

**Disposition:** `real` — surfaced by the correctness lane and independently verified in the cited paths.

**Fix:** Define a single impersonation-aware mutation boundary. Sensitive server actions should use `getAuthContext()` with explicit staff/impersonation authorization; client mutations should call those actions/API routes rather than issuing direct browser writes.

## Minor and maintenance findings

### M1 / F13 — `declineMembership` and `removeMembership` are identical
`apps/web/src/app/(protected)/staff/neighborhoods/[slug]/actions.ts:37-91`

Both set `inactive` and `deleted_at` identically, making the product distinction unclear.

**Disposition:** `real` — confirmed.

### M2 / F15 — Post image URLs are accepted without origin validation
`apps/web/src/app/(protected)/neighborhoods/[slug]/posts/actions.ts:63`; edit flow at `posts/[postId]/edit/page.tsx`

User-supplied image URLs are stored without restricting them to the app's storage origin. The unvalidated external URL is a real content/security boundary issue; the earlier report's tracking-pixel/SSRF wording is stronger than the source alone proves.

**Disposition:** `real`, with the impact claim narrowed — confirmed as unvalidated URL storage, not fully confirmed as SSRF.

**Fix:** Accept only URLs generated by the application's storage flow or validate origin/protocol against an allowlist.

### M3 / F16–F18/F32 — Multiple components exceed the 300-line guideline
`dashboard/page.tsx` (677 lines), `profile/profile-form.tsx` (548), `settings/SettingsClient.tsx` (384), `staff/.../member-list.tsx` (379); additional large client components also exist.

**Disposition:** `real` — confirmed against the explicit project limit.

**Fix:** Extract data loading, form sections, dialogs, list rows, and presentational components with focused tests.

### M4 / F19 — Profile creation is duplicated in both join flows
`apps/web/src/app/join/[slug]/page.tsx:80-87`; `apps/web/src/app/(protected)/neighborhoods/[slug]/join/page.tsx:84-91`

Both inline profile creation instead of using `ensureUserProfile()`. Migration `00003` also auto-creates profiles, so the duplication is redundant and potentially racy.

**Disposition:** `real` — confirmed; refined as redundant/racy rather than strictly required for correctness.

### M5 / F20 — Native confirmation dialogs remain in destructive flows
Nine `confirm()`/`window.confirm()` sites remain across item, post, settings, membership, role, and staff-member actions.

**Disposition:** `real` — confirmed against the project guidance forbidding native dialogs.

**Fix:** Use the existing Radix dialog/modal confirmation pattern.

### M6 / F28 — Middleware protection is incomplete
`apps/web/src/lib/supabase/middleware.ts:38-42`

The protected-route list omits `/settings`, `/staff`, and `/api/**`. Current pages/routes perform their own checks, so this is not an independently demonstrated authorization bypass, but it is uneven defense-in-depth and a future-route hazard.

**Disposition:** `real`, low direct impact — confirmed as convention drift, not a demonstrated vulnerability.

### M7 / F29 — Loan notes lack server-side length validation
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/actions.ts:20`; `apps/web/src/lib/validation.ts` / shared validation

The request action stores notes without a `MAX_LENGTHS`/server validation rule.

**Disposition:** `real` — confirmed.

### M8 / N6 — Repeated `as never` casts bypass typed mutation payloads
Eight occurrences appear in web mutation code, including staff membership and admin API updates.

**Disposition:** `real` — confirmed as a type-safety/maintenance issue, though distinct from the explicitly banned `as unknown as T` pattern.

**Fix:** Correct generated/shared database types or define explicit update payload interfaces.

### M9 / N7 — `any` typing remains in loan display/data paths
`apps/web/src/app/(protected)/neighborhoods/[slug]/library/loans/page.tsx:26,70,116` and locally re-declared post shapes.

**Disposition:** `real` — confirmed; adopting the query-layer types would address part of this.

## Low findings and nits

- **F21 — Search input lacks an accessible label:** `real`, `Important`/accessibility. `library-client.tsx:90-99` has a placeholder/test ID but no associated label or `aria-label`.
- **F22 — Heart reaction lacks accessible name/pressed state:** `real`, `Minor`. `posts-client.tsx:331-339` uses title/visual state without `aria-label` and `aria-pressed`.
- **F23 — Raw membership enum is shown to users:** `real`, `Minor`. `join/[slug]/page.tsx:285-292` renders database status text without human mapping or next step.
- **F24 — Unused `SaveGuideData.userId`:** `real`, `Nit`. `guide/actions.ts:13-16` declares but does not use it.
- **F25 — Debug membership `console.log`:** `real`, `Nit`. `staff/neighborhoods/[slug]/page.tsx:64`.
- **F26 — Deprecated Supabase query shim still has consumers:** `real`, `Minor`. `layout.tsx` and email notifications still use `@/lib/supabase/queries`; migrate and remove the shim after call-site migration.
- **F27 — `lib/timing.ts` is unused:** `real`, `Nit`.
- **F30 — Supabase test mock is unused:** `real`, `Nit`.
- **F31 — Integration test command runs no integration tests:** `real`, `Important` for false-green coverage. The config and setup exist, but no `*.integration.{test,spec}.ts` files were found.
- **F33 — Dashboard stat icon colors use hardcoded hex values:** `real`, `Nit`.
- **F34 — Dashboard empty-state copy is passive:** `real`, `Nit` relative to the design guidance.
- **F35 — Waiting-page “Check again” does not set expectations:** `real`, `Nit`; it silently returns/bounces without explaining what changed or what the user should expect.
- **F37 — Literal `border-radius: 6px`:** `real`, `Nit` relative to the token rule.
- **F38 — Inline `marginLeft: "8px"`:** `real`, `Nit` relative to the spacing-token rule.

## Prior-report disposition matrix

| ID | Disposition in this review | Evidence / qualification |
|---|---|---|
| F1 | Confirmed | Missing self-update policy; zero-row update followed by hard item delete and cascade. |
| F2 | Confirmed | Rejoin update lacks policy and affected-row check. |
| F3 | Confirmed | Client IDs, no authoritative loan/authz check, side effects after unconfirmed writes. |
| F4 | Confirmed | Decline action has no owner check. |
| F5 | Confirmed | Shared state machine exists but is not used by web actions. |
| F6 | Confirmed | No server-side owner exclusion on loan request. |
| F7 | Confirmed | Posts admin-client query omits soft-delete predicate. |
| F8 | Confirmed, premise corrected | Hard delete is real; `00012` means the stated RLS workaround is stale. |
| F9 | Confirmed | Member-profile item query omits soft-delete predicate. |
| F10 | Confirmed | Item hard deletes cascade into loans. |
| F11 | Confirmed | No neighborhood selection/filter; comment is false. |
| F12 | Rebutted | Protected layout redirects no-active-membership users to `/waiting` or `/get-started`; dashboard blank branch is not reached for ordinary users. |
| F13 | Confirmed | Decline/remove membership actions are byte-identical. |
| F14 | Confirmed, narrowed | Query functions are unused; query-layer types are not all dead. |
| F15 | Confirmed, impact narrowed | Arbitrary image URL storage is real; tracking-pixel/SSRF impact is not fully established from source alone. |
| F16 | Confirmed | Dashboard is 677 lines and duplicates avatar-color logic. |
| F17 | Confirmed | `profile-form.tsx` is 548 lines. |
| F18 | Confirmed | `SettingsClient.tsx` is 384 lines. |
| F19 | Confirmed, refined | Duplicate profile creation is redundant/racy; migration trigger also creates profiles. |
| F20 | Confirmed | Native confirmation dialogs remain in the cited destructive flows. |
| F21 | Confirmed | Search input has no programmatic label. |
| F22 | Confirmed | Heart control lacks accessible name/pressed state. |
| F23 | Confirmed | Raw DB status enum is rendered. |
| F24 | Confirmed | `userId` is unused. |
| F25 | Confirmed | Debug `console.log` remains. |
| F26 | Confirmed | Deprecated shim still has application consumers. |
| F27 | Confirmed | Timing utility has no call sites. |
| F28 | Confirmed | Primary-neighborhood write lacks membership validation; middleware omission is an additional concern. |
| F29 | Confirmed | Loan notes lack server-side length validation. |
| F30 | Confirmed | Supabase mock has no test consumers. |
| F31 | Confirmed | Integration scaffolding has no integration tests. |
| F32 | Confirmed | `member-list.tsx` is 379 lines. |
| F33 | Confirmed | Dashboard uses hardcoded stat colors. |
| F34 | Confirmed | Passive dashboard empty-state copy remains. |
| F35 | Confirmed | Waiting-page retry flow lacks expectation-setting copy. |
| F36 | Rebutted as stated | The cited shadow values are repeated rather than a distinct third value; tokenization drift remains a minor concern. |
| F37 | Confirmed | Literal radius bypasses the token. |
| F38 | Confirmed | Literal inline spacing bypasses the token. |

## New findings from this panel

| ID | Severity | Disposition | Summary |
|---|---|---|---|
| N1 | Important | Real | Loan actions revalidate, notify, and return success after zero-row writes. Folded into I2. |
| N2 | Important | Real | Owner loan UPDATE policy lacks `WITH CHECK`; folded into I3. |
| N3 | Important | Real | `switchNeighborhood` accepts arbitrary neighborhood IDs; folded into I12. |
| N4 | Minor/Important by path | Real | Post pin/reaction writes treat RLS-blocked zero rows as success; folded into I13. |
| N5 | Minor/Important by path | Real | Owner due-date/availability writes check only `error`; folded into I13. |
| N6 | Minor | Real | Repeated `as never` casts; folded into M8. |
| N7 | Minor | Real | Pervasive `any` in data display; folded into M9. |
| N8 | Nit | Real | Middleware omits several protected prefixes; included in M6. |
| N9 | Important | Real | Impersonation-aware reads and ordinary-session mutations diverge; included in I14. |

## Verification and remaining risk

Completed panel lanes reported:

- `npm run typecheck`: passed for shared, mobile, and web.
- `npm run test:unit`: passed, 263 tests total (133 shared, 130 web).
- `npm run lint`: failed with one current error: unused `isImpersonating` in `apps/web/src/app/(protected)/layout.tsx:18`.

No fixes were applied, so no post-fix verification was run. The findings remain report-only. The most valuable next verification work is targeted authorization/RLS integration coverage for move-out/rejoin and every loan transition, including zero-row mutations, impersonation, cross-neighborhood access, soft-delete visibility, and direct browser writes against the owner loan policy.
