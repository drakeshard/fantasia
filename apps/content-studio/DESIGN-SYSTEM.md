# Fantasia Content Studio design-system ownership

This map is implementation guidance for the frozen Content Studio architecture. It does not replace controlled Drive architecture documents.

## Dependency direction

`tokens → theme → low-level primitives → reusable production components → semantics → workspace/composites → feature layout`

A lower layer never imports or targets a higher layer. Feature CSS never restyles a shared component.

## Files and owners

| Layer | Files | Owns | Must not own |
| --- | --- | --- | --- |
| Design-system contract | `design-system-contract.json` | active title-theme identity/scope, required public theme tokens, representative accessibility contrast pairs and thresholds | CSS implementation, feature layout, component DOM anatomy |
| Structural tokens | `src/styles/tokens.css` | typography scale, spacing, target/control sizes, radii, motion, z-index, breakpoints | palette, gradients, feature layout |
| Fantasia theme | `src/styles/theme-fantasia-midnight.css` | palette, semantic colors, surfaces/material recipes, shadows, component paint variables, lifecycle/validation colors | component DOM anatomy, feature layout |
| Design-system entrypoint | `src/styles/design-system.css` | ordered imports for the shared system | feature styling |
| Low-level primitives | `src/ui/primitives.tsx`, `src/ui/primitives/*`, `src/ui/primitives.css` | Button/IconButton, fields/select/checkbox, tabs, dialog/drawer, surfaces, feedback, table/list and browser-owned interaction states | asset/character-specific layout |
| Reusable production components | `src/ui/components.tsx`, `src/ui/components/*`, `src/ui/components.css` | Section/DetailSection, KeyValueList, StatusGroup, FilterBar, SelectableCollection/Row, MasterDetailLayout, FilePicker | feature facts, registry semantics, provider-specific policy |
| Semantic components | `src/ui/semantic.tsx`, `src/ui/semantic.css` | lifecycle, validation, review, readiness, provenance and runtime semantics | feature-specific styling |
| Workspace structure | `src/ui/workspace.tsx`, `src/ui/workspace.css` | shell, workspace templates, responsive structural composition | title feature details |
| Shared composite presentation | `src/ui/composites.css`, `src/ui/entity-asset.*` | repeated shell/workspace/entity/asset-board presentation | one-off feature overrides |
| Feature composition | `src/features/**`, `src/styles/production-*.css`, `src/styles/studio-auth.css` | feature-prefixed content arrangement and domain-specific visuals | raw interactive controls, `.ui-*`, `.studio-component-*`, shared workspace/semantic selectors, palette/material copies |
| UI Lab only | `src/styles/foundation-preview.css`, `src/styles/material-fidelity.css`, `src/component-inventory.tsx` | reference/lab composition and component inventory | production shared component styling |
| Visual regression | `tests/studio/visual/**`, `playwright.content-studio.visual.config.ts` | reviewed representative shared visual baselines and deterministic Chromium comparison | behavioral/accessibility assertions, automatic baseline acceptance |

## Production component inventory

The shared production layer exists to stop domain pages from recreating common Studio UI anatomy.

- `Section` / `DetailSection`: repeated content framing and local section actions.
- `KeyValueList` / `KeyValue`: structured facts and technical metadata without page-local definition-list styling.
- `StatusGroup`: compact lifecycle/readiness/status composition without inventing status meaning.
- `FilterBar`: search/primary/secondary-filter layout and filter action placement.
- `SelectableCollection` / `SelectableRow`: single-selection collections with Arrow/Home/End keyboard behavior, selected state separate from focus, and shared minimum targets.
- `MasterDetailLayout`: responsive collection/detail composition used by asset-style workspaces.
- `FilePicker`: the sole production owner of the hidden native file input, drop/select/remove interaction and selected-file summary.
- Low-level primitives continue to own actual Buttons, fields, selects, checkboxes, Tabs, Dialog/Drawer, surfaces and feedback states.

These components are intentionally explicit composition tools, not a schema-driven generic admin renderer.

## Rules

