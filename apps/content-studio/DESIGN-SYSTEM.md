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
| Reusable production components | `src/ui/components.tsx`, `src/ui/components/*`, `src/ui/components.css` | Section/DetailSection, KeyValueList, StatusGroup, FilterBar, SelectableCollection/Row, MasterDetailLayout, FilePicker, collection/media/detail presentation patterns | feature facts, registry semantics, provider-specific policy |
| Semantic components | `src/ui/semantic.tsx`, `src/ui/semantic.css` | lifecycle, validation, review, readiness, provenance and runtime semantics | feature-specific styling |
| Workspace structure | `src/ui/workspace.tsx`, `src/ui/workspace.css` | shell, workspace templates, responsive structural composition | title feature details |
| Shared composite presentation | `src/ui/composites.css`, `src/ui/entity-asset.*` | repeated shell/workspace/entity/asset-board presentation | one-off feature overrides |
| Feature composition | `src/features/**`, `src/styles/production-*.css`, `src/styles/studio-auth.css` | feature-prefixed content arrangement and domain-specific visuals | raw interactive controls, `.ui-*`, `.studio-component-*`, shared workspace/semantic selectors, palette/material copies |
| UI Lab only | `src/styles/foundation-preview.css`, `src/styles/material-fidelity.css`, `src/component-inventory.tsx` | manual reference/review composition and component inventory | production authority or enduring CI behavior contracts |

## Production component inventory

The shared production layer exists to stop domain pages from recreating common Studio UI anatomy.

- `Section` / `DetailSection`: repeated content framing and local section actions.
- `KeyValueList` / `KeyValue`: structured facts and technical metadata without page-local definition-list styling.
- `StatusGroup`: compact lifecycle/readiness/status composition without inventing status meaning.
- `FilterBar`: search/primary/secondary-filter layout and filter action placement.
- `SelectableCollection` / `SelectableRow`: single-selection collections with Arrow/Home/End keyboard behavior, selected state separate from focus, and shared minimum targets.
- `MasterDetailLayout`: responsive collection/detail composition used by asset-style workspaces.
- `FilePicker`: the sole production owner of the hidden native file input, drop/select/remove interaction and selected-file summary.
- `CollectionPanel`: standard bordered collection/browser frame with title, count and local actions.
- `MediaCollectionItem`: reusable visual-first selectable-row content anatomy with type/media marker, primary identity, subtitle, trailing fact and status/meta slot. It does not fetch media itself.
- `DetailPanel`: selected-record framing with shared identity/header/status anatomy.
- `PreviewSummaryLayout` / `MediaPreview`: reusable preview-dominant split and provider-agnostic preview/empty treatment for image/media-oriented records.
- `UtilityStatus`: compact provider/service status for workspace utility areas; normal healthy integration state must not dominate the page hierarchy.
- `StatusTag` / `DetailRow`: compact generic status and repeated evidence/history row presentation. Domain/semantic meaning still comes from the owning feature or semantic layer.
- Low-level primitives continue to own actual Buttons, fields, selects, checkboxes, Tabs, Dialog/Drawer, surfaces and feedback states.

These components are explicit composition tools, not a schema-driven generic admin renderer. Assets is the first production consumer of the media/detail family; later Equipment, Skills, Enemies and other workspaces should reuse the applicable patterns rather than cloning their paint/layout. The UI Lab may demonstrate components for human review, but the lab is not a production workflow and is not an enduring automated-test target.

## Rules

