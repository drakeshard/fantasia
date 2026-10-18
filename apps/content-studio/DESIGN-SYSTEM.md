# Fantasia Content Studio design-system ownership

This map is implementation guidance for the frozen Content Studio architecture. It does not replace controlled Drive architecture documents.

## Dependency direction

`tokens → theme → primitives → semantics → workspace/composites → feature layout`

A lower layer never imports or targets a higher layer. Feature CSS never restyles a shared component.

## Files and owners

| Layer | Files | Owns | Must not own |
| --- | --- | --- | --- |
| Structural tokens | `src/styles/tokens.css` | typography scale, spacing, target/control sizes, radii, motion, z-index, breakpoints | palette, gradients, feature layout |
| Fantasia theme | `src/styles/theme-fantasia-midnight.css` | palette, semantic colors, surfaces/material recipes, shadows, component paint variables, lifecycle/validation colors | component DOM anatomy, feature layout |
| Design-system entrypoint | `src/styles/design-system.css` | ordered imports for the shared system | feature styling |
| Primitive components | `src/ui/primitives.tsx`, `src/ui/primitives.css` | buttons, fields, selects, dialogs, tabs, surfaces, state messages, toolbars, focus/hover/disabled/pending behavior | asset/character-specific layout |
| Semantic components | `src/ui/semantic.tsx`, `src/ui/semantic.css` | lifecycle, validation, review, readiness, provenance and runtime semantics | feature-specific styling |
| Workspace structure | `src/ui/workspace.tsx`, `src/ui/workspace.css` | shell, workspace templates, responsive structural composition | title feature details |
| Shared composite presentation | `src/ui/composites.css`, `src/ui/entity-asset.*` | repeated shell/workspace/entity/asset-board presentation | one-off feature overrides |
| Feature composition | `src/features/**`, `src/styles/production-*.css`, `src/styles/studio-auth.css` | feature-prefixed grids, sizing, content arrangement and feature-only visual hooks | `.ui-*`, shared workspace/semantic selectors, palette/material copies |
| UI Lab only | `src/styles/foundation-preview.css`, `src/styles/material-fidelity.css` | reference/lab page composition | production shared component styling |

## Rules

1. A feature needing a different button, field, dialog, tab or surface appearance changes the shared primitive or adds an explicit reusable primitive variant. It does not target `.ui-*` from feature CSS.
2. A feature needing a repeated pattern such as a provider status row, filter/browser composition, selectable result row, fact grid or action rail promotes that pattern to the shared UI layer when it has a second real consumer. Do not copy the CSS into another feature.
3. Raw palette values and `--studio-color-*` palette tokens belong only to the Fantasia theme or purpose-built visual-reference assets. Shared and production feature CSS consume semantic/component theme variables.
4. The theme is a token-remapping scope. It must not target `body`, `.ui-*`, workspace, semantic, or feature DOM. Base/shared CSS owns applying theme tokens to DOM anatomy.
5. Public `--studio-*` declarations live only in `tokens.css` or the active title theme. References elsewhere must resolve to that controlled contract; dead compatibility aliases are not added merely to preserve obsolete token vocabulary.
6. Keyboard focus is separate from selected/current state. Shared controls keep visible `:focus-visible` treatment, >=44px targets, disabled/pending behavior and reduced-motion handling.
7. `!important` in production feature CSS is an ownership bug. Fix the owning component/layer instead.
8. `scripts/check-content-studio-design-system.mjs` is a required Quality gate. Do not weaken the checker to land a feature override; move the styling to the correct owner.

## Validation ownership

Validation follows the cheapest reliable layer rather than duplicating the same requirement in every test runtime.

- **Static contract checks** own token declaration/reference integrity, theme-only palette ownership, token-only theme scope, shared/feature selector boundaries, raw-palette prevention, `!important` prevention, and design-system import ordering.
- **Unit tests** own pure deterministic logic such as semantic-state catalogs, ordering, metadata mapping, and renderer-neutral helpers. Do not add DOM-emulated unit tests merely to duplicate browser behavior.
- **Real-browser tests** own keyboard/focus, dialog/native behavior, computed CSS/theme resolution, minimum target/layout behavior, reduced motion, and other browser-owned outcomes.
- **Visual evidence** is separate from behavioral proof. The current UI-Lab screenshot captures are local/manual review artifacts; they are not called visual regression until CI stores or compares an accepted baseline.
- **Coverage metrics** are supporting diagnostics. Contract and scenario coverage are the acceptance target.

## Change workflow

When a visual defect appears in more than one feature, or a feature must reach into a shared selector to fix it, stop and repair the shared layer first. Feature CSS should remain small enough that its purpose is obvious from its feature-prefixed selectors.

When a token/theme change affects shared paint, run the static contract checks plus representative browser/theme and primitive scenarios. When a primitive behavior changes, prove browser-owned behavior in Playwright and add a unit test only if an independent pure rule actually exists.
