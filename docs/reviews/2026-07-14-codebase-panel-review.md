# Codebase Panel Review — 2026-07-14

Adversarial panel sweep of the entire codebase (adapted from the `panel-review` skill
for whole-repo scope). Panel: two overlapping generalists + dedicated security,
architecture, cleanup, and UX lenses; every raw finding re-verified against the actual
files by a team-lead adjudicator. 51 raw findings → 38 confirmed, 0 rebutted.

**Report-only run — nothing has been fixed.** Line numbers are as of commit `089dca1`.

## Cross-cutting themes

Three root patterns generate most of the serious findings:

1. **RLS silent failure treated as success.** Supabase returns `error: null` with 0 rows
   affected when RLS blocks a write. Code throughout the app checks only `error`, so
   blocked writes are reported to the user as success — and side effects (item deletion,
   notification emails, redirects) fire anyway. Underlies F1, F2, F3.
2. **Hard deletes despite a soft-delete schema.** `deleted_at` exists and all read
   queries filter on it, but items and posts are hard-deleted in several paths,
   cascading into loan history via FK. Underlies F1, F8, F10.
3. **Server actions trust the client and skip authorization.** Loan lifecycle actions
   rely on RLS alone (which fails silently) instead of checking ownership/state with the
   shared permission helpers that already exist in `@blockclub/shared`. Underlies F3–F6.

Plus one big architectural gap: the centralized query layer mandated by CLAUDE.md is
**entirely unused** (F14) — every page uses inline queries, which is exactly how the
missing soft-delete filters (F7, F9) crept in.

---

## Critical

### F1 — Move-out silently fails, then permanently deletes the user's items
`apps/web/src/app/api/memberships/[id]/move-out/route.ts:70-88` (generalist-opus)

Self-initiated move-out's membership UPDATE is silently blocked by RLS (only an
admin-update policy exists), but execution continues to hard-delete all the user's
items (allowed by the owner-delete policy), cascading into loan history. The route
returns success while the membership stays `active` and the items are gone.

**Fix:** Add a self-move-out RLS UPDATE policy; soft-delete items instead of
`.delete()`; verify affected-row count (`.select('id')`) before proceeding.

## High

### F2 — Rejoin flow for moved-out members can never succeed
`apps/web/src/app/join/[slug]/page.tsx:163` (generalist-opus)

Browser-client UPDATE on `memberships` has no covering RLS policy; it silently affects
0 rows, then the code redirects to /dashboard as if it worked. Status never leaves
`moved_out`.

**Fix:** Narrow RLS policy for self-rejoin (or server action with admin client +
ownership validation); check affected-row count.

### F3 — Loan approve/return: no authz, client-supplied itemId, forged notification emails
`.../library/[id]/loan-actions.ts:47` (generalist-opus)

`loanId` and `itemId` from formData are never cross-validated; RLS-blocked loan updates
don't stop the item update or the notification, so a non-owner can put items into
split-brain state and trigger approval/return emails to neighbors.

**Fix:** Fetch the loan server-side for the authoritative `item_id`; verify caller via
`canManageLoanRequest`/`canMarkLoanReturned` from `@blockclub/shared`; gate
notifications on a confirmed row mutation.

### F7 — Posts page relies on RLS for soft-delete filtering; staff admins see deleted posts
`.../posts/page.tsx:20` (architecture)

No `.is('deleted_at', null)`; the staff-admin path uses the RLS-bypassing admin client.

**Fix:** Add the filter, or use `getPostsByNeighborhood()` from the query layer.

### F8 — Post deletion is a hard delete because an RLS bug was never diagnosed
`.../posts/posts-client.tsx:114` (architecture)

Comment admits soft delete "was failing due to RLS issues." Hard delete destroys
reactions and is irreversible.

**Fix:** Diagnose the UPDATE policy, restore soft delete.

### F9 — Member profile page missing soft-delete filter on items
`.../members/[id]/page.tsx:51` (architecture)

Staff admins (admin client) see soft-deleted items on other users' profiles.

**Fix:** Add `.is('deleted_at', null)`.

### F10 — Owner/admin item deletion is a hard delete, destroying loan history
`.../library/[id]/owner-actions.tsx:133` (also admin-actions.tsx) (architecture)

**Fix:** Soft-delete; cancel active/requested loans first.

### F11 — "My Loans" shows loans from all neighborhoods
`.../library/loans/page.tsx:26` (architecture)

