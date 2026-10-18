import {
  STUDIO_READ_MODEL_VERSION,
  type RegistrySnapshot,
  type RuntimeManifestSnapshot,
  type StudioEntityReadModel,
  type StudioPermissionPresentation,
} from "../../../packages/studio-read-model/src/index.ts";

export function registryOnlyReadModels(
  registry: RegistrySnapshot,
  knownCanonicalIds: ReadonlySet<string>,
  runtimeManifest: RuntimeManifestSnapshot,
  permissions: StudioPermissionPresentation,
): readonly StudioEntityReadModel[] {
  return registry.contentEntities
    .filter((entity) => !knownCanonicalIds.has(entity.semantic_id))
    .map((entity) => ({
      readModelVersion: STUDIO_READ_MODEL_VERSION,
      semanticId: entity.semantic_id,
      entityType: entity.entity_type,
      displayName: entity.display_label ?? entity.semantic_id,
      canonical: {
        semanticId: entity.semantic_id,
        entityType: entity.entity_type,
        displayName: entity.display_label ?? entity.semantic_id,
        canonicalPath: entity.canonical_git_path ?? "[missing]",
        canonicalData: {},
        provenance: {
          authority: "git" as const,
          source: entity.canonical_git_path ?? "[missing]",
          canonical: true,
        },
      },
      lifecycle: entity.lifecycle,
      schemaVersion: entity.schema_version,
      validations: [],
      relations: registry.entityRelations
        .filter((relation) => relation.source_entity_id === entity.semantic_id)
        .map((relation) => ({
          type: relation.relation_type,
          targetSemanticId: relation.target_entity_id,
          valid: knownCanonicalIds.has(relation.target_entity_id),
        })),
      assets: [],
      history: registry.changeEvents
        .filter((event) => event.entity_id === entity.semantic_id)
        .slice(0, 20)
        .map((event) => ({
          eventType: event.event_type,
          occurredAt: event.occurred_at,
          sourceKind: event.source_kind,
        })),
      permissions,
      provenance: [
        {
          authority: "registry" as const,
          source: "studio_registry",
          observedAt: registry.observedAt,
          canonical: false,
        },
        {
          authority: "runtime-manifest" as const,
          source: runtimeManifest.path,
          revision: runtimeManifest.revision,
          canonical: true,
        },
      ],
      issues: [
        {
          code: "canonical-unavailable" as const,
          severity: "blocking" as const,
          message: entity.canonical_git_path
            ? `Registry entity points to canonical Git path ${entity.canonical_git_path}, but no supported canonical adapter produced it.`
            : "Registry entity has no canonical Git path.",
          source: "git" as const,
        },
      ],
    }));
}
