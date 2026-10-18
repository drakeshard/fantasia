# GAME-STUDIO02 hosted verification

Hosted project: Fantasia Tactical RPG (`mswgfxqhqhtltbrkkspy`).

## Applied migration

Supabase recorded `game_studio02_identity_operations` as hosted migration version `20261018001511`.

The hosted `studio_registry` schema contains the STUDIO01 registry tables plus:

- `studio_memberships`
- `operation_receipts`
- `membership_events`

All three STUDIO02 tables have RLS enabled. `anon` and `authenticated` have zero INSERT/UPDATE/DELETE grants on them and zero EXECUTE grants on the three public Studio RPCs. Service-role access is restricted to the trusted Operations API boundary.

No Studio membership was seeded.

## Rollback-only authorization proof

A single already-existing Supabase Auth identity was selected inside one database transaction without surfacing its identity. The transaction created only temporary verification state and then rolled back.

The proof asserted:

1. an authenticated user with no Studio membership is unauthorized;
2. an inactive Viewer membership is unauthorized;
3. an active Viewer cannot execute `registry.entity_note.set`;
4. an Editor can execute the entity-note proof operation;
5. retrying the same Editor request and idempotency key returns a replay and produces exactly one `change_events` record;
6. an Editor cannot execute Admin membership maintenance;
7. an Approver has `review.approve` but does not have `studio.membership.manage`;
8. an Approver cannot execute Admin membership maintenance;
9. an Admin does not implicitly have `review.approve` or `review.freeze`;
10. an Admin can execute the trusted membership operation and it appends `membership_events` evidence.

After `ROLLBACK`, hosted counts were confirmed as zero for Studio memberships, operation receipts, membership events, the temporary content entity, and its temporary change events.

## Edge Function

`studio-operations` deployed ACTIVE as version 1 with JWT verification enabled.

It uses the same hosted Supabase environment-key convention as the existing `trusted-command` function. Actor identity is derived from the verified bearer token through Supabase Auth; request bodies cannot supply actor or capability claims.

## Advisors

Security advisor findings after STUDIO02:

- `rls_enabled_no_policy` INFO on the 11 Studio registry tables. This is intentional for the current architecture because browser roles have no direct Studio table privileges and production access is through trusted server-side operations. Do not add permissive placeholder RLS policies merely to silence this INFO.
- `auth_leaked_password_protection` WARN remains a pre-existing project Auth setting and was not introduced by STUDIO02.

Performance advisor findings after STUDIO02 contain only unused-index INFO. The Studio registry remains empty outside the rollback-only verification, so newly added and existing lookup indexes have not accumulated usage statistics yet. No unindexed foreign-key finding was reported.