The "filter to this neighborhood" comment is a lie — the filter only removes null-owner
rows; `neighborhood_id` isn't even selected.

**Fix:** Filter by neighborhood in the query (or select and filter in JS).

### F12 — Blank dashboard for users with no neighborhood
`apps/web/src/app/(protected)/dashboard/page.tsx:208` (ux)

No membership + no pending requests = a completely empty page. This is the landing
state for a new user who signs up without an invite.

**Fix:** Empty-state branch with a create/join CTA.

## Medium

### F4 — declineLoan callable by the borrower, sends them a misleading "declined" email
`loan-actions.ts:109` (generalist-opus). Verify caller is the item owner; separate
`cancelLoan` action for borrowers.

### F5 — Loan actions skip the shared state machine entirely
`loan-actions.ts:48` (generalist-opus). Re-approving a returned loan resets its dates.
Use `canTransitionLoan()`/`getNextLoanStatus()` from shared.

### F6 — Owners can borrow their own items
`library/[id]/actions.ts:37` (generalist-opus). Server-side owner check missing (UI-only
guard); optionally add owner-exclusion to the loans INSERT policy.

### F13 — declineMembership and removeMembership are byte-identical
`staff/neighborhoods/[slug]/actions.ts:37` (generalist-opus). Delete one or give them
distinct semantics.

### F14 — The entire centralized query layer is dead code
`apps/web/src/lib/queries/*` (cleanup). 18+ exported functions across six modules,
zero call sites. Either migrate inline queries through it (per CLAUDE.md) or delete it.
The types in `queries/types.ts` are still used.

### F15 — Post/item image URLs stored unvalidated → tracking-pixel vector
`posts/actions.ts:63` (security). Validate origin against the app's storage URL prefix.

### F16 — dashboard/page.tsx is 677 lines (limit: 300), duplicates AVATAR_COLORS
(architecture). Extract utilities, split data fetching into `data.ts`.

### F17 / F18 / F32 — Components over the 300-line limit
`profile-form.tsx` (548), `SettingsClient.tsx` (384), `member-list.tsx` (379)
(architecture). Split into focused sub-components.

### F19 — Profile-creation logic duplicated inline in both join pages
`(protected)/neighborhoods/[slug]/join/page.tsx:82` and `join/[slug]/page.tsx:79`
(architecture). Both reimplement `ensureUserProfile()` from `@/lib/ensure-profile`.

### F20 — window.confirm() for destructive actions in 9 places
`owner-actions.tsx:125` et al. (ux). CLAUDE.md forbids native dialogs; the existing
Radix Modal supports a shared ConfirmDialog wrapper.

### F21 — Library search input has no accessible label
`library-client.tsx:92` (ux). Add `aria-label` or visually-hidden label.

### F22 — Heart-reaction button: no aria-label/aria-pressed, color-only state
`posts-client.tsx:331` (ux).

### F23 — Raw DB enum shown to users: "Your membership status is: inactive"
`join/[slug]/page.tsx:288` (ux). Map statuses to human copy with a path forward.

## Low

- **F24** — `SaveGuideData.userId` accepted but never read (`guide/actions.ts:13`); remove it.
- **F25** — Debug `console.log` in production code (`staff/neighborhoods/[slug]/page.tsx:64`).
- **F26** — `layout.tsx` and `lib/email/notifications.ts` still import from deprecated `@/lib/supabase/queries`; migrate and delete the shim.
- **F27** — `lib/timing.ts` entirely unused; delete.
- **F28** — `switchNeighborhood` doesn't verify active membership in the target neighborhood (`app/actions/neighborhood.ts:26`).
- **F29** — Loan-request notes have no server-side length validation; add `loanNotes` to `MAX_LENGTHS`.
- **F30** — `test/mocks/supabase.ts` unused by any test; delete or adopt.
- **F31** — Integration-test config + setup exist with zero integration tests; write one or delete the scaffolding.
- **F33** — Hardcoded hex backgrounds on dashboard stat icons bypass CSS variables (`dashboard/page.tsx:236`).
- **F34** — Dashboard empty states use passive copy ("Nothing posted lately") vs. the design doc's invitation principle.
- **F35** — Waiting page "Check again" silently bounces; add expectation-setting copy.

## Nits

- **F36** — Third ad-hoc shadow value in `dashboard.module.css` (two-level rule).
- **F37** — Hardcoded `border-radius: 6px` instead of `var(--radius-default)`.
- **F38** — Inline `marginLeft: '8px'` instead of `var(--space-2)`.
