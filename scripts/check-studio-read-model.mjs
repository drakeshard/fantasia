import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = await readFile(path.join(root, "packages/studio-read-model/src/index.ts"), "utf8");
const api = await readFile(
  path.join(root, "supabase/functions/studio-operations/index.ts"),
  "utf8",
);
const adapters = await readFile(
  path.join(root, "supabase/functions/studio-operations/read-model-adapters.ts"),
  "utf8",
);
const repositorySnapshot = await readFile(
  path.join(root, "supabase/functions/studio-operations/repository-snapshot.ts"),
  "utf8",
);
const generatedSnapshotText = await readFile(
  path.join(root, "supabase/functions/studio-operations/canonical-snapshot.generated.json"),
  "utf8",
);
const generatedSnapshot = JSON.parse(generatedSnapshotText);
const generator = await readFile(
  path.join(root, "scripts/generate-studio-canonical-snapshot.mjs"),
  "utf8",
);
const migration = await readFile(
  path.join(root, "supabase/migrations/20261018081500_game_studio03_registry_read_snapshot.sql"),
  "utf8",
);
const docs = await readFile(path.join(root, "docs/studio-read-models.md"), "utf8");
const browserFiles = [
  await readFile(path.join(root, "apps/content-studio/src/studio-session.ts"), "utf8"),
];

function requireText(source, fragment, message) {
  if (!source.includes(fragment))
    throw new Error(message ?? `Missing required fragment: ${fragment}`);
}
function forbid(source, pattern, message) {
  if (pattern.test(source)) throw new Error(message);
}

for (const required of [
  "StudioEntityReadModel",
  "StudioCollectionRow",
  "StudioValidationSummary",
  "StudioRelationSummary",
  "StudioAssetSummary",
  "StudioHistorySummary",
  "StudioProvenance",
  "StudioReadIssue",
])
  requireText(contract, required, `Shared Studio read model is missing ${required}.`);

requireText(
  api,
  "STUDIO_READ_MODELS_GET",
  "Trusted Operations API must expose the read-model operation.",
);
requireText(
  api,
  "get_studio_registry_read_snapshot",
  "Read-model API must compose through the private registry snapshot RPC.",
);
requireText(
  api,
  "loadRepositorySnapshot()",
  "Read-model API must use the versioned canonical repository snapshot.",
);
requireText(
  api,
  'gitState: "deployment-snapshot"',
  "Read-model freshness must disclose deploy-time Git snapshot semantics.",
);
requireText(
  api,
  "exposeProviderReference: false",
  "Provider references must be redacted by default.",
);
requireText(
  adapters,
  "content/narrative/story.json",
  "Story canonical authority must remain story.json.",
);
requireText(
  adapters,
  "content/narrative/story-production.json",
  "Story production preview authority must remain distinct.",
);
requireText(
  adapters,
  "config/runtime-assets.json",
  "Runtime manifest adapter must use the Git-owned manifest.",
);
requireText(
  adapters,
  "AssetSourceProviderAdapter",
  "Provider-neutral asset source adapter is required.",
);
requireText(
  repositorySnapshot,
  "canonical-snapshot.generated.json",
  "Trusted runtime must consume the generated canonical read projection.",
);
requireText(
  repositorySnapshot,
  "RepositoryReadSnapshot",
  "Canonical deployment snapshot must have a typed boundary.",
);
for (const sourcePath of [
  "content/narrative/story.json",
  "content/narrative/story-production.json",
  "content/encounters/candidates/ch01-b01.layout-candidate.json",
  "config/runtime-assets.json",
])
  requireText(
    generator,
    sourcePath,
    `Snapshot generator must read Git-owned source ${sourcePath}.`,
  );

if (
  !generatedSnapshot ||
  typeof generatedSnapshot.revision !== "string" ||
  !Array.isArray(generatedSnapshot.storyRows) ||
  !Array.isArray(generatedSnapshot.encounter) ||
  !generatedSnapshot.runtimeManifest
) {
  throw new Error("Generated Studio canonical deployment snapshot is malformed.");
}
const snapshotCheck = spawnSync(
  process.execPath,
  [path.join(root, "scripts/generate-studio-canonical-snapshot.mjs"), "--check"],
  {
    cwd: root,
    env: { ...process.env, CANONICAL_GIT_REVISION: generatedSnapshot.revision },
    encoding: "utf8",
  },
);
if (snapshotCheck.status !== 0) {
  throw new Error(
    snapshotCheck.stderr || snapshotCheck.stdout || "Generated snapshot check failed.",
  );
}

requireText(
  migration,
  "studio_registry.has_capability(p_user_id, 'studio.read')",
  "Registry snapshot must enforce STUDIO02 read capability.",
);
forbid(
  migration,
  /insert\s+into|update\s+studio_registry|delete\s+from/i,
  "STUDIO03 registry snapshot must remain read-only.",
);
forbid(
  `${adapters}\n${repositorySnapshot}\n${generator}`,
  /GITHUB_TOKEN|GOOGLE_(API|DRIVE).*KEY|SUPABASE_(SECRET|SERVICE_ROLE)/i,
  "Provider/Git adapters must not hard-code privileged credentials.",
);
forbid(
  repositorySnapshot,
  /raw\.githubusercontent\.com|api\.github\.com/i,
  "Canonical deployment snapshot must not depend on private-repository network fetches.",
);
requireText(
  docs,
  "This issue never mutates or publishes the manifest.",
  "Documentation must keep the runtime manifest read-only in STUDIO03.",
);

for (const browser of browserFiles) {
  forbid(
    browser,
    /SUPABASE_(SECRET|SERVICE_ROLE)|service[_-]?role|GITHUB_TOKEN|GOOGLE_(API|DRIVE).*KEY/i,
    "Browser code must not contain privileged provider/server credentials.",
  );
}

console.log("Studio read-model authority, provider, and security boundary check passed.");
