# Content Studio registry in Supabase

Fantasia's existing player/account persistence remains in its established player-facing tables. GAME-STUDIO01 adds a separate `studio_registry` schema for unified Content Studio metadata/workflow state.

This schema is intentionally **non-canonical for gameplay/content facts**. Git remains authoritative for structured game/content definitions and `config/runtime-assets.json`; Google Drive remains current source/master production-asset authority. The registry stores semantic identities, asset/source versions, provider references, explicit relations, derivative provenance, validation/readiness evidence, and audit history.

Browser `anon` and ordinary `authenticated` roles receive no direct registry privileges in STUDIO01. Real Studio membership and Viewer/Editor/Approver/Admin authorization belong to GAME-STUDIO02's trusted Operations API boundary.

See `docs/content-studio-registry.md` for the full contract, integrity rules, lifecycle vocabulary, repository check, and hosted verification workflow.