1. A feature needing a different Button, field, Dialog, Tab or Surface appearance changes the shared primitive or adds an explicit reusable primitive variant. It does not target `.ui-*` or pass `className` to repaint a shared root.
2. A repeated production pattern such as filters, selectable results, fact grids, file selection, collection panels, media rows, preview/summary detail, evidence rows or master/detail composition belongs in the reusable production layer. Assets and Characters are current consumers; later workspaces must consume this layer rather than clone it.
3. Production feature TSX must not declare raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<dialog>` controls. The shared FilePicker is the documented exception because it encapsulates its hidden native file input.
4. Feature CSS may style domain content placed inside shared components, but it may not target `.ui-*`, `.studio-component-*`, workspace or semantic roots. Use outer feature wrappers for layout.
5. Raw palette values and `--studio-color-*` palette tokens belong only to the Fantasia theme or purpose-built visual-reference assets. Shared and production feature CSS consume semantic/component theme variables.
6. The theme is a token-remapping scope. It must not target body/component/feature DOM. Base/shared CSS owns applying theme tokens to DOM anatomy.
7. Public `--studio-*` declarations live only in `tokens.css` or the active title theme. References elsewhere must resolve to that controlled contract.
8. `design-system-contract.json` is the single machine-readable source for title-theme identity, required public theme tokens and representative contrast requirements.
9. Normal text contrast pairs use at least 4.5:1. Non-text focus/state indicators use at least 3:1. Fix the owning semantic/theme token rather than weakening a threshold.
10. Keyboard focus is separate from selected/current state. Shared controls keep visible `:focus-visible` treatment, >=44px targets, disabled/pending behavior and reduced-motion handling.
11. `!important` in production feature CSS is an ownership bug. Fix the owning component/layer instead.
12. `scripts/check-content-studio-design-system.mjs` is the machine-enforced ownership gate for token/theme ownership, feature/shared CSS boundaries, native-control prevention and shared-root escape prevention.

## State and interaction contract

Content Studio standardizes observable semantic state and component policy without introducing a universal state runtime. Native/browser behavior remains authoritative where the platform owns it; shared primitives add only policy and accessibility wiring required by production workflows.

- **disabled** means the control is unavailable for interaction. Use native `disabled` semantics where supported.
- **readonly** means content remains visible and normally focusable but is not modifiable. It is not interchangeable with disabled.
- **pending / busy** means work is in progress. The shared Studio `Button` deliberately combines `pending` with native disabled behavior to prevent duplicate command commitment; this is Button-specific policy.
- **invalid** means the field/value is invalid according to the owning validation contract. An `error` string implies invalid state and owns its `aria-describedby` relationship; `invalid` may also exist without inline error copy when evidence is presented elsewhere.
- **selected / current** identify semantic choice or current item. They are not focus state.
- **focused** is browser-owned interaction state. Roving focus is internal behavior and must not become a second selected-value source of truth.
- **open** identifies committed visibility/state for overlays such as Dialog.
- **intent** is a user-requested action such as activation, selection, or dismissal. It is not interchangeable with committed state.

Visual configuration such as variant, surface kind, density, or layout is not semantic state. Derived ARIA and styling states come from authoritative semantic state rather than parallel state stores.

Shared accessibility styling must remain usable with reduced motion and forced-colors/high-contrast environments. A production workflow regression caused by those modes belongs in the relevant production browser flow; the UI Lab is not retained as a synthetic CI proxy.

## Validation ownership

Validation follows the lowest reliable owner and protects durable behavior rather than the history of how a branch was implemented.

- **Static contract checks** own architecture and source-shape invariants: token integrity, theme-only palette ownership, shared/feature selector boundaries, raw native-control prevention, className escape prevention, `!important` prevention, import ordering, deployment structure and other repository contracts.
- **Unit tests** own deterministic business/domain contracts such as authorization capabilities, canonical-change allowlists and mutation rules, Dashboard projection, read-model authority/provenance, registry rules and controlled identity catalogs.
- **Real-browser tests** own complete production operator workflows where browser integration matters: sign-in/authorization/fail-closed behavior, Dashboard operational truth, Character browse/proposal flow, Asset search/create/source/version workflows, trusted multipart boundaries and production interaction regressions that cannot be proven reliably below the browser.
- **UI Lab** is a manual development/review surface. Do not add permanent Playwright tests or screenshot baselines merely because a new primitive, component, template, state fixture or branch was introduced there.
- **Responsive/accessibility browser coverage** is added only when a real production workflow has materially different interaction or failure risk at that environment. Do not multiply every test across viewports or keep synthetic component tests solely to prove CSS values.

A new test must answer: **which durable production/business failure does this prevent, and why is this the lowest reliable owner?** If the answer is only “this component/fixture was added in this PR,” the test does not belong in the enduring suite.

## Change workflow

When a visual or interaction defect appears in multiple production features, or a feature needs to reach into a shared selector, repair the owning primitive/production component first. Feature CSS should stay limited to domain layout/content arrangement.

Use the UI Lab for manual inspection while developing shared UI, but validate release-critical behavior through static contracts, deterministic unit tests, and real production operator workflows. Do not create a permanent automated suite for temporary branch scaffolding.
