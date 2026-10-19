# Fantasia Content Studio design-system ownership

This map is implementation guidance for the frozen Content Studio architecture. It does not replace controlled Drive architecture documents.

## Dependency direction

`tokens → theme → low-level primitives → reusable production components → semantics → workspace/composites → feature layout`

A lower layer never imports or targets a higher layer. Feature CSS may arrange shared components but never repaint or redefine their anatomy.

## Files and owners

| Layer | Files | Owns | Must not own |
| --- | --- | --- | --- |
| Design-system contract | `design-system-contract.json` | active title-theme identity/scope, required public theme tokens, representative accessibility contrast pairs and thresholds | CSS implementation, feature layout, component DOM anatomy |
| Structural tokens | `src/styles/tokens.css` | typography scale, spacing, target/control sizes, radii, motion, z-index, breakpoints | palette, gradients, feature layout |
| Fantasia theme | `src/styles/theme-fantasia-midnight.css` | palette, semantic colors, surfaces/material recipes, shadows, component paint variables, lifecycle/validation colors | component DOM anatomy, feature layout |
| Design-system entrypoint | `src/styles/design-system.css` | ordered imports for the shared system | feature styling |
| Low-level primitives | `src/ui/primitives.tsx`, `src/ui/primitives.css` | buttons, fields, selects, dialogs, tabs, surfaces, state messages, toolbars, focus/hover/disabled/pending behavior | asset/character-specific layout |
| Production components | `src/ui/production-components.tsx`, `src/ui/production-components.css` | reusable sections, fact lists, status groups, filter bars, selectable collections/rows, master/detail frames, common empty/loading states, metadata rows and the shared file picker | title-domain meaning, provider/API operations, feature-specific data rules |
| Component inventory | `src/ui/component-inventory.tsx`, `src/ui/component-inventory.css` | UI-Lab review surface for representative reusable component variants/states | production routing or provider mutation |
| Semantic components | `src/ui/semantic.tsx`, `src/ui/semantic.css` | lifecycle, validation, review, readiness, provenance and runtime semantics | feature-specific styling |
| Workspace structure | `src/ui/workspace.tsx`, `src/ui/workspace.css` | shell, workspace templates, responsive structural composition | title feature details |
| Shared composite presentation | `src/ui/composites.css`, `src/ui/entity-asset.*` | repeated shell/workspace/entity/asset-board presentation | one-off feature overrides |
| Feature composition | `src/features/**`, `src/styles/production-*.css`, `src/styles/studio-auth.css` | feature-prefixed grids, sizing, domain content arrangement and feature-only hooks | shared component roots, palette/material copies, native replacements for an existing shared control |
| UI Lab only | `src/styles/foundation-preview.css`, `src/styles/material-fidelity.css` | reference/lab page composition | production shared component styling |
| Visual regression | `tests/studio/visual/**`, `playwright.content-studio.visual.config.ts` | reviewed representative shared visual baselines and deterministic Chromium comparison | behavioral/accessibility assertions, automatic baseline acceptance |

## Production component inventory

The reusable production layer is the default vocabulary for repeated Studio page anatomy:

- `Section` / `DetailSection`: titled production content framing.
- `KeyValueList`: canonical facts and metadata without feature-owned fact-grid CSS.
- `StatusGroup`: accessible grouping of lifecycle/readiness/validation chips or badges.
- `FilterBar`: search/filter composition and active-filter recovery.
- `SelectableCollection` / `SelectableRow`: reusable selected-row anatomy with keyboard-focus behavior kept separate from selection state.
- `MasterDetailLayout`: responsive browser/list + selected-detail composition.
- `EmptyState`: empty/loading/unavailable/error presentation without collapsing those meanings.
- `MetadataRow`: compact evidence/version/provider/file metadata rows.
- `FilePicker`: the one shared source-file field. It encapsulates the visually hidden native file input, drag/drop target, selected-file feedback and removal action.

Do not introduce a schema-driven generic admin renderer. Features still own domain data, operations, wording and layout composition; the shared layer owns repeated interaction and visual anatomy.

## Rules

