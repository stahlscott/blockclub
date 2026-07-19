# Approved Mutation Boundary Inventory

**Status:** Current executable inventory for Session 7
**Scope:** Production code under `apps/web/src`, excluding test fixtures.

This file is intentionally separate from the historical pre-remediation inventory at `docs/plans/2026-07-14-codebase-panel-remediation-mutation-inventory.md`. The checker requires every production Supabase mutation call site to match one of the approved boundary categories below.

## Approved boundary categories

| Category | Meaning |
| --- | --- |
| `server-action` | Server action performs authentication, target/tenant validation, affected-row confirmation, and side-effect gating. |
| `named-rpc` | Named database RPC owns authorization, lifecycle, and atomicity. |
| `staff-command` | Staff-only server command validates staff actor/effective user and uses the staff operation boundary. |
| `admin-create` | Staff-authorized server-side creation path with typed insert payload and explicit result handling. |
| `authenticated-rls` | Narrow authenticated RLS write with immutable relationship predicates and integration coverage. |
| `test-fixture` | Integration/unit fixture only; never production application code. |

## Production call sites

| File | Operation | Category | Evidence |
| --- | --- | --- | --- |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/guide/actions.ts` | guide insert/update | `server-action` | authenticated neighborhood-admin action and affected-row checks |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/actions.ts` | loan request insert | `server-action` | authoritative item/membership checks and result selection |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/loan-actions.ts` | loan lifecycle RPCs | `named-rpc` | `approve_loan`, `activate_loan`, `decline_loan`, `cancel_loan`, `return_loan` |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/library/[id]/owner-mutation-actions.ts` | item/loan owner mutations | `server-action` | effective-user and authoritative item/loan checks |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/library/actions.ts` | item create/update | `server-action` | membership/owner checks and affected-row handling |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/members/pending/actions.ts` | pending moderation RPC | `named-rpc` | `moderate_pending_membership` |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/posts/actions.ts` | post/reaction/pin mutations | `named-rpc` | named post RPCs and validated creation action |
| `apps/web/src/app/join/actions.ts` | join/rejoin membership insert/update | `server-action` | authenticated route-neighborhood validation and affected-row checks |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/settings/actions.ts` | neighborhood update | `server-action` | admin membership, typed payload, affected-row check |
| `apps/web/src/app/(protected)/profile/actions.ts` | profile update | `server-action` | effective-user predicate and affected-row check |
| `apps/web/src/app/(protected)/settings/actions.ts` | notification preferences | `server-action` | effective-user predicate and affected-row check |
| `apps/web/src/app/actions/neighborhood.ts` | primary neighborhood switch | `server-action` | active membership validation and affected-row check |
| `apps/web/src/app/api/memberships/[id]/move-out/route.ts` | move out | `named-rpc` | `move_out_membership` |
| `apps/web/src/app/api/admin/users/[id]/memberships/route.ts` | staff membership add/reactivate | `staff-command` | `staff_membership_operation` |
| `apps/web/src/app/api/admin/neighborhoods/[id]/route.ts` | deprecated physical teardown / staff neighborhood patch | `staff-command` | DELETE returns 410; PATCH uses database-allowlisted staff authorization and typed update payload |
| `apps/web/src/app/api/admin/users/[id]/memberships/[membershipId]/route.ts` | staff membership removal | `staff-command` | `staff_membership_operation` |
| `apps/web/src/lib/auth.ts` | staff allowlist RPC lookup | `staff-command` | read-only authorization RPC; no data mutation |
| `apps/web/src/lib/ensure-membership.ts` | idempotent membership insert | `server-action` | authenticated join boundary and unique target lookup |
| `apps/web/src/lib/ensure-profile.ts` | idempotent profile upsert | `server-action` | auth-trigger fallback; preserves existing profile fields through conflict-safe upsert |
| `apps/web/src/lib/neighborhood-mutations.ts` | staff neighborhood creation | `admin-create` | staff-authenticated server boundary and typed insert payload |
| `apps/web/src/lib/staff-membership.ts` | staff membership RPC | `staff-command` | actor/effective-user validation and named staff RPC |
| `apps/web/src/test/**` | fixture setup/cleanup | `test-fixture` | integration harness only |

## Static-checker rules

1. Production `insert`, `update`, `delete`, and `rpc` calls must occur in a file listed above or in a route/action file whose boundary category is obvious from its path and named command.
2. Direct hard deletes in production are not approved. Soft-delete and lifecycle behavior must use a named RPC.
3. `as never`, `@ts-ignore`, and `@ts-expect-error` are forbidden in production mutation paths.
4. The checker is intentionally conservative: a new production mutation requires an inventory entry before it can pass.
