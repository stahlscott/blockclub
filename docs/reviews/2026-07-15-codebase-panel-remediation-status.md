# Codebase Panel Remediation Status

**Date:** 2026-07-15  
**Scope:** Checkpoint after the initial RLS, loan lifecycle, move-out, deletion, and membership-moderation implementation slices  
**Plan:** `docs/plans/2026-07-14-codebase-panel-remediation-design.md`  
**Historical reviews:** `docs/reviews/2026-07-14-codebase-panel-review.md` and `docs/reviews/2026-07-14-codebase-panel-review-followup.md`

## Executive status

The remediation has a working database/RLS and integration-test foundation, but the full remediation plan is not complete. The previous membership-moderation blocker is resolved. The repository is at a safe stopping point for a new implementation session focused on query centralization and protected-mutation inventory closure.

The current working tree is intentionally an uncommitted checkpoint. Do not treat the repository as release-ready until the remaining Phase 3–6 work and release matrix have been completed.

## Verified checkpoint

The following commands passed after a clean local database reset:

- `supabase db reset --local`
- `npm run test:integration` — 44 tests passing across 9 files
- `npm run test:unit` — 269 tests passing
- `npm run typecheck`
- `npm run lint`

The local integration harness uses authenticated users and anon clients, checks local Supabase prerequisites, serializes the suite, and exercises RLS rather than using the service-role client for assertions.

## Phase status

| Phase | Status | Evidence and remaining work |
|---|---|---|
| Phase 0 — Contracts, inventory, migration safety | **Complete as a planning phase** | Design record and mutation inventory exist. The inventory remains a historical pre-remediation record. Final evidence mapping still belongs in this status report and the eventual final report. |
| Phase 1 — Regression infrastructure | **Substantially complete** | Local harness, preflight, unit contracts, and authenticated integration suites are working. Mocked server-action sequencing coverage, Playwright fixtures, and some named concurrency/failure tests remain. |
| Phase 2 — RLS/schema hardening | **Substantially complete** | Additive migrations `00022`–`00030` reset cleanly and the current integration suite covers core membership, loan, item, post, deletion, and move-out behavior. Staff allowlist/RPC infrastructure, policy-inspection scripts, and the full concurrency/failure matrix remain. |
| Phase 3 — High-risk mutation remediation | **Partial** | Move-out, rejoin, loan lifecycle RPCs, item/post mutation paths, request validation, and pending moderation are implemented. Direct protected writes still exist in staff membership actions/APIs, item edit and some creation/auth paths, neighborhood settings, and the physical teardown route. |
| Phase 4 — Query/data-access/impersonation consistency | **Partial; Phase 4A read slice complete** | The identified posts, member-profile, My Loans, item-detail, and My Items reads now use centralized queries. Admin-client soft-delete and borrower neighborhood-scope tests pass. Broader dashboard/directory migration, protected-write classification, impersonation consistency, and removal of remaining inline reads are still open. |
| Phase 5 — Accessibility, UX, maintainability, cleanup | **Partial** | Some touched controls and error flows were improved. The full dialog, component-size, status-copy, design-token, dead-code, and render/accessibility scope is not complete or independently gated. |
| Phase 6 — Documentation and release verification | **Not started as a release phase** | This checkpoint report is the first status artifact. Architecture documentation, executable repository checks, final finding report, targeted E2E, build, and final adversarial review remain. |

## Implemented evidence by finding area

These areas have implementation and passing integration or unit evidence in the current checkpoint:

- **Move-out and rejoin:** atomic `move_out_membership`, self-transition policies, dependent item soft deletion, requested/approved cancellation, active administrative return, and history-preservation tests.
- **Loan lifecycle:** requested → approved → active → returned, permitted borrower cancellation, owner decline, terminal-state rejection, item availability changes, immutable relationship protection, and direct browser/RPC denial tests.
- **Request and deletion integrity:** self-borrow rejection, notes validation, item soft deletion, post soft deletion, reaction/pin RPCs, and direct hard-delete denial for ordinary authenticated clients.
- **Membership moderation:** explicit pending-only policy and atomic `moderate_pending_membership` RPC. The earlier failing tests were corrected by configuring their fixture neighborhood with `require_approval: true`; the auto-approval trigger had otherwise converted the test row before moderation.
- **Test safety:** clean migration reset, local Supabase preflight, authenticated anon clients, non-empty integration suite, unit contract coverage, typecheck, and lint.

