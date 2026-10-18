import snapshot from "./canonical-snapshot.generated.json" with { type: "json" };

// This compact deployment snapshot is mechanically projected from Git-owned canonical
// sources by scripts/generate-studio-canonical-snapshot.mjs. Its revision records the
// repository state represented by the bundled read projection.
export function loadRepositorySnapshot() {
  return snapshot;
}
