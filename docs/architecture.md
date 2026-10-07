# Fantasia architecture baseline

## Dependency direction

`apps/web` → `packages/runtime` → `packages/game` → selected Drakeshard RPG/Tactical package contracts.

Web Foundation infrastructure will be integrated separately under GAME-I01.

## Ownership

- `packages/game` owns authoritative Fantasia domain state, commands, validation, deterministic simulation, title policy, combat/action semantics, jobs/skills/statuses, objectives, AI, encounter rules, and RPG↔Tactical composition.
- `packages/runtime` owns application/session orchestration and future Foundation adapters. It is not a renderer owner.
- `apps/web` owns browser presentation, HTML/CSS/Preact UI, future renderer adapters, camera/animation/effects/audio, and input mapping to game intentions.
- Drakeshard RPG and Tactical remain sibling dependencies. Fantasia may consume selected package subpaths, but neither library may depend on the other because Fantasia uses both.

## Renderer boundary

GAME-I00 does not select Phaser or PlayCanvas. The GDD still permits either 2D or true 2.5D presentation. Renderer coordinates, physics, frame timing, DOM state, and animation state cannot become authoritative simulation inputs.

## Determinism

Authoritative simulation code must not use uncontrolled `Math.random()`, wall-clock time, browser frame timing, renderer physics, or presentation state. Explicit time/RNG integration arrives with the admitted Foundation contracts under GAME-I01.

## Private-repository workflow

Fantasia is private/proprietary. GitHub Free does not enforce private-repository branch protection/rulesets for this organization, so the project uses issue → focused branch → PR → green CI → squash merge as an operational rule until plan capabilities change. Direct pushes to `main` are avoided after the unavoidable initial seed commit.
