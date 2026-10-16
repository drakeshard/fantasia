# Fantasia Supabase

This directory contains Fantasia's repository-authoritative Supabase schema and policy history.

## Hosted project

- Project: `Fantasia Tactical RPG`
- Project ref: `mswgfxqhqhtltbrkkspy`
- Region: `ap-northeast-2`

## Authority boundary

The repository remains authoritative for schema, migrations, game code, canonical game/content definitions, and the semantic runtime-asset manifest. Supabase stores runtime player/account state and serves published runtime binary assets.

Do not move canonical characters, classes, skills, Talent definitions, equipment definitions, narrative, maps, encounters, combat rules, balance values, campaign titles, stage definitions, unlock rules, rewards, or semantic asset meaning into mutable database/Storage authority.

## Current persisted slices

- Auth-linked `accounts` and `account_profiles`.
- `campaign_progress`, containing only the account's current saga/chapter/stage identifiers plus schema version, revision, and timestamps.
- `account_talent_progress`, containing only serialized account-wide Talent investment state plus schema version, revision, and timestamps.
- `account_unit_instances`, containing immutable account-owned unit-instance identity: an instance UUID, schema version, Git-owned character-definition reference, and creation timestamp.
- Private trusted-command idempotency receipts containing normalized request/result snapshots only; these are infrastructure records, not canonical gameplay definitions.

Campaign identifiers loaded from Supabase must be validated against the current repository-owned campaign definition before runtime restoration. Temporary campaign-map selection is presentation/session state and is not persisted as campaign progress.

Talent state loaded from Supabase must be validated against the current repository-owned Talent catalog before use. Canonical tree/node definitions, statuses, prerequisites, effects, and balance remain in Git. Direct browser rank mutation is intentionally unavailable: authenticated clients may read their own Talent state and may only initialize their own row with the server default empty state. Talent purchase/upgrade remains a future trusted transactional command.

Roster unit instances loaded from Supabase must be validated against a repository-owned character-definition catalog before use. Authenticated clients may read only their own unit instances and receive no direct INSERT, UPDATE, or DELETE privilege. GAME-BACKEND06 does not auto-grant the protagonist and does not define recruitment, grants, duplicate-copy conversion, rarity, levels, stars, class paths, skills, equipment, economy, or summon semantics. Multiple stored instances may reference the same definition because duplicate-character gameplay policy is intentionally still unresolved.

## Runtime asset delivery

GAME-BACKEND04 creates one public Files bucket named `runtime-assets` for shipped, non-secret runtime media. The bucket is a binary delivery authority, not a source of semantic game/content truth.

- `config/runtime-assets.json` is the Git-owned manifest mapping stable semantic asset IDs to provider-neutral object paths, media types, and asset versions.
- Canonical content and UI code reference semantic asset IDs rather than Supabase URLs.
- `packages/runtime` validates the manifest and resolves semantic IDs against a caller-supplied delivery base URL.
- `apps/web` defaults that base URL to the repository-local `/assets` mirror. Production may set `VITE_RUNTIME_ASSET_BASE_URL` to the public Supabase Storage origin (or a future delivery/cache origin) without changing the manifest.
- No `storage.objects` policy is created for browser upload, update, delete, or listing. Public bucket object retrieval remains direct/public; publishing stays a trusted deployment/admin action.
- `pnpm assets:verify` checks that every currently declared manifest object exists in the repository source mirror. `pnpm assets:publish` is server/CI-only and requires `SUPABASE_URL` plus an unexposed modern `SUPABASE_SECRET_KEY`.
- Asset object paths are versioned/immutable by convention. Publish a new versioned path instead of overwriting an already-cached production object.

## Trusted command boundary

GAME-BACKEND05 establishes the reusable boundary for future sensitive player-state mutations without inventing unresolved gameplay/economy semantics.

- Browser callers send an authenticated user JWT to the `trusted-command` Edge Function. The function validates the caller against Supabase Auth before selecting any command handler.
- Elevated database access exists only inside the Edge Function through an unexposed modern Supabase secret key. No service-role/secret credential is committed or returned to clients.
- Privileged database mutation is performed by narrowly scoped `SECURITY INVOKER` RPCs executable only by `service_role`; `anon` and `authenticated` receive no EXECUTE grant.
- `private.trusted_command_receipts` records per-account command name, idempotency key, normalized request, and first successful result. Same-key retries return that stored result without reapplying the mutation. Reusing a key for a different normalized request is rejected.
- The initial proof command is `profile.update_display_name`, an already-approved account mutation. It exists to prove authentication, authorization, atomic mutation, and idempotency; it does not imply that ordinary profile edits must become sensitive commands.
- No Talent purchase/currency, stage reward, item grant, roster grant, inventory, equipment, summon, or economy semantics are introduced by this infrastructure slice.

## Security baseline

- Enable RLS on every exposed player table.
- Grant only the minimum Data API privileges required by the browser client.
- Use `auth.uid()` ownership predicates in both `USING` and `WITH CHECK` where updates are permitted.
- Client code may use only the project URL and publishable key.
- Never commit or expose a service-role/secret key.
- Do not create browser Storage write policies for canonical shipped runtime assets.
- Sensitive future mutations such as currency spend, reward claim, item grant, roster acquisition, summon, and Talent purchase must use trusted validated transactional command boundaries rather than direct browser writes.

## Workflow

1. Make schema/policy changes as repository migrations.
2. Apply the same reviewed migration to the target Supabase environment.
3. Run Supabase security and performance advisors after DDL changes.
4. Verify RLS, grants, bucket visibility, Storage policies, and function security mode explicitly.
5. Update controlled Fantasia Working Context when backend state materially changes.

Account/profile, campaign, Talent persistence, Storage/semantic asset delivery, trusted-command infrastructure, and roster unit-instance identity persistence are complete through GAME-BACKEND06. Inventory/equipment, economy, and summon state remain separate follow-up slices.