1. A feature needing a different button, field, dialog, tab or surface appearance changes the shared primitive or adds an explicit reusable primitive variant. It does not target `.ui-*` from feature CSS.
2. A feature needing Section/facts/filter/selectable-row/master-detail/file-picker anatomy consumes `production-components.tsx`. It does not copy that markup/CSS locally.
3. Raw palette values and `--studio-color-*` palette tokens belong only to the Fantasia theme or purpose-built visual-reference assets. Shared and production feature CSS consume semantic/component theme variables.
4. The theme is a token-remapping scope. It must not target `body`, `.ui-*`, workspace, semantic, production-component, or feature DOM. Base/shared CSS owns applying theme tokens to DOM anatomy.
5. Public `--studio-*` declarations live only in `tokens.css` or the active title theme. References elsewhere must resolve to that controlled contract; dead compatibility aliases are not added merely to preserve obsolete token vocabulary.
6. `design-system-contract.json` is the single machine-readable source for title-theme identity, required public theme tokens and representative contrast requirements. Static and browser validation consume the same file; do not duplicate token lists inside tests or scripts.
7. Normal text contrast pairs in the controlled contract use a minimum of 4.5:1. Non-text focus/state indicators use a minimum of 3:1. If a controlled pair fails, revise the owning semantic/theme token instead of weakening the threshold.
8. Keyboard focus is separate from selected/current state. Shared controls keep visible `:focus-visible` treatment, >=44px targets, disabled/pending behavior and reduced-motion handling.
9. `!important` in production feature CSS is an ownership bug. Fix the owning component/layer instead.
10. Feature CSS must not target production-component roots such as `.studio-component-*`, `.studio-filter-bar`, `.studio-selectable-*`, `.studio-master-detail`, `.studio-file-picker`, `.studio-key-value-list`, or `.studio-metadata-row`.
11. Native `<select>` and `<textarea>` anatomy is forbidden in production feature modules; consume shared fields. New entity modules must likewise use the shared button/field/file-picker vocabulary from inception. The existing Assets page remains the migration pressure test for removing its older local row/file-control anatomy rather than a template for new code.
12. `scripts/check-content-studio-design-system.mjs` is a required Quality gate. Do not weaken the checker to land a feature override; move the styling to the correct owner.
13. Accepted visual baselines are repository files under `tests/studio/visual/__snapshots__/{projectName}`. CI uses compare-only `pnpm test:studio:visual`; it never runs snapshot-update mode.
14. `pnpm test:studio:visual:update` is an intentional maintenance command only. A baseline change is reviewed like source code and committed only when the visual change is accepted.

## Validation ownership

Validation follows the cheapest reliable layer rather than duplicating the same requirement in every test runtime.

- **Static contract checks** own contract shape, token declaration/reference integrity, theme-only palette ownership, token-only theme scope, shared/feature selector boundaries, raw-palette prevention, `!important` prevention, design-system import ordering, and production-feature native-control boundaries.
- **Unit tests** own pure deterministic logic such as semantic-state catalogs, ordering, metadata mapping, and renderer-neutral helpers. Do not add DOM-emulated unit tests merely to duplicate browser behavior.
- **Real-browser behavioral tests** own keyboard/focus, dialog/native behavior, computed CSS/theme resolution, representative contrast, minimum target/layout behavior, reduced motion, selectable-collection navigation, and file-picker behavior.
- **UI Lab component inventory** is the review surface for reusable components. Production pages prove integration; they are not where shared states are invented or reviewed.
- **Visual regression** owns representative shared appearance only. The accepted matrix stays curated rather than snapshotting every production page/component state.
- **Visual evidence** from `.github/workflows/content-studio-visual.yml` uploads the Playwright report and actual/expected/diff results when comparison runs. A mismatch fails the workflow and the normal Studio browser Quality command.
- **Coverage metrics** are supporting diagnostics. Contract and scenario coverage are the acceptance target.

## Change workflow

When a visual or interaction defect appears in more than one feature, or a feature must reach into a shared selector to fix it, repair the shared layer first. Feature CSS should remain small enough that its purpose is obvious from feature-prefixed layout hooks.

When a repeated production pattern appears, first check the production-component inventory. Extend an existing component when the anatomy/interaction contract is the same; add a narrow new reusable component only when ownership is coherent. Do not add a feature-local lookalike because it is faster for one page.

When a token/theme change affects shared paint, update the centralized contract only when the public contract itself changes, then run static contract checks plus representative browser/theme, primitive, production-component and visual scenarios. When a shared behavior changes, prove browser-owned behavior in Playwright and add a unit test only if an independent pure rule actually exists.

When an intentional shared visual change modifies an accepted baseline, run `pnpm test:studio:visual:update` locally, review the changed PNGs, commit only the accepted baseline changes, and let CI prove compare-only mode from a clean checkout. Never make CI regenerate or auto-accept baselines.
