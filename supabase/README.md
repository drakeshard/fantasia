# Fantasia Supabase

This directory contains Fantasia's repository-authoritative Supabase schema and policy history.

## Hosted project

- Project: `Fantasia Tactical RPG`
- Project ref: `mswgfxqhqhtltbrkkspy`
- Region: `ap-northeast-2`

## Authority boundary

The repository remains authoritative for schema, migrations, game code, and canonical game/content definitions. Supabase stores runtime player/account state only.

Do not move canonical characters, classes, skills, Talent definitions, equipment definitions, narrative, maps, encounters, combat rules, or balance values into mutable database authority.

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

The first slice is intentionally limited to Auth-linked account/profile persistence. Campaign, Talent, Storage/assets, trusted commands, roster, inventory, equipment, economy, and summon state are separate follow-up slices.
