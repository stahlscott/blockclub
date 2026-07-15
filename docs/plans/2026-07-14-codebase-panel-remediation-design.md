# Block Club Codebase Panel Remediation Design

**Date:** 2026-07-14  
**Status:** Checkpoint after Phase 2 and the initial Phase 3 slices; Phase 3 is partial and Phases 4–6 remain open  
**Current status report:** `docs/reviews/2026-07-15-codebase-panel-remediation-status.md`  
**Historical inputs:** `docs/reviews/2026-07-14-codebase-panel-review.md` and `docs/reviews/2026-07-14-codebase-panel-review-followup.md`

This document freezes the authorization, data-integrity, lifecycle, migration, and verification contracts before production behavior or schema changes. Historical review reports remain immutable and are evidence, not executable source of truth.

## Scope and disposition

The remediation covers the confirmed Critical/Important findings and the confirmed maintenance/accessibility gaps in the follow-up report. F12 remains **rebutted**: the protected layout routes ordinary users without an active membership to `/waiting` or `/get-started`, so the dashboard-empty branch is not reachable through the ordinary protected flow. F36 remains **rebutted as a distinct finding**: the cited shadow values are repeated values rather than a third shadow tier; touched styles still use tokens where practical. F8's cited RLS-workaround premise is **rebutted**, but the hard-delete behavior remains fixed.

| Finding(s) | Disposition | Required implementation evidence | Required verification/documentation evidence |
|---|---|---|---|
| F1 / C1 | fixed | atomic move-out operation; self/admin/staff authorization; affected-row contract; soft-delete items; preserve loans; explicit dependent outcomes | authenticated RLS integration tests; failure rollback test; architecture note; status report |
| F2 / I1 | fixed | owned moved-out rejoin command/policy; valid status path; affected-row check | RLS/action tests; join-flow render/scenario test |
| F3 / N1 / I2 | fixed | authoritative loan load; shared permission/state machine; atomic named lifecycle RPCs; no side effects before confirmed result | unit/action sequencing tests and authenticated integration tests |
| F4 / I4 | fixed | owner-only decline; separate borrower cancellation command and copy | role matrix and action tests |
| F5 / I5 | fixed | web actions use shared transition/permission contracts; approval no longer activates | state-machine and lifecycle tests |
| F6 / I6 | fixed | self-borrow rejection in command and database insert invariant | unit and RLS insert tests |
| F7 / I7 | fixed | centralized/explicit non-deleted post reads for admin clients | query-layer admin-client test |
| F8 / I9 premise | rebutted | remove stale workaround explanation; retain hard-delete remediation | migration/architecture documentation |
| F9 / I8 | fixed | filtered member item query | admin-client query test |
| F10 / I9 | fixed | soft-delete item/post paths; non-destructive loan FK behavior | deletion/history tests and migration inspection |
| F11 / I10 | fixed | neighborhood-scoped borrower loan query | query/integration test with two neighborhoods |
| F12 | rebutted | no dashboard behavior change | protected-layout evidence in final status report |
| F13 / M1 | fixed | define decline vs remove semantics; separate action names and outcomes | action tests and architecture note |
| F14 / I11 | fixed | migrate consumers to `lib/queries`; remove deprecated shim after grep | static inventory and query tests |
| F15 / M2 | fixed | storage-origin HTTPS allowlist at create/edit boundaries | validation tests and architecture note |
| F16 / M3 | fixed or waived | split dashboard component or commit a reasoned waiver | component-size script and focused render tests |
| F17 / M3 | fixed or waived | split profile form or commit a reasoned waiver | component-size script and focused render tests |
| F18 / M3 | fixed or waived | split settings client or commit a reasoned waiver | component-size script and focused render tests |
| F32 / M3 | fixed or waived | split staff member list or commit a reasoned waiver | component-size script and focused render tests |
| F19 / M4 | fixed | use idempotent `ensureUserProfile()`; document trigger relationship | join-flow test |
| F20 / M5 | fixed | replace native destructive confirms/alerts with accessible Radix dialog pattern | keyboard/accessibility test |
| F21 | fixed | programmatic library search label | render/accessibility test |
| F22 | fixed | reaction `aria-label` and `aria-pressed` | render/accessibility test |
| F23 | fixed | human membership status mapping and next step | render test |
| F24–F25 / low cleanup | fixed | remove unused user ID and debug log | lint/static inventory |
| F26 | fixed | remove all deprecated shim imports before deleting shim | static inventory |
| F27 / F30 | fixed | remove unused timing utility and Supabase mock after replacement harness exists | static inventory and unit command |
| F28 / M6 / N8 | fixed | defense-in-depth route coverage while retaining route-level checks | middleware/action tests and architecture note |
| F29 / M7 | fixed | shared max length and server-side notes validation | unit/action tests |
| F30 | fixed | remove unused Supabase mock after replacement harness exists | static inventory and unit command |
| F31 | fixed | integration command runs named local tests and fails closed on missing prerequisites/zero files | preflight, harness smoke, serialized integration command |
| F33 / low UX | fixed | replace hardcoded dashboard stat colors with design tokens | render/static review |
| F34 / low UX | fixed | dashboard empty state invites a useful next action | render test |
| F35 / low UX | fixed | waiting retry explains what to expect | render test |
| F36 | rebutted as stated | do not invent a third shadow tier; tokenize touched values as appropriate | status report |
| F37–F38 / low styling | fixed | use radius/spacing tokens in touched styles | static review/lint |
| N2 / I3 | fixed | remove broad owner loan update policy; transition-safe RPC/policies; immutable loan relationships | `pg_policies` inspection and direct browser tests |
| N3 / I12 | fixed | `switchNeighborhood` validates active, non-deleted membership for effective user | unit/action/integration tests |
| N4–N5 / I13 | fixed | affected-row contract for post/item/reaction/due-date writes; protected server boundaries | action sequencing and integration tests |
| N6 / M8 | fixed | typed update payloads; no forbidden `as never` in protected mutation paths | static inventory and typecheck |
| N7 / M9 | fixed | shared/query-layer types replace local `any` shapes | typecheck and query tests |
| N9 / I14 | fixed | all interactive protected mutations call impersonation-aware server boundary | actor/effective-user integration test |

