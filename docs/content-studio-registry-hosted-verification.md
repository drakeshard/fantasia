# GAME-STUDIO01 hosted registry verification

Verified against Fantasia Supabase development project `mswgfxqhqhtltbrkkspy` after applying the reviewed GAME-STUDIO01 migrations.

## Migration state

Hosted migrations include:

- `game_studio01_registry_foundation`
- `game_studio01_registry_fk_indexes`

The hosted migration service assigns environment-local migration version timestamps; repository SQL remains authoritative for the reviewed migration contents.

## Structural verification

Observed on the hosted database:

- exactly 8 `studio_registry` base tables;
- exact lifecycle order: `WORKING → CANDIDATE → IN REVIEW → APPROVED → FROZEN → RUNTIME READY → PUBLISHED → RETIRED`;
- RLS enabled on all 8 registry tables;
- zero direct table privileges for `anon` or `authenticated`;
- `service_role` has trusted registry DML, while `validation_results` and `change_events` have no UPDATE/DELETE grant.

## Transactional invariant proof

Rollback-only test records proved:

- one semantic asset can retain multiple source versions;
- current-version selection succeeds for a version owned by the same asset;
- cross-asset current-version selection is rejected by the composite foreign key;
- runtime derivative provenance succeeds for the exact source version owned by the semantic asset;
- cross-asset derivative provenance is rejected by the composite foreign key;
- an `APPROVED` version can simultaneously retain blocking `Runtime Derivatives Valid = FAILED` evidence, demonstrating lifecycle/readiness independence;
- validation-history UPDATE is rejected;
- change-event DELETE is rejected.

The transaction was rolled back and a follow-up query confirmed zero `test.studio01.*` entities/assets/versions/derivatives/validations/events remained.

## Supabase advisors

After the follow-up FK-index migration:

- the performance advisor reports no unindexed foreign-key findings;
- new indexes appear as unused informational findings because the registry has no production rows yet;
- the security advisor reports `RLS enabled, no policy` informational findings for the 8 registry tables. This is intentional in STUDIO01: browser roles are denied direct registry access until STUDIO02 introduces explicit Studio membership/authorization and trusted operations;
- an existing project-wide warning reports Supabase Auth leaked-password protection disabled. This warning predates/is independent of the registry implementation and is not changed by STUDIO01.

Supabase remediation reference for that unrelated Auth warning: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
