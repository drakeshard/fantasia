# Fantasia

Fantasia is Drakeshard's private, web-first party-based tactical RPG production repository.

## Development status

GAME-I00 established the production engineering baseline. GAME-I01 integrates exact public `@drakeshard/foundation@0.1.2` for fixed-step timing, deterministic RNG, normalized input handoff, and aggregate persistence infrastructure. Gameplay implementation and production renderer selection remain intentionally deferred to later milestones.

## Commands

- `corepack pnpm install --frozen-lockfile` — install the exact workspace dependencies.
- `pnpm dev` — run the web shell locally.
- `pnpm verify` — run the local quality gate.
- `pnpm foundation:consumer` — verify all supported Foundation subpaths resolve while the unsupported package root remains unavailable.
- `pnpm shared:prepare` — build pinned RPG/Tactical package artifacts and write generated provenance under `.artifacts/shared/`.
- `pnpm shared:verify` — verify prepared shared artifacts against the committed provenance record.
- `pnpm shared:consumer` — install both generated package artifacts into a clean consumer and import every selected RPG/Tactical subpath by package name.

## Architecture

Authoritative gameplay belongs in `packages/game` and must remain renderer/DOM/UI/Foundation-runtime neutral. `packages/runtime` owns application/session orchestration around supported Foundation infrastructure. `apps/web` owns browser presentation, browser adapters, and UI. RPG and Tactical remain sibling libraries composed by Fantasia.

The repository is proprietary and intentionally has no open-source LICENSE.