## Finding-to-change map

| Area | Primary changes |
|---|---|
| C1 | additive membership/item/loan audit schema; `move_out_membership` RPC; move-out route |
| I1–I6 | membership transition command; loan command layer; request validation; shared loan matrix |
| I7–I11 | centralized queries; explicit `deleted_at` and neighborhood predicates; soft-delete actions; FK change |
| I12–I14 | membership-checked neighborhood switching; `getAuthContext()` mutation pattern; actor/effective-user audit |
| M1–M9 | distinct membership commands; URL/notes validation; typed payloads; component/static cleanup |
| Low findings | labels/ARIA/status copy/tokens/debug and unused-file cleanup |

## Authoritative identity and authorization model

There are four operating modes:

1. **Ordinary user:** authenticated Supabase client, `auth.uid()` is the effective user. RLS may authorize simple single-row writes only when immutable columns and affected-row behavior are fully constrained.
2. **Neighborhood admin:** ordinary authenticated identity with active, non-deleted admin membership in the target neighborhood. Admin operations are still bounded by neighborhood and immutable relationship checks.
3. **Staff admin:** authenticated staff identity from the database-maintained `staff_admins` allowlist, with service-role access only inside server boundaries. Staff status is not inferred by arbitrary browser parameters.
4. **Staff impersonating target:** `authUser.id` is the staff actor; a validated impersonation cookie selects `effective_user_id`. The server derives both values, validates target eligibility for the requested neighborhood/operation, and records both. Browser callers never choose `staff_actor_id`.

`staff_admins` is synchronized from `STAFF_ADMIN_EMAILS` by an explicit service-role provisioning/synchronization command. Synchronization is fail-closed for protected staff operations and reports drift; it is not performed implicitly by an untrusted browser request.

## Loan lifecycle and operation contract

```text
requested --approve--> approved --activate/pickup--> active --return--> returned
    |                       |
    +--decline/cancel-------+--cancel--------------> cancelled
```

Terminal states (`returned`, `cancelled`) cannot transition or be resurrected. Approval only changes `requested` to `approved`; it does not set `start_date`, `due_date`, or item availability. Owner-confirmed activation changes `approved` to `active`, sets `start_date`, accepts/validates the due date, and changes availability to `borrowed` atomically. Return requires `active` and `start_date`, sets `returned_at`, and restores availability only when no non-terminal reservation remains. Requested/approved reservations leave an item visibly `available` but block another non-terminal request.

The item owner may approve, decline, confirm pickup, update the due date of an active loan, and mark an active loan returned. The borrower may cancel only requested/approved loans belonging to the borrower. Neither may act on another user's loan. Neighborhood/staff administrative move-out or item-removal closure sets requested/approved loans to `cancelled`; it sets active loans to `returned` with `closure_reason = administrative_move_out` or `administrative_item_removal`, effective actor metadata, and distinct user-facing copy. This is not represented as a borrower-confirmed return.

