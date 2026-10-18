import runtimeManifest from "../../../config/runtime-assets.json" with { type: "json" };
import encounter from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json" with {
  type: "json",
};
import storyProduction from "../../../content/narrative/story-production.json" with { type: "json" };
import story from "../../../content/narrative/story.json" with { type: "json" };

// The bundled sources are copied directly from these Git-owned paths at deploy time.
// This revision identifies the repository snapshot whose canonical files are bundled.
export const CANONICAL_GIT_REVISION = "f5c1086faaf406142a43cd183e155c9e76a488bd";

export function loadRepositorySnapshot() {
  return {
    revision: CANONICAL_GIT_REVISION,
    story,
    storyProduction,
    encounter,
    runtimeManifest,
  } as const;
}
