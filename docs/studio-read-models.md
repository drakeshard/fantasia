# Fantasia Content Studio read models

GAME-STUDIO03 defines the read boundary consumed by later Content Studio workspaces. It does not move canonical gameplay/content authority into Supabase and it does not add provider mutation or Git write operations.

## Authority layering

A Studio entity read model is composed from separate authorities rather than flattened into a new source of truth:

- **Git canonical structured content** supplies gameplay/content facts. The initial proof adapters read `content/narrative/story.json` and `content/encounters/candidates/ch01-b01.layout-candidate.json` at one resolved repository revision.
- **Git non-canonical preview metadata** may enrich a view when explicitly marked non-canonical. `content/narrative/story-production.json` is the first proof.
- **Studio registry** supplies semantic identity metadata, lifecycle, versions, relations, validations, derivatives and audit/workflow state.
- **Provider/source authority** supplies source/master availability and media metadata. Provider location is replaceable metadata and is never the semantic asset identity.
- **Git runtime manifest** supplies accepted runtime mapping authority through `config/runtime-assets.json`.

Every normalized model includes provenance records with the authority kind, source, revision/observation context where available, and whether that source is canonical for the represented fact.

## Read-model contracts

`@fantasia/studio-read-model` contains shared presentation-safe contracts for collection rows, entity workspace summaries, validation/readiness, relations, asset versions, runtime derivatives, history, permissions, provenance and partial/error states.

Browser components should consume these normalized contracts. They must not join raw Git JSON, registry tables or provider objects themselves.

## Canonical Git adapter convention

Canonical adapters are server-side and must:

1. resolve one concrete Git revision before reading multiple files;
2. use repository paths as provenance, not as semantic identity;
3. preserve source data truthfully rather than copying canonical values into registry metadata;
4. emit stable semantic IDs for composition;
5. fail or emit an explicit partial state when source data is unavailable or malformed.

New Characters, Equipment, Skills, Enemies, Story or Maps & Encounters adapters should follow the same pattern and add deterministic tests for their identity mapping.

## Registry composition rules

Registry data augments canonical data. It never overrides canonical stats, skills, text, balance or encounter definitions. A conflicting registry display/cache field therefore cannot replace the canonical Git value.

The read layer explicitly surfaces partial and mixed states, including canonical-without-registry, registry-without-supported-canonical-source, path mismatch, missing current asset version, blocking validation on an approved entity, invalid relations and runtime mapping mismatches.

## Provider adapter boundary

`AssetSourceProviderAdapter` is provider-neutral. The current proof uses registry-observed source/version metadata and returns semantic asset ID, version, media/checksum metadata, source availability, provider kind and operation capabilities. Raw provider references are redacted by default; an authorized future server operation may return an opaque token, but URLs/file IDs must never become semantic identity.

GAME-STUDIO03 does not configure a live Google Drive credential inside the application runtime. Accordingly, the API reports provider freshness as `registry-observed-no-live-provider-fetch` rather than pretending a live Drive metadata check occurred. Later preview/download operations must remain behind the trusted server boundary.

## Runtime manifest

The runtime adapter is read-only. `config/runtime-assets.json` stays Git-owned. Registry derivative state is compared with accepted manifest mappings so runtime-ready/published mismatches remain visible. This issue never mutates or publishes the manifest.

## Search

`studio.read_models.get` supports semantic-ID and display-name/title text search plus entity type, lifecycle and readiness filters. Ordering is deterministic by entity type then semantic ID, with bounded offset/limit pagination. It uses normalized models only; no external search service is introduced.

## Partial and error semantics

The shared `StudioIssueCode` union distinguishes canonical unavailable/malformed, registry missing/path mismatch, current-version/source/provider problems, invalid relations, blocking/warning validation, runtime mapping mismatch and unauthorized/transient provider states. Later pages should present these distinctions instead of collapsing them into a generic error.

## Freshness and caching

The proof implementation performs no long-lived server cache. Each request resolves the current Git revision once, reads canonical files at that SHA, reads current registry state and returns explicit Git/registry freshness metadata. This avoids stale approval/publication state without adding Redis or another cache service.

## Security boundary

The browser sends only its Supabase Auth bearer token to the existing `studio-operations` Edge Function. The function validates the user through Supabase Auth, uses STUDIO02 membership/capabilities, accesses the private registry with server credentials and reads public canonical Git data server-side. Service-role/secret keys and future Drive credentials must never enter browser code. There is no Git write path and no provider mutation path.
