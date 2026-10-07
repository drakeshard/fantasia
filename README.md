# Fantasia

Fantasia is Drakeshard's private, web-first party-based tactical RPG production repository.

## Development status

GAME-I00 established the production engineering baseline. GAME-I01 integrated exact public `@drakeshard/foundation@0.1.2` for fixed-step timing, deterministic RNG, normalized input handoff, and aggregate persistence infrastructure. GAME-I02 establishes Fantasia-owned actor identity and explicit RPG/Tactical identity association without introducing a universal shared entity model. Production renderer selection remains intentionally deferred.

## Commands

- `pnpm shared:prepare` — build the exact pinned RPG/Tactical package artifacts required by the game workspace.
- `corepack pnpm install --frozen-lockfile` — install the exact workspace dependencies after the shared artifacts have been prepared.
- `pnpm dev` — run the web shell locally.
- `pnpm verify` — run the local quality gate after dependencies are installed.
- `pnpm foundation:consumer` — verify all supported Foundation subpaths resolve while the unsupported package root remains unavailable.
- `pnpm shared:verify` — verify prepared shared artifacts against the committed provenance record.
- `pnpm shared:consumer` — install both generated package artifacts into a clean consumer and import every selected RPG/Tactical subpath by package name.

## Architecture

Authoritative gameplay belongs in `packages/game` and must remain renderer/DOM/UI/Foundation-runtime neutral. `packages/runtime` owns application/session orchestration around supported Foundation infrastructure. `apps/web` owns browser presentation, browser adapters, and UI. RPG and Tactical remain sibling libraries composed by Fantasia.

`ActorId` is Fantasia's canonical actor/character identity and the host-owned subject identity for RPG state. Tactical's `TacticalEntityId` remains a distinct domain identity. Fantasia owns explicit association between the two and persists the mapping as plain string data; it does not introduce `RpgEntityId`, a universal `EntityId`, or a universal RPG character object.

The repository is proprietary and intentionally has no open-source LICENSE.
