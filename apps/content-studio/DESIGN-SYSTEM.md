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
3. Raw palette values belong only to the Fantasia theme or purpose-built visual-reference assets. Production feature styles consume semantic theme variables.
4. Keyboard focus is separate from selected/current state. Shared controls keep visible `:focus-visible` treatment, >=44px targets, disabled/pending behavior and reduced-motion handling.
5. `!important` in production feature CSS is an ownership bug. Fix the owning component/layer instead.
6. `scripts/check-content-studio-design-system.mjs` is a required Quality gate. Do not weaken the checker to land a feature override; move the styling to the correct owner.

## Change workflow

When a visual defect appears in more than one feature, or a feature must reach into a shared selector to fix it, stop and repair the shared layer first. Feature CSS should remain small enough that its purpose is obvious from its feature-prefixed selectors.
