# Fantasia Content Studio production page contract

Every production Content Studio page issue must define this contract before implementation. The shared 00D shell and templates are the default composition boundary; visual preference alone does not justify a parallel layout/component system.

Required fields:

1. **Purpose** — what operator job the page exists to support.
2. **Authorities** — authoritative source for every displayed field or state (for example Git canonical definitions, Drive source/master assets, registry workflow metadata, runtime verification evidence).
3. **Roles and actions** — which Studio roles may see or request each action. Real authorization remains a trusted backend concern; frontend visibility is not enforcement.
4. **Shared template** — Collection, Entity Workspace, Asset Board, Operational Queue, or Dashboard.
5. **Sections/tabs** — page-specific sections composed inside the selected template.
6. **Required states** — loading, empty, error, read-only, and unauthorized presentation, plus any page-specific unavailable state.
7. **Validation and history** — how lifecycle, independent validation/readiness, review/version history, and runtime/publication/verification facts are exposed without collapsing semantic dimensions.
8. **Responsive and accessibility requirements** — keyboard order, focus restoration, minimum target behavior, overflow strategy, compact/narrow behavior, and any screen-reader relationships required by the page.

Implementation requirements:

- Consume 00A tokens, 00B primitives, 00C semantic components, and 00D shell/templates.
- Keep the exact lifecycle `WORKING → CANDIDATE → IN REVIEW → APPROVED → FROZEN → RUNTIME READY → PUBLISHED → RETIRED`.
- Do not create page-local lifecycle aliases, approval models, provider authority, or mutable gameplay/content authority.
- Git remains canonical for structured game/content definitions and the accepted runtime manifest. Drive remains the current source/master asset authority. Registry state is workflow/metadata state, not canonical gameplay/balance data.
- Prefer specialization through typed slots, sections, or page-specific content components. A new shared template requires a concrete structural behavior that the existing five templates cannot express correctly.

The TypeScript `ProductionPageContract` in `src/ui/page-contract.ts` mirrors these required fields so downstream production-page implementations can declare the contract in code as part of review.
