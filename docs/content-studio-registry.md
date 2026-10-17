# Fantasia Content Studio registry

GAME-STUDIO01 materializes the frozen Layer 2B Content + Asset Registry contract in the existing Fantasia Supabase project.

## Authority boundary

The registry is workflow and metadata infrastructure. It is **not** canonical gameplay/content storage.

- Git remains authoritative for structured gameplay/content definitions, repository schemas/migrations, and the accepted semantic runtime asset manifest at `config/runtime-assets.json`.
- Google Drive remains the current source/master production-asset authority and review-staging provider under the controlled Fantasia asset rules.
- `studio_registry` owns stable semantic identities, provider references, source versions, explicit relations, validation/readiness evidence, runtime-derivative metadata, and append-oriented audit history.
- Existing player/account persistence remains a separate domain. Studio content identity does not reuse account IDs, player-instance IDs, or Supabase Auth user IDs.
- GAME-STUDIO02 owns real Studio membership, Viewer/Editor/Approver/Admin authorization, and the trusted Operations API. STUDIO01 intentionally grants no direct registry access to `anon` or ordinary `authenticated` browser roles.

Provider references are replaceable metadata. A Drive file ID, provider URL, runtime path, bucket key, or database row UUID must never replace a semantic content/asset ID.

## Physical namespace

The registry uses the dedicated Postgres schema `studio_registry` rather than adding Studio records to the existing player-facing `public` persistence domain.

The eight frozen Layer 2B concepts are represented directly:

| Layer 2B concept | Physical table | Responsibility |
| --- | --- | --- |
| content entities | `studio_registry.content_entities` | Stable semantic content identity plus non-canonical browsing/source metadata |
| assets | `studio_registry.assets` | Stable semantic asset identity, owner, role/variant and current-version pointer |
| asset versions | `studio_registry.asset_versions` | Retained source/master versions, provider metadata and checksums |
| entity relations | `studio_registry.entity_relations` | Explicit typed entity-to-entity relationships |
| asset relations | `studio_registry.asset_relations` | Explicit typed asset-to-asset relationships |
| runtime derivatives | `studio_registry.runtime_derivatives` | Exact source-version derivative provenance and technical metadata |
| validation results | `studio_registry.validation_results` | Historical readiness/validation evidence independent from lifecycle |
| change events | `studio_registry.change_events` | Append-only material registry audit events |

The exact frozen lifecycle is stored as an ordered enum:

`WORKING → CANDIDATE → IN REVIEW → APPROVED → FROZEN → RUNTIME READY → PUBLISHED → RETIRED`

Review comments/change requests, validation results, runtime processing job state, and publication verification are separate dimensions and must not become substitute lifecycle values.

## Version and provenance integrity

Source/master replacement creates a new `asset_versions` row. Prior meaningful versions remain queryable.

The current-version pointer is protected by a composite foreign key from `(assets.current_version_id, assets.semantic_id)` to `(asset_versions.id, asset_versions.asset_id)`, preventing an asset from selecting another asset's version.

Every runtime derivative records the exact `source_asset_version_id` plus owning semantic asset and processing profile/version. A second composite foreign key prevents derivative provenance from crossing assets.

`validation_results` and `change_events` target exactly one entity, asset, asset version, or runtime derivative. Both are append-only through the trusted application role: corrections create new evidence/events rather than rewriting history.

## Readiness evidence

The registry can record the frozen readiness dimensions independently from lifecycle:

- Source Valid
- Metadata Complete
- Visual Approved
- Relations Valid
- Runtime Derivatives Valid
- Ready for Runtime
- Runtime Verified
- Published

Results include an outcome, blocking/non-blocking classification, validator identity, evidence, and timestamp. There is intentionally no mutable `ready=true` authority.

## Security posture in STUDIO01

All registry tables have RLS enabled. The schema and tables are explicitly revoked from `public`, `anon`, and `authenticated`.

`service_role` receives direct registry DML only for the later trusted server boundary. `validation_results` and `change_events` additionally revoke UPDATE/DELETE and have defensive append-only triggers.

No service-role key, provider secret, or Studio authorization claim belongs in browser code. STUDIO02 must expose narrow authenticated operations rather than relaxing these base grants.

## Repository verification

Run:

```sh
pnpm check:studio-registry
```

The guard verifies the eight-table contract, exact lifecycle vocabulary/order, version/provenance composite foreign keys, readiness dimensions, append-only history, RLS, least-privilege grants, and separation from player/Auth identity.

The normal repository gate includes this check through `pnpm check` and `pnpm verify`.

## Hosted migration workflow

1. Make registry DDL changes only through reviewed repository migrations.
2. Run `pnpm check:studio-registry` and normal Fantasia Quality.
3. Apply the reviewed migration to the approved Fantasia Supabase environment.
4. Verify schema objects, enum order, constraints, RLS and grants explicitly.
5. Exercise core integrity invariants transactionally without seeding production content.
6. Run Supabase security and performance advisors and resolve/document relevant findings.
7. Update controlled Fantasia Working Context after the reviewed implementation is merged.

STUDIO01 does not bulk-import content, create staff memberships, expose browser registry writes, mutate Drive assets, change the Git-owned runtime manifest, or implement Layer 4/5 workflows.