import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const change = read("supabase/functions/studio-operations/canonical-change.ts");
const contract = read("supabase/functions/studio-operations/canonical-change-contract.ts");
const github = read("supabase/functions/studio-operations/github-proposals.ts");
const edge = read("supabase/functions/studio-canonical-change/index.ts");
const auth = read("supabase/functions/studio-operations/contract.ts");
const browser = read("apps/content-studio/src/studio-session.ts");
const migration = read(
  "supabase/migrations/20261018093000_game_studio04_canonical_change_proposals.sql",
);

assert(
  change.includes('CANONICAL_STORY_PATH = "content/narrative/story.json"'),
  "STUDIO04 story canonical path must remain allowlisted.",
);
assert(
  change.includes('CANONICAL_STORY_NODE_CONTENT_TYPE = "fantasia.story.node.v1"'),
  "STUDIO04 story content type must remain allowlisted.",
);
assert(
  change.includes('CANONICAL_STORY_NODE_OPERATION = "set-node-summary"'),
  "STUDIO04 story mutation must remain typed.",
);
assert(
  change.includes("Stable narrative IDs changed during the proposal"),
  "STUDIO04 must guard stable narrative identity.",
);
assert(
  change.includes('CANONICAL_CHARACTER_PATH = "content/characters/characters.json"'),
  "STUDIO06 character canonical path must be explicitly allowlisted.",
);
assert(
  change.includes('CANONICAL_CHARACTER_CONTENT_TYPE = "fantasia.character.v1"'),
  "STUDIO06 character content type must be explicitly allowlisted.",
);
assert(
  change.includes('CANONICAL_CHARACTER_OPERATION = "set-display-name"'),
  "STUDIO06 character mutation must remain narrow and typed.",
);
assert(
  change.includes("Stable character semantic IDs changed during the proposal"),
  "STUDIO06 must guard stable character identity.",
);
assert(
  contract.includes('"canonical.change.proposal.create"') &&
    contract.includes('"canonical.change.proposal.get"'),
  "Proposal create/status contracts are missing.",
);
assert(
  auth.includes('"canonical.change.propose"'),
  "Proposal capability is missing from the shared role contract.",
);
assert(
  github.includes('const BASE_BRANCH = "main"') &&
    github.includes('const STUDIO_BRANCH_PREFIX = "studio/"'),
  "Git adapter must pin accepted base and Studio branch namespace.",
);
assert(
  github.includes("latestMain !== input.request.baseRevision"),
  "Canonical proposals must reject stale bases before mutation.",
);
assert(
  github.includes("branch: branchName") && !github.includes('branch: "main"'),
  "Canonical proposals must never write directly to main.",
);
assert(
  github.includes("base: BASE_BRANCH") && !github.includes("/merges"),
  "Canonical proposals must stop at PR creation and never auto-merge.",
);
assert(
  edge.includes('Deno.env.get("STUDIO_GITHUB_TOKEN")') && !browser.includes("STUDIO_GITHUB_TOKEN"),
  "GitHub credentials must stay server-side.",
);
assert(
  browser.includes("/functions/v1/studio-canonical-change") &&
    browser.includes("studioCanonicalChangeFunctionUrl") &&
    browser.includes('"set-display-name"'),
  "Characters UI must use the explicit trusted canonical-change boundary.",
);
assert(
  edge.includes("prepare_studio_canonical_change_proposal") &&
    edge.includes("record_studio_canonical_change_proposal_result"),
  "Trusted endpoint must record proposal audit state.",
);
assert(
  migration.includes("canonical_change_proposals") &&
    migration.includes("canonical_change_proposal_events") &&
    migration.includes("canonical.change.propose"),
  "Proposal audit schema/capability is missing.",
);
assert(
  migration.includes("from public, anon, authenticated") && migration.includes("to service_role"),
  "Proposal RPCs must remain service-role-only.",
);
assert(
  migration.includes("canonical_change_proposal_events_append_only"),
  "Proposal events must remain append-only.",
);
assert(
  !contract.includes('"approved"') && !contract.includes('"frozen"'),
  "Repository proposal state must not redefine Layer-4 approval/freeze states.",
);
console.log("Studio canonical Git proposal boundary: OK");
