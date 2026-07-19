# Final Finding Dispositions

**Date:** 2026-07-19
**Evidence baseline:** remediation commits through `564fdba`
**Source reviews:** [`2026-07-14-codebase-panel-review.md`](2026-07-14-codebase-panel-review.md), [`2026-07-14-codebase-panel-review-followup.md`](2026-07-14-codebase-panel-review-followup.md)
**Architecture contract:** [`../architecture/data-integrity-and-authorization.md`](../architecture/data-integrity-and-authorization.md)

This report is the current disposition map. Historical review files remain immutable. “Fixed” means the implementation boundary exists; final release acceptance additionally requires the release matrix and fresh adversarial review to pass.

## Critical and important findings

| Finding | Disposition | Current evidence |
| --- | --- | --- |
| F1 / C1 | Fixed | Atomic `move_out_membership`; RLS/integration coverage in `move-out.integration.test.ts`; architecture contract. |
| F2 / I1 | Fixed | Owned rejoin action and membership-rejoin integration coverage. |
| F3 / N1 / I2 | Fixed | Shared loan state/permission logic, named lifecycle RPCs, loan integration suite. |
| F4 / I4 | Fixed | Owner decline and borrower cancellation are separate actions/RPCs with role tests. |
| F5 / I5 | Fixed | Approval changes only requested→approved; lifecycle tests cover activation separately. |
| F6 / I6 | Fixed | Self-borrow validation and partial reservation/index integration coverage. |
| F7 / I7 | Fixed | Centralized query helpers filter non-deleted rows; query-layer integration coverage. |
| F8 / I9 premise | Rebutted as stated | No RLS workaround is required; hard-delete behavior was separately remediated. |
| F9 / I8 | Fixed | Member item queries are filtered by owner/neighborhood and non-deleted state. |
| F10 / I9 | Fixed | Item/post soft-delete RPCs preserve history; deletion integration coverage. |
| F11 / I10 | Fixed | Borrower loan queries include authoritative neighborhood scope. |
| F12 | Rebutted | Protected layout routes users without active membership before dashboard access. |
| F13 / M1 | Fixed | Decline, remove, and move-out have distinct semantics and commands. |
| F14 / I11 | Fixed | Application imports use `@/lib/queries`; compatibility shim has no consumers. |
| F15 / M2 | Fixed | Storage-origin allowlist is enforced at post/item boundaries and unit-tested. |
| F16 / M3 | Waived with evidence | Dashboard remains oversized under dated waiver; component gate enforces review metadata. |
| F17 / M3 | Waived with evidence | Profile form remains oversized under dated waiver; state-heavy extraction is deferred. |
| F18 / M3 | Waived with evidence | Settings client remains oversized under dated waiver; dialog/state extraction is deferred. |
| F32 / M3 | Waived with evidence | Staff member list remains oversized under dated waiver; row extraction is deferred. |
| F19 / M4 | Fixed | Idempotent `ensureUserProfile()`/membership helpers and join-flow tests. |
| F20 / M5 | Fixed | Radix confirmation dialogs and inline errors replace native dialogs. |
| F21 | Fixed | Library search has an accessible programmatic label. |
| F22 | Fixed | Reaction controls expose labels and `aria-pressed`. |
| F23 | Fixed | Membership status copy maps states to human-readable guidance. |
| F24–F25 | Fixed | Dead/debug cleanup and static inventory checks. |
| F26 | Fixed | Deprecated query imports absent from application code. |
| F27 / F30 | Fixed | Unused timing and audit utilities removed; test-only Supabase mock retained because it is used. |
| F28 / M6 / N8 | Fixed | Protected route and action boundaries retain defense-in-depth checks. |
| F29 / M7 | Fixed | Shared max-length and server-side notes validation. |
| F31 | Fixed | Integration preflight fails closed on missing prerequisites or empty test discovery. |
| F33 | Fixed | Dashboard styles use design tokens for touched stat colors. |
| F34 | Fixed | Dashboard empty states include a useful next action. |
| F35 | Fixed | Waiting/retry copy explains expected behavior. |
| F36 | Rebutted as stated | Repeated shadow values are not treated as a third shadow tier; touched styles use tokens. |
| F37–F38 | Fixed | Touched styles use spacing/radius tokens where applicable. |
| N2 / I3 | Fixed | Broad loan update policy removed; named transitions protect lifecycle relationships. |
| N3 / I12 | Fixed | Neighborhood switching validates active, non-deleted membership. |
| N4–N5 / I13 | Fixed | Affected-row contracts gate post/item/reaction/due-date writes. |
| N6 / M8 | Fixed | Protected mutation paths contain no `as never` or equivalent unsafe cast. |
| N7 / M9 | Fixed with contained compatibility boundary | Shared/query-layer types replace local broad shapes in reviewed paths; the legacy generated `DatabaseRecord` index-signature mismatch is isolated to the named staff neighborhood insert adapter and is not an `as never` or double-cast path. |
| N9 / I14 | Fixed | Impersonation-aware server boundaries derive actor/effective-user context. |

## Remaining release conditions

- Clean-reset integration, lint, typecheck, unit tests, build, repository gates, and targeted accessibility scans pass at this checkpoint. The default E2E user has no neighborhood navigation/posts, so three protected accessibility tests skip by design; a fixture with active neighborhood content is still needed for those paths.
- Targeted E2E logs repeated pre-existing `Error fetching borrowed items` messages while the dashboard fixture rendered; investigate that query/error path separately before production rollout.
- Perform a fresh adversarial review against both historical reports.
- Keep the four oversized component waivers or complete the proposed extractions in a follow-up.
- Treat injected-failure rollback testing as optional hardening unless a safe failure-injection seam is introduced.
