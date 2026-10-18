# Fantasia Content Studio read models

GAME-STUDIO03 defines the read boundary consumed by later Content Studio workspaces. It does not move canonical gameplay/content authority into Supabase and it does not add provider mutation or Git write operations.

## Authority layering

A Studio entity read model is composed from separate authorities rather than flattened into a new source of truth:

- **Git canonical structured content** supplies gameplay/content facts. The initial proof adapters consume the repository-owned `content/narrative/story.json` and `content/encounters/candidates/ch01-b01.layout-candidate.json` files bundled into the trusted server deployment from one recorded Git revision.
- **Git non-canonical preview metadata** may enrich a view when explicitly marked non-canonical. `content/narrative/story-production.json` is the first proof.
- **Studio registry** supplies semantic identity metadata, lifecycle, versions, relations, validations, derivatives and audit/workflow state.
- **Provider/source authority** supplies source/master availability and media metadata. Provider location is replaceable metadata and is never the semantic asset identity.
- **Git runtime manifest** supplies accepted runtime mapping authority through `config/runtime-assets.json`.

Every normalized model includes provenance records with the authority kind, source, revision/observation context where available, and whether that source is canonical for the represented fact.

## Read-model contracts

`packages/studio-read-model/src/index.ts` contains shared presentation-safe contracts for collection rows, entity workspace summaries, validation/readiness, relations, asset versions, runtime derivatives, history, permissions, provenance and partial/error states.

Browser components should consume these normalized contracts. They must not join raw Git JSON, registry tables or provider objects themselves.

## Canonical Git adapter convention

Canonical adapters are server-side and must:

1. consume one coherent repository snapshot and record the Git revision represented by that deployment;
2. use repository paths as provenance, not as semantic identity;
3. preserve source data truthfully rather than copying canonical values into registry metadata;
4. emit stable semantic IDs for composition;
5. fail or emit an explicit partial state when source data is unavailable or malformed.

The proof implementation bundles the real Git-owned JSON files into the Edge Function deployment instead of requiring a GitHub credential at runtime. This is important because Fantasia is a private repository: no GitHub token is exposed to browser code, stored in the registry, or required by this read path. A deployment is therefore an explicit Git snapshot, not a hidden long-lived cache.

New Characters, Equipment, Skills, Enemies, Story or Maps & Encounters adapters should follow the same pattern and add deterministic tests for their identity mapping. If a later adapter needs live repository access rather than a deployment snapshot, that access must remain server-side and must preserve the same provenance and credential boundary.

## Registry composition rules

Registry data augments canonical data. It never overrides canonical stats, skills, text, balance or encounter definitions. A conflicting registry display/cache field therefore cannot replace the canonical Git value.

The read layer explicitly surfaces partial and mixed states, including canonical-without-registry, registry-without-supported-canonical-source, path mismatch, missing current asset version, blocking validation on an approved entity, invalid relations and runtime mapping mismatches.

## Provider adapter boundary

`AssetSourceProviderAdapter` is provider-neutral. The current proof uses registry-observed source/version metadata and returns semantic asset ID, version, media/checksum metadata, source availability, provider kind and operation capabilities. Raw provider references are redacted by default; an authorized future server operation may return an opaque token, but URLs/file IDs must never become semantic identity.

GAME-STUDIO03 does not configure a live Google Drive credential inside the application runtime. Accordingly, the API reports provider freshness as `registry-observed-no-live-provider-fetch` rather than pretending a live Drive metadata check occurred. Later preview/download operations must remain behind the trusted server boundary.

## Runtime manifest

The runtime adapter is read-only. `config/runtime-assets.json` stays Git-owned and is bundled from the same recorded repository snapshot as the other canonical proof sources. Registry derivative state is compared with accepted manifest mappings so runtime-ready/published mismatches remain visible. This issue never mutates or publishes the manifest.

## Search

`studio.read_models.get` supports semantic-ID and display-name/title text search plus entity type, lifecycle and readiness filters. Ordering is deterministic by entity type then semantic ID, with bounded offset/limit pagination. It uses normalized models only; no external search service is introduced.

## Partial and error semantics

The shared `StudioIssueCode` union distinguishes canonical unavailable/malformed, registry missing/path mismatch, current-version/source/provider problems, invalid relations, blocking/warning validation, runtime mapping mismatch and unauthorized/transient provider states. Later pages should present these distinctions instead of collapsing them into a generic error.

## Freshness and caching

The proof implementation performs no long-lived application cache. Canonical repository files are bundled directly from a recorded Git revision during deployment and the read API reports that revision with `gitState: deployment-snapshot`. Registry state is read per request and reports its observation time; provider metadata is explicitly reported as registry-observed rather than live-fetched. A canonical repository change therefore requires a server deployment before the Studio advertises the new revision, making freshness explicit instead of silently serving an unversioned copy. No Redis or additional cache infrastructure is introduced.

## Security boundary

The browser sends only its Supabase Auth bearer token to the existing `studio-operations` Edge Function. The function validates the user through Supabase Auth, uses STUDIO02 membership/capabilities, accesses the private registry with server credentials and consumes Git-owned canonical files from the versioned server deployment. Service-role/secret keys and future Drive credentials must never enter browser code. No GitHub credential is required by the proof read path. There is no Git write path and no provider mutation path.
