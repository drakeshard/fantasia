# Fantasia Supabase

This directory contains Fantasia's repository-authoritative Supabase schema and policy history.

## Hosted project

- Project: `Fantasia Tactical RPG`
- Project ref: `mswgfxqhqhtltbrkkspy`
- Region: `ap-northeast-2`

## Authority boundary

The repository remains authoritative for schema, migrations, game code, and canonical game/content definitions. Supabase stores runtime player/account state only.

Do not move canonical characters, classes, skills, Talent definitions, equipment definitions, narrative, maps, encounters, combat rules, balance values, campaign titles, stage definitions, unlock rules, or rewards into mutable database authority.

## Current persisted slices

- Auth-linked `accounts` and `account_profiles`.
- `campaign_progress`, containing only the account's current saga/chapter/stage identifiers plus schema version, revision, and timestamps.
- `account_talent_progress`, containing only serialized account-wide Talent investment state plus schema version, revision, and timestamps.

Campaign identifiers loaded from Supabase must be validated against the current repository-owned campaign definition before runtime restoration. Temporary campaign-map selection is presentation/session state and is not persisted as campaign progress.

Talent state loaded from Supabase must be validated against the current repository-owned Talent catalog before use. Canonical tree/node definitions, statuses, prerequisites, effects, and balance remain in Git. Direct browser rank mutation is intentionally unavailable: authenticated clients may read their own Talent state and may only initialize their own row with the server default empty state. Talent purchase/upgrade remains a future trusted transactional command.

## Security baseline

- Enable RLS on every exposed player table.
- Grant only the minimum Data API privileges required by the browser client.
- Use `auth.uid()` ownership predicates in both `USING` and `WITH CHECK` where updates are permitted.
- Client code may use only the project URL and publishable key.
- Never commit or expose a service-role/secret key.
- Sensitive future mutations such as currency spend, reward claim, item grant, summon, and Talent purchase must use trusted validated transactional command boundaries rather than direct browser writes.

## Workflow

1. Make schema/policy changes as repository migrations.
2. Apply the same reviewed migration to the target Supabase environment.
3. Run Supabase security and performance advisors after DDL changes.
4. Verify RLS, grants, and function security mode explicitly.
5. Update controlled Fantasia Working Context when backend state materially changes.

Account/profile and campaign persistence are complete. GAME-BACKEND03 adds read-only account Talent persistence and deterministic empty bootstrap without inventing currency, purchase, reset/refund, or unlock-timing semantics. Storage/assets, trusted commands, roster, inventory, equipment, economy, and summon state remain separate follow-up slices.
