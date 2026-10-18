# Fantasia Content Studio identity and trusted Operations API

GAME-STUDIO02 establishes the authentication and authorization boundary used by later production Content Studio modules.

## Authority boundary

Supabase Auth identifies a person. It does **not** authorize Content Studio access by itself.

Studio authorization is resolved from `studio_registry.studio_memberships`. A normal Fantasia player account or any other valid Supabase Auth identity without an active Studio membership is denied Studio access.

The browser receives only the project URL and publishable key. It never receives the Supabase secret/service-role credential and has no direct mutation privileges on Studio registry, membership, receipt, or audit tables.

All privileged Studio operations go through the JWT-verified `studio-operations` Edge Function. The function validates the Supabase Auth bearer token, derives the actor user ID from that verified identity, parses a narrow typed operation contract, then invokes only allowlisted service-role RPCs.

## Roles and capabilities

| Role | Capabilities |
| --- | --- |
| Viewer | `studio.read` |
| Editor | `studio.read`, `registry.metadata.edit` |
| Approver | Editor capabilities plus `review.approve`, `review.freeze` |
| Admin | `studio.read`, `registry.metadata.edit`, `studio.membership.manage` |

Admin does not implicitly receive approval/freeze authority. Approver does not receive Studio membership administration. Later review work must use the same capability vocabulary rather than treating role labels as a client-side security decision.

The shared TypeScript contract lives in `supabase/functions/studio-operations/contract.ts`. The PostgreSQL role mapping in the STUDIO02 migration mirrors the same capability matrix and is mechanically guarded by `scripts/check-studio-auth.mjs`.

## Trusted Operations API

The initial operation surface is deliberately narrow:

- `session.get` resolves the authenticated user's active Studio membership and capabilities.
- `registry.entity_note.set` is the Editor-level proof mutation. It changes only non-canonical registry metadata (`content_entities.metadata.operatorNote`), validates the semantic ID, requires an idempotency key, and appends a STUDIO01 `change_events` audit record.
- `studio.membership.set` is the Admin-only membership maintenance proof mutation. It validates the target Auth identity, requires an idempotency key, and appends an immutable `membership_events` audit record.

There is no generic SQL executor, arbitrary registry mutation endpoint, repository editor, provider proxy, Drive mutation, canonical Git content mutation, approval/freeze implementation, or publishing operation in STUDIO02.

Every future privileged operation must preserve this pattern: authenticate, resolve membership and capability server-side, validate a typed request, perform a narrow transactional mutation, append appropriate audit evidence, and use idempotency when retrying could duplicate a commitment.

## Idempotency and audit

`studio_registry.operation_receipts` stores `(actor_user_id, operation_name, idempotency_key)` with the normalized request and committed response. Reusing a key for a different request is rejected. Successful retries return the stored response rather than repeating the mutation.

`operation_receipts` and `membership_events` are append-only under the same defensive mutation rejection used by the STUDIO01 audit tables. Registry metadata proof mutations also append the existing STUDIO01 `change_events` history.

## Client session behavior

The Content Studio production root is distinct from the player-facing application. It presents truthful states for session restoration, signed out, authenticated-but-not-authorized, authorized Viewer/Editor/Approver/Admin, and backend/session errors.

The existing 00A-00D UI labs remain available only at `?lab=1` for regression coverage. The normal root path is authentication-gated.

## Initial administrator bootstrap

STUDIO02 intentionally does not seed or invent a staff identity. Therefore an empty installation has no browser-accessible way to self-promote the first Admin. The first active Admin must be provisioned explicitly by a trusted operator using service-role/database administration under owner control. After that bootstrap, normal membership and role maintenance must use the Admin-only trusted `studio.membership.set` operation.

This prevents a public signup path or client-supplied role claim from becoming a privilege-escalation mechanism.
