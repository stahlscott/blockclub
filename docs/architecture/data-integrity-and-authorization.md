# Data Integrity and Authorization

**Status:** Remediation architecture contract
**Related plan:** [`docs/plans/2026-07-14-codebase-panel-remediation-design.md`](../plans/2026-07-14-codebase-panel-remediation-design.md)
**Current evidence:** [`docs/reviews/2026-07-15-codebase-panel-remediation-status.md`](../reviews/2026-07-15-codebase-panel-remediation-status.md)
**Mutation inventory:** [`docs/plans/2026-07-19-approved-mutation-inventory.md`](../plans/2026-07-19-approved-mutation-inventory.md)

This document describes the rules that production code must preserve. It is an operational contract, not a replacement for PostgreSQL policies, migrations, or server-side authorization checks.

## Identity and authorization modes

Block Club has four distinct identity modes:

1. **Ordinary user:** the authenticated Supabase identity is the effective user. RLS and named ordinary-user RPCs authorize operations.
2. **Neighborhood admin:** an ordinary identity with an active, non-deleted admin membership in the target neighborhood. Admin authority is always tenant-scoped.
3. **Staff admin:** an authenticated identity with an active row in `public.staff_admins`. `STAFF_ADMIN_EMAILS` is only a provisioning input; it is not runtime authorization.
4. **Staff impersonating a target:** the authenticated staff identity remains the actor, while a validated impersonation cookie selects the effective user. Both identities are retained for authorization and audit.

`apps/web/src/lib/auth-context.ts` is the server boundary for this model. It calls the database-backed `is_staff_admin` function, loads impersonation only for allowlisted staff, derives `effectiveUserId`, and chooses the regular or service-role query client. Browser parameters never select `staff_actor_id`.

Service-role clients are server-only. A service-role operation must validate the staff actor, target/effective-user relationship, target neighborhood, and operation-specific state before writing. Staff-only functions reject browser-role invocation through explicit grants and service-role checks.

## Tenant and soft-delete rules

Every user-visible query is scoped by the authoritative neighborhood or effective user. Centralized query helpers under `apps/web/src/lib/queries/` apply the standard joins, tenant predicates, and `deleted_at IS NULL` filters. Admin/service-role reads do not rely on RLS; they must include those predicates explicitly.

Production writes must be listed in the approved mutation inventory and use one of these boundaries:

- a server action with authoritative target and tenant validation;
- a named RPC that owns authorization and atomicity;
- a staff-only command with actor/effective-user validation;
- a narrow authenticated RLS write with immutable relationship predicates.

Direct production hard deletes are not an approved application operation. Membership, item, post, and loan history is preserved through status or soft-delete transitions. The physical neighborhood teardown endpoint is deprecated and returns `410 Gone`.

## Loan lifecycle and concurrency

The valid loan lifecycle is:

```text
requested --approve--> approved --activate/pickup--> active --return--> returned
    |                       |
    +--decline/cancel-------+--cancel--------------> cancelled
```

Named loan functions enforce role, ownership, state, affected-row, and item-availability contracts. Approval does not activate a loan. Activation and item availability changes occur atomically. Terminal loans cannot be resurrected. A partial unique index prevents more than one non-terminal reservation per item, and lifecycle functions lock the item before dependent loan rows to produce deterministic conflict outcomes.

Administrative move-out and item removal close dependent loans with administrative outcomes rather than pretending the borrower returned the item. Notifications, redirects, revalidation, and success responses occur only after the named operation returns a successful affected-row result.

## Membership and content operations

Move-out is an atomic named operation that transitions the membership, soft-deletes owned items, and closes dependent loans while preserving history. Rejoin is an owned transition from `moved_out` and cannot target another user or an active membership.

Pending membership moderation and staff membership changes use separate commands for approve, decline, remove, reactivate, promote, demote, and add. Removal is soft deletion; role and tenant identity fields remain immutable. Post reaction, pin, update, and soft deletion use named RPCs or validated server actions. Item and post creation validates route neighborhood membership and storage-origin URLs.

## Query and client boundaries

Server components and server actions use the server Supabase client. Client components may use browser clients for read-only or explicitly narrow RLS operations, but protected mutations should call a server action or named RPC. The `@/lib/queries` index is the intended read boundary; the former compatibility shim has no application consumers.

Shared types in `@blockclub/shared` define database rows and insert/update payloads. Mutation payloads must use those types rather than `as never`, broad `Record<string, unknown>` values, or double casts. Query-specific joined shapes belong in `apps/web/src/lib/queries/types.ts`.

## Operational rollout and rollback

Migrations are applied expand-first: add types, audit columns, indexes, functions, and grants; deploy callers; inspect policies/functions/indexes; then remove obsolete policies or grants. Run `supabase db reset --local` and the database-boundary inspection before release.

The CASCADE-to-history-preserving deletion changes and enum/constraint additions are forward-only operational changes. Rollback requires a reviewed reverse migration or restoring a verified backup after checking dependent history. Named RPCs are transactional and idempotently retryable where possible. Injected-failure rollback drills remain deferred optional hardening because no production-neutral failure-injection seam currently exists; current functional and concurrency tests do not claim to prove injected rollback.

## Executable repository gates

Run these checks before release:

```text
npm run check:static-inventory
npm run check:component-sizes
npm run check:doc-links
npm run check:finding-dispositions
```

The static inventory checker rejects unclassified production mutation sites, direct hard deletes, and unsafe mutation casts. The component checker requires a reasoned waiver for files over 300 lines. The documentation checker resolves local Markdown links. The finding checker requires the design and status artifacts to cover F1–F38 and N1–N9.
