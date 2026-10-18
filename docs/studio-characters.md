# Fantasia Content Studio — Characters

## Purpose

The production Characters module is the operational workspace for Fantasia character definitions. It composes Git-canonical character facts with registry lifecycle, validation, relation, asset and history evidence through the STUDIO03 read-model boundary.

## Authority

- Git canonical character source: `content/characters/characters.json`.
- Registry data is workflow/version/validation/relation metadata and never overrides canonical gameplay facts.
- Drive remains source/master authority for governed character art and other source assets; STUDIO06 only renders asset evidence already present in the registry/read model.
- The canonical deployment projection is generated into `supabase/functions/studio-operations/canonical-snapshot.generated.json`; the browser does not fetch the private repository directly.

## Supported authoring

STUDIO06 intentionally exposes one canonical mutation: `fantasia.character.v1` / `set-display-name`. Editors with `canonical.change.propose` submit the current full Git base revision to the STUDIO04 trusted canonical-change endpoint. The server validates the entire character document, preserves all stable semantic IDs, rejects stale bases, writes only to `studio/character/*`, and opens or updates a pull request.

A Git PR or merge is repository state only. It does not grant Layer 4 approval/freeze, and STUDIO06 does not publish runtime content.

## Roles and states

Viewers can browse collection/entity data and all available evidence but cannot propose canonical changes. Editors, Approvers and Admins receive only capabilities assigned by STUDIO02; no role bypass exists in browser code. Loading, empty, unavailable, read-only, invalid deep-link, validation and proposal failure states remain explicit.

## Entity workspace

The production entity workspace keeps the controlled tab contract: Overview, Gameplay, Skills, Equipment, Assets, Story, Relations, Validation and History. Missing relations or evidence are presented as empty/unregistered state and are never inferred from display-name text matches.

## Out of scope

STUDIO06 does not implement Layer 4 review/approval/freeze, Layer 5 runtime processing/publishing/verification, broad balance editing, source-asset mutation, or Story Studio cutover. Those remain owned by later roadmap issues.