## Open gaps and release risks

### Query layer and tenant scope

The deprecated query shim has no remaining application consumers; the compatibility file remains temporarily. The Phase 4A slice migrated the posts page, member profile items, My Loans, item detail, active-loan/user-request reads, and My Items. The remaining query work includes dashboard, directory, pending-member, settings, auth-flow, notification query consolidation, and removal of the compatibility file after static checks.

Admin/service-role query tests now prove that soft-deleted posts, items, memberships, and loans remain hidden and that borrower loans are scoped by neighborhood. Additional query-layer tests are still needed for the remaining consumers.

### Protected mutation boundary

A repository search still finds direct protected writes and `as never` casts. The remaining inventory includes staff membership actions and APIs, item edit/settings paths, some creation/auth flows, neighborhood settings, and the physical neighborhood teardown route. Each must be classified as an approved RLS write, a server command/RPC, or a documented staff-only exception before the static inventory gate can be added.

The physical neighborhood teardown route remains a release risk. It performs sequential destructive service-role deletes and needs removal or replacement with a transactional/resumable, staff-only, audited operation with recovery tests.

### Staff identity and impersonation

The design calls for a database-maintained `staff_admins` allowlist, synchronization from `STAFF_ADMIN_EMAILS`, staff-only RPC signatures, and database validation of actor/effective-user pairs. The current migrations retain audit columns, but the complete allowlist/provisioning and staff-RPC contract is not yet evidenced by the repository or integration suite.

### Concurrency and rollback

The partial unique reservation index, row locks, and loan invariants are present. The named concurrent duplicate-request, activation-race, stale-transition, and injected-failure rollback tests are not all present in the current 39-test suite. These are required before declaring the database boundary complete.

### UI and repository gates

The following planned gates or deliverables are still absent or incomplete:

- component-size checker and waiver file;
- static mutation inventory checker;
- Markdown/documentation link checker;
- finding-disposition completeness checker;
- architecture note at `docs/architecture/data-integrity-and-authorization.md`;
- final finding disposition report;
- complete Playwright/axe remediation coverage;
- `npm run build:web` and targeted E2E verification in this checkpoint.

## Next bounded session

### Goal

Complete the remaining Phase 4 read migration and produce the authoritative protected-mutation classification. Do not start the broader UI cleanup in that session.

### Work sequence

1. Migrate dashboard, directory, pending-member, settings, auth-flow, and notification reads to the centralized query layer where the query contract fits.
2. Add query tests for those consumers, especially admin-client soft-delete and neighborhood predicates.
3. Remove the deprecated compatibility shim after grep confirms no consumers and typecheck passes.
4. Classify every remaining protected write as:
   - approved RPC/server command;
   - narrow authenticated RLS write with a test;
   - staff-only exception;
   - remaining legacy/unapproved direct write.
5. Add the static inventory checker only after the inventory is accurate.

### Stopping point

Stop when all intended application query consumers are migrated, the deprecated shim is removed, admin-client query tests pass, and every remaining protected write is explicitly classified. Keep the unit, integration, typecheck, and lint commands green.

## Durable checkpoint notes

- Historical review reports are immutable.
- The pre-remediation mutation inventory is intentionally historical and should not be edited to make it appear current.
- Migrations through `00030` are additive and pass clean local reset.
- The working tree contains the remediation implementation and test changes but has not been committed by this checkpoint.
- The previous saved goal is terminally marked blocked in session metadata. Continue with a new bounded goal for the next session rather than relying on that stale goal state.

## Completion standard

Do not produce a final remediation-complete report until the remaining findings have code/test/documentation evidence, the direct-write and teardown exceptions are resolved or formally approved, the full release matrix passes, and a fresh adversarial review has compared the result with both historical reports.
