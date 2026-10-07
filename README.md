# Fantasia

Fantasia is Drakeshard's private, web-first party-based tactical RPG production repository.

## Development status

The repository is in GAME-I00 bootstrap. No gameplay implementation or production renderer has been selected yet.

## Commands

- `corepack pnpm install --frozen-lockfile` — install the exact workspace dependencies.
- `pnpm dev` — run the web shell locally.
- `pnpm verify` — run the local quality gate.
- `pnpm shared:prepare` — build pinned RPG/Tactical package artifacts and write provenance under `.artifacts/shared/`.
- `pnpm shared:verify` — verify prepared shared artifacts against the committed provenance record.

## Architecture

Authoritative gameplay belongs in `packages/game` and must remain renderer/DOM/UI neutral. `packages/runtime` owns application/runtime orchestration. `apps/web` owns browser presentation and UI. RPG and Tactical remain sibling libraries composed by Fantasia.

The repository is proprietary and intentionally has no open-source LICENSE.

Tracked by GAME-I00 (#1).
