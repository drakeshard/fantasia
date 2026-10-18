import type {
  RuntimeManifestSnapshot,
  StudioCanonicalSummary,
} from "../../../packages/studio-read-model/src/index.ts";
import snapshot from "./canonical-snapshot.generated.json" with { type: "json" };

export interface RepositoryReadSnapshot {
  readonly revision: string;
  readonly canonicalModels: readonly StudioCanonicalSummary[];
  readonly runtimeManifest: RuntimeManifestSnapshot;
}

// This compact deployment snapshot is mechanically projected from Git-owned canonical
// sources by scripts/generate-studio-canonical-snapshot.mjs. Its revision records the
// repository state represented by the bundled read projection.
export function loadRepositorySnapshot(): RepositoryReadSnapshot {
  return snapshot as RepositoryReadSnapshot;
}