1. A feature needing a different Button, field, Dialog, Tab or Surface appearance changes the shared primitive or adds an explicit reusable primitive variant. It does not target `.ui-*` or pass `className` to repaint a shared root.
2. A repeated production pattern such as filters, selectable results, fact grids, file selection or master/detail composition belongs in the reusable production layer. Assets and Characters are proof consumers; Equipment/Skills/Enemies must consume this layer rather than clone it.
3. Production feature TSX must not declare raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<dialog>` controls. The shared FilePicker is the documented exception because it encapsulates its hidden native file input.
4. Feature CSS may style domain content placed *inside* shared components, but it may not target `.ui-*`, `.studio-component-*`, workspace or semantic roots. Use outer feature wrappers for layout.
5. Raw palette values and `--studio-color-*` palette tokens belong only to the Fantasia theme or purpose-built visual-reference assets. Shared and production feature CSS consume semantic/component theme variables.
6. The theme is a token-remapping scope. It must not target body/component/feature DOM. Base/shared CSS owns applying theme tokens to DOM anatomy.
7. Public `--studio-*` declarations live only in `tokens.css` or the active title theme. References elsewhere must resolve to that controlled contract; dead compatibility aliases are not added merely to preserve obsolete vocabulary.
8. `design-system-contract.json` is the single machine-readable source for title-theme identity, required public theme tokens and representative contrast requirements. Static and browser validation consume the same file.
9. Normal text contrast pairs use at least 4.5:1. Non-text focus/state indicators use at least 3:1. Fix the owning semantic/theme token rather than weakening a threshold.
10. Keyboard focus is separate from selected/current state. Shared controls keep visible `:focus-visible` treatment, >=44px targets, disabled/pending behavior and reduced-motion handling.
11. `!important` in production feature CSS is an ownership bug. Fix the owning component/layer instead.
12. `scripts/check-content-studio-design-system.mjs` is a required Quality gate. It enforces token/theme ownership, feature/shared CSS boundaries, raw native-control prevention and shared-root className escape prevention.
13. Accepted visual baselines are repository files under `tests/studio/visual/__snapshots__/{projectName}`. CI uses compare-only `pnpm test:studio:visual`; it never runs snapshot-update mode.
14. `pnpm test:studio:visual:update` is an intentional maintenance command only. A baseline change is reviewed like source code and committed only when the visual change is accepted.

## State and interaction contract

Content Studio standardizes observable semantic state and component policy without introducing a universal state runtime. Native/browser behavior remains authoritative where the platform already owns it; shared primitives add only the policy and accessibility wiring required by the Studio contract.

- **disabled** means the control is unavailable for interaction. Use native `disabled` semantics where the underlying control supports them.
- **readonly** means content remains visible and normally focusable but is not modifiable where the underlying control supports readonly semantics. It is not interchangeable with disabled.
- **pending / busy** means work associated with an operation is in progress. Busy is semantically distinct from disabled. The shared Content Studio `Button` deliberately combines `pending` with native disabled behavior to prevent duplicate command commitment; that is Button-specific Studio policy, not a global rule that busy always disables a control.
- **invalid** means the field or value is invalid according to the owning validation contract. Invalid state is independent from whether an inline error message is currently rendered. An `error` string implies invalid state and owns its `aria-describedby` relationship; `invalid` may also be supplied without an error string when validation evidence is presented elsewhere.
- **selected / current** identify semantic choice or current item. They are not focus state.
- **focused** is browser-owned interaction state. Roving focus position is internal behavior and must not become a second selected-value source of truth.
- **open** identifies committed visibility/state for shared overlays such as Dialog. Escape/close interactions request an open-state change; browser effects and focus restoration follow the committed component state.
- **intent** is a user-requested action such as activation, selection, or dismissal. It is not interchangeable with committed state and must not create duplicate semantic state stores.

Visual configuration such as variant, surface kind, density, or layout is not semantic state. Derived ARIA and styling states should come from the authoritative semantic state rather than being tracked independently.

Shared accessibility styling must remain usable with `prefers-reduced-motion` and `forced-colors: active`. Forced-colors handling belongs in base/shared component CSS, not production feature overrides. Focus, invalid, selected, disabled, and pending states must retain non-color-only or system-color-visible affordances in that mode.

## Validation ownership

Validation follows the cheapest reliable layer rather than duplicating the same requirement in every test runtime.

- **Static contract checks** own contract shape, token integrity, theme-only palette ownership, shared/feature selector boundaries, raw native-control prevention, className escape prevention, `!important` prevention and import ordering.
- **Unit tests** own pure deterministic logic such as semantic-state catalogs, ordering and metadata mapping.
- **Real-browser behavioral tests** own keyboard/focus, Dialog/native behavior, selectable collection keyboard semantics, FilePicker relationships, computed CSS/theme resolution, representative contrast, forced-colors behavior, minimum targets/layout behavior, reduced motion and compact overflow.
- **UI Lab component inventory** is the review surface for primitive/production-component states. Production pages are not used as the component laboratory.
- **Visual regression** owns a curated representative shared appearance matrix, including semantic dimensions, global Studio shell and production component inventory. It is not a screenshot of every page/state.
- **Visual evidence** from `.github/workflows/content-studio-visual.yml` uploads report/actual/expected/diff evidence. A mismatch fails the workflow and normal Studio browser Quality command.

## Change workflow

When a visual or interaction defect appears in multiple features, or a feature needs to reach into a shared selector, stop and repair the owning primitive/production component first. Feature CSS should stay small enough that its purpose is domain layout/content arrangement.

When an intentional shared visual change modifies an accepted baseline, run `pnpm test:studio:visual:update` in the controlled browser environment, review the changed PNGs, commit only accepted baseline changes, and let CI prove compare-only mode from a clean checkout. CI never regenerates or auto-accepts baselines.
