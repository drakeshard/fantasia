# Fantasia architecture baseline

## Dependency direction

`apps/web` → `packages/runtime` → `packages/game` → selected Drakeshard RPG/Tactical package contracts.

Foundation is consumed as exact public `@drakeshard/foundation@0.1.2` infrastructure. Browser-only Foundation adapters stay in `apps/web`; renderer-neutral timing, RNG, input handoff, aggregate persistence orchestration, and semantic runtime-asset resolution stay in `packages/runtime`. `packages/game` does not depend on Foundation or asset-delivery providers.

## Ownership

- `packages/game` owns authoritative Fantasia domain state, commands, validation, deterministic simulation, title policy, combat/action semantics, jobs/skills/statuses, objectives, AI, encounter rules, and RPG↔Tactical composition.
- `packages/runtime` owns application/session orchestration around Foundation fixed-step time, deterministic RNG, normalized input handoff, aggregate save services, and provider-neutral validation/resolution of Git-owned runtime asset manifests. It is not a renderer, browser owner, or binary asset authority.
- `apps/web` owns browser presentation, HTML/CSS/Preact UI, browser input adapters, IndexedDB storage adapters, runtime asset delivery-origin configuration, the title-local Pixi battlefield presentation engine, camera/animation/effects/audio, and input mapping to game intentions.
- Drakeshard RPG and Tactical remain sibling dependencies. Fantasia may consume selected package subpaths, but neither library may depend on the other because Fantasia uses both.

## Content Studio registry boundary

The unified Content Studio uses a logically isolated Supabase schema, `studio_registry`, for Layer 2B workflow and asset metadata. It owns stable semantic entity/asset identities, source-version/provider references, explicit relations, validation/readiness evidence, runtime-derivative metadata, and audit history only.

Git remains canonical for structured gameplay/content definitions and the accepted runtime semantic asset manifest. Google Drive remains the current source/master production-asset authority. Existing player/account persistence remains separate from Studio registry identity and authorization. GAME-STUDIO01 grants no direct registry privileges to browser `anon` or ordinary `authenticated` roles; GAME-STUDIO02 owns real Studio membership/roles and the trusted Operations API.

The exact frozen lifecycle is `WORKING → CANDIDATE → IN REVIEW → APPROVED → FROZEN → RUNTIME READY → PUBLISHED → RETIRED`. Review workflow, validation/readiness, runtime verification, and publication evidence remain independent dimensions. See `docs/content-studio-registry.md` for the physical contract and verification rules.

## Foundation boundary

Fantasia imports Foundation only through supported package subpaths. Package-root imports and repository/source imports are forbidden.

The application or renderer supplies elapsed frame time to `FixedStepDriver`; Foundation does not own the browser frame loop. `DeterministicRng` state is part of runtime state and can be snapshotted for later aggregate persistence. Physical browser input is normalized by Foundation browser adapters and enters authoritative processing only through `TickInputHandoff.consumeTick()` at a simulation tick.

Foundation validates save envelopes and save-format migration mechanics. Fantasia owns aggregate payload structure, game/content/schema versions, payload validation, and when a migrated payload is saved again. IndexedDB and wall-clock save timestamps remain browser/application concerns.

## Runtime asset delivery boundary

Git owns semantic runtime asset meaning through `config/runtime-assets.json`: stable semantic IDs, provider-neutral object paths, media types, and versions. Canonical game/content/UI definitions must not embed Supabase Storage URLs or future CDN URLs.

`packages/runtime` validates the manifest and resolves a semantic ID against a caller-supplied delivery base URL. `apps/web` supplies that browser delivery origin, defaulting to the repository-local `/assets` mirror for development and fallback. Production may point the same resolver at the public Supabase `runtime-assets` bucket; a future CDN may cache the same immutable object paths without becoming authoritative.

Supabase Storage owns published runtime binary objects only. The public bucket is appropriate for shipped non-secret game media, but browser upload/update/delete/list authority is intentionally absent. Publishing is a trusted deployment/admin action using server-only credentials. Versioned object paths are treated as immutable once published.

## Battlefield renderer boundary

Fantasia uses one title-local Pixi battlefield presentation engine in `apps/web`. `battlefield-engine.ts` owns the renderer-facing frame contract, deterministic scene compilation, coordinate/unit indexes, validation and render ordering. `battlefield-renderer.ts` owns Pixi drawing and presentation-only camera behavior. Production battle views and authored/developer scenes are adapters into the same `BattlefieldRenderFrame`; they are not separate renderer implementations.

The renderer-facing frame is intentionally explicit presentation state: bounds, render cells and render units. DOM selectors, ARIA labels, developer-viewer controls, timing probes and test metadata belong to the host layer and cannot enter authored battlefield scene contracts or upstream game/runtime contracts. `packages/game` and `packages/runtime` remain renderer neutral; renderer coordinates, browser frame timing, camera state, DOM state and Pixi objects cannot become authoritative simulation inputs.

The developer route is `?dev=battlefield` and defaults to a small representative reference fixture suitable for interaction and E2E coverage. The 64×64 Ghost Sea and Avalon scenes are explicit stress fixtures only. They verify large-scene compilation/render smoke behavior and must not define the normal battlefield API, default viewer state, or browser interaction contract. Performance correctness is tested deterministically through scene compilation/indexing invariants rather than pass/fail wall-clock or requestAnimationFrame thresholds in E2E.

## Determinism

Authoritative simulation code must not use uncontrolled `Math.random()`, wall-clock time, browser frame timing, renderer physics, or presentation state. Runtime time and randomness are explicit Foundation-backed inputs, while the game/domain stays renderer and browser neutral.

## Private-repository workflow

Fantasia is private/proprietary. GitHub Free does not enforce private-repository branch protection/rulesets for this organization, so the project uses issue → focused branch → PR → green CI → squash merge as an operational rule until plan capabilities change. Direct pushes to `main` are avoided after the unavoidable initial seed commit.