Each lifecycle RPC returns a structured result containing `success`, a stable `reason` (`not_found`, `not_authorized`, `invalid_transition`, `conflict`, `validation_error`, or `updated`), affected loan/item IDs, and any dependent outcome. A successful user-visible mutation requires exactly the intended affected row. Notifications, revalidation, redirects, and success responses occur only after that result is confirmed.

## Database function boundary

All named multi-row operations are `SECURITY DEFINER`, use `SET search_path = public`, have schema-qualified exact signatures and explicit return composite types, and revoke default PUBLIC execution. There are no generic service-role mutation functions exposed to browser roles.

Initial named contracts use separate ordinary and staff signatures; there is no overload that accepts a caller-selected actor on the ordinary browser path:

- Ordinary `public.move_out_membership(p_membership_id uuid) returns public.move_out_result`.
- Ordinary `public.approve_loan(p_loan_id uuid) returns public.loan_operation_result`.
- Ordinary `public.activate_loan(p_loan_id uuid, p_start_date date, p_due_date date) returns public.loan_operation_result`.
- Ordinary `public.return_loan(p_loan_id uuid) returns public.loan_operation_result`.
- Ordinary `public.decline_loan(p_loan_id uuid) returns public.loan_operation_result`.
- Ordinary `public.cancel_loan(p_loan_id uuid) returns public.loan_operation_result`.
- Staff-only `public.staff_move_out_membership(p_membership_id uuid, p_effective_user_id uuid, p_staff_actor_id uuid) returns public.move_out_result`.
- Staff-only `public.staff_approve_loan(p_loan_id uuid, p_effective_user_id uuid, p_staff_actor_id uuid) returns public.loan_operation_result`.
- Staff-only `public.staff_activate_loan(p_loan_id uuid, p_effective_user_id uuid, p_start_date date, p_due_date date, p_staff_actor_id uuid) returns public.loan_operation_result`.
- Staff-only `public.staff_return_loan(p_loan_id uuid, p_effective_user_id uuid, p_staff_actor_id uuid) returns public.loan_operation_result`.
- Staff-only `public.staff_decline_loan(p_loan_id uuid, p_effective_user_id uuid, p_staff_actor_id uuid) returns public.loan_operation_result`.
- Staff-only `public.staff_cancel_loan(p_loan_id uuid, p_effective_user_id uuid, p_staff_actor_id uuid) returns public.loan_operation_result`.

Ordinary functions derive `auth.uid()` inside the function and reject any attempt to act outside that identity or its active membership. They are granted only to `authenticated` after `REVOKE ALL ... FROM PUBLIC, anon`. Staff functions are granted only to `service_role`; their server caller validates staff status and the impersonation target, and the function validates `p_staff_actor_id` against `staff_admins` plus the target/effective-user relationship. Staff functions reject null/invalid actor-target IDs and forged combinations. Direct anon/authenticated RPC denial and service-role allow tests are required for every signature.

## Durable audit and schema decisions

The existing `staff_actor_id` columns are retained and included in shared types/selects. The additive schema change adds:

- `loans.closure_reason` with values `borrower_returned`, `administrative_move_out`, `administrative_item_removal`, and `staff_correction`;
- `loans.closed_by_user_id` for the effective user/administrator who caused terminal closure;
- `loans.created_at` to match centralized query ordering and shared types;
- corresponding constraints requiring `start_date` for `active`, `returned_at` for `returned`, and closure metadata for administrative returns.

The exact PostgreSQL representation (enum versus constrained text) will be frozen in the migration after checking existing data; enum additions are forward-only. Existing rows are backfilled conservatively as `borrower_returned` only when already returned with `returned_at`, and unresolved inconsistencies fail migration preflight rather than being guessed.

Item and post UPDATE policies preserve owner/author IDs, neighborhood IDs, and deleted-row invariants with explicit `USING` and `WITH CHECK`; direct browser updates cannot relocate rows across tenants or resurrect soft-deleted records. Loan UPDATE is not a general browser path: named transitions or narrow policies protect `item_id`, `borrower_id`, terminal states, and lifecycle fields.

## Concurrency and availability matrix

