# Fantasia architecture baseline

## Dependency direction

`apps/web` → `packages/runtime` → `packages/game` → selected Drakeshard RPG/Tactical package contracts.

Foundation is consumed as exact public `@drakeshard/foundation@0.1.2` infrastructure. Browser-only Foundation adapters stay in `apps/web`; renderer-neutral timing, RNG, input handoff, aggregate persistence orchestration, and semantic runtime-asset resolution stay in `packages/runtime`. `packages/game` does not depend on Foundation or asset-delivery providers.

## Ownership

- `packages/game` owns authoritative Fantasia domain state, commands, validation, deterministic simulation, title policy, combat/action semantics, jobs/skills/statuses, objectives, AI, encounter rules, and RPG↔Tactical composition.
- `packages/runtime` owns application/session orchestration around Foundation fixed-step time, deterministic RNG, normalized input handoff, aggregate save services, and provider-neutral validation/resolution of Git-owned runtime asset manifests. It is not a renderer, browser owner, or binary asset authority.
- `apps/web` owns browser presentation, HTML/CSS/Preact UI, browser input adapters, IndexedDB storage adapters, runtime asset delivery-origin configuration, future renderer adapters, camera/animation/effects/audio, and input mapping to game intentions.
- Drakeshard RPG and Tactical remain sibling dependencies. Fantasia may consume selected package subpaths, but neither library may depend on the other because Fantasia uses both.

## Foundation boundary

Fantasia imports Foundation only through supported package subpaths. Package-root imports and repository/source imports are forbidden.

The application or future renderer supplies elapsed frame time to `FixedStepDriver`; Foundation does not own the browser frame loop. `DeterministicRng` state is part of runtime state and can be snapshotted for later aggregate persistence. Physical browser input is normalized by Foundation browser adapters and enters authoritative processing only through `TickInputHandoff.consumeTick()` at a simulation tick.

Foundation validates save envelopes and save-format migration mechanics. Fantasia owns aggregate payload structure, game/content/schema versions, payload validation, and when a migrated payload is saved again. IndexedDB and wall-clock save timestamps remain browser/application concerns.

## Runtime asset delivery boundary

Git owns semantic runtime asset meaning through `config/runtime-assets.json`: stable semantic IDs, provider-neutral object paths, media types, and versions. Canonical game/content/UI definitions must not embed Supabase Storage URLs or future CDN URLs.

`packages/runtime` validates the manifest and resolves a semantic ID against a caller-supplied delivery base URL. `apps/web` supplies that browser delivery origin, defaulting to the repository-local `/assets` mirror for development and fallback. Production may point the same resolver at the public Supabase `runtime-assets` bucket; a future CDN may cache the same immutable object paths without becoming authoritative.

Supabase Storage owns published runtime binary objects only. The public bucket is appropriate for shipped non-secret game media, but browser upload/update/delete/list authority is intentionally absent. Publishing is a trusted deployment/admin action using server-only credentials. Versioned object paths are treated as immutable once published.

## Renderer boundary

No production renderer is selected yet. The GDD still permits either 2D or true 2.5D presentation. Renderer coordinates, physics, frame timing, DOM state, and animation state cannot become authoritative simulation inputs.

## Determinism

Authoritative simulation code must not use uncontrolled `Math.random()`, wall-clock time, browser frame timing, renderer physics, or presentation state. Runtime time and randomness are explicit Foundation-backed inputs, while the game/domain stays renderer and browser neutral.

## Private-repository workflow

Fantasia is private/proprietary. GitHub Free does not enforce private-repository branch protection/rulesets for this organization, so the project uses issue → focused branch → PR → green CI → squash merge as an operational rule until plan capabilities change. Direct pushes to `main` are avoided after the unavoidable initial seed commit.