A partial unique index will allow at most one non-deleted `requested`, `approved`, or `active` loan per item. Migration preflight reports duplicate rows and stops before index creation; no silent data loss is permitted. Lifecycle functions lock the item row before reading/updating loans, use a consistent item-first lock order, and return `conflict` for stale transitions. Move-out/item removal takes the same item lock before closing dependents. Manual `unavailable` is never overwritten by a lifecycle operation unless the operation explicitly owns that state; activation requires a suitable available item, while return/cancel recomputes to `available` only when no non-terminal loan remains and the prior state was lifecycle-owned.

The integration suite tests concurrent duplicate requests, activation races, cancellation/move-out races, stale transitions, and injected failure rollback for both loan and item state.

## Migration rollout, rollback, and compatibility

Migrations after `00021` are additive and are applied in expand/contract order:

1. add audit columns/types, indexes, staff allowlist table, result types, and new versioned functions; backfill only with explicit checks;
2. deploy server callers that use the new functions and affected-row result contract;
3. inspect policies/functions/indexes and run the authenticated integration suite;
4. drop/recreate broad policies, revoke old grants, and change deletion behavior/FK only after callers no longer depend on them;
5. remove deprecated application paths and query shim after static checks pass.

Every policy migration uses `DROP POLICY IF EXISTS` plus explicit recreation or a clearly additive name, records `USING`/`WITH CHECK` reasoning, and includes reset/seed verification. Every function signature is versioned; return-type changes use a new function name rather than unsafe `CREATE OR REPLACE` changes. Enum additions and the CASCADE-to-NO ACTION FK change are forward-only operational changes: rollback means restore a pre-deploy backup or apply a reviewed reverse migration only after verifying no dependent history would be deleted. Policy/function changes are reversible only through reviewed SQL and compatibility checks.

Before production deployment: create a backup/restore point, run `supabase db reset`, inspect `pg_policies`, verify existing-row preconditions, run failure recovery drills, and record the application/schema compatibility matrix. Partial operations must be idempotently retryable through named RPCs or reported as conflicts requiring operator recovery; no route may claim success after a partial sequential delete.

## Test classification and gates

- **Unit Vitest:** shared loan role/transition matrix, affected-row result helper, URL allowlist, notes length, membership status copy.
- **Authenticated local Supabase integration:** RLS, RPC grants, tenant isolation, soft-delete behavior, constraints, concurrency, failure rollback, policy inspection, and staff actor/effective-user audit.
- **Mocked server-action tests:** authoritative-load sequencing, stale/mismatched ID rejection, notification/revalidation gating.
- **Playwright/axe:** observable lifecycle, impersonation, confirmation dialogs, labels/ARIA, status/empty copy.
- **Repository scripts:** component sizes, doc links, static mutation inventory, finding-disposition completeness.
- **Release matrix:** lint, typecheck, unit, serialized integration after clean reset, targeted E2E/accessibility, build, migration/policy inspection.

The integration command must fail before Vitest when local Supabase prerequisites or matching test files are absent. It runs one worker/file-serially against loopback Supabase with deterministic fixture cleanup; it never silently reports an empty suite as green. Migration `00022_api_role_grants.sql` is the harness prerequisite: it adds explicit PostgREST table privileges that were missing from the original schema, while RLS remains the authorization boundary for anon/authenticated clients.

## Current checkpoint

The implementation is paused after the core RLS/schema and initial high-risk mutation slices. The local database reset, authenticated integration suite, unit suite, typecheck, and lint are passing. The next bounded session is Phase 4A: migrate the known leak-prone reads to `apps/web/src/lib/queries/`, add admin-client soft-delete/tenant tests, and classify every remaining protected direct write before adding the static inventory checker.

The current phase disposition, verification evidence, open risks, and stopping point are maintained in `docs/reviews/2026-07-15-codebase-panel-remediation-status.md`. This status report is a checkpoint, not a declaration of remediation completion. The historical mutation inventory remains unchanged because it records pre-remediation behavior.

## Required Phase 0 evidence

- This design record and the companion mutation inventory are complete and reviewed.
- Every F1–F38 and N1–N9 has an explicit disposition and evidence path.
- The schema/query mismatch (`loans.created_at`, requested reservation omission, existing staff audit columns) and the current generated `Database` insert typing mismatch exposed by the integration profile seed are recorded as pre-centralization blockers. The test-only service-role fixture client may remain untyped until the shared generated Database table definitions are corrected; authenticated RLS clients remain typed.
- The physical neighborhood teardown route is treated as the sole exception and must be removed or replaced by one transactional/resumable staff-only operation before release; documentation alone is insufficient.
