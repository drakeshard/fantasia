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
const migration = read(
  "supabase/migrations/20261018093000_game_studio04_canonical_change_proposals.sql",
);

assert(
  change.includes('CANONICAL_STORY_PATH = "content/narrative/story.json"'),
  "STUDIO04 must keep the first canonical path explicitly allowlisted.",
);
assert(
  change.includes('CANONICAL_STORY_NODE_CONTENT_TYPE = "fantasia.story.node.v1"'),
  "STUDIO04 must keep the first content type explicitly allowlisted.",
);
assert(
  change.includes('CANONICAL_STORY_NODE_OPERATION = "set-node-summary"'),
  "STUDIO04 must keep the first mutation operation explicitly typed.",
);
assert(
  change.includes("Stable narrative IDs changed during the proposal"),
  "STUDIO04 must guard stable narrative identity.",
);
assert(
  contract.includes('"canonical.change.proposal.create"') &&
    contract.includes('"canonical.change.proposal.get"'),
  "STUDIO04 proposal create/status contracts are missing.",
);
assert(
  auth.includes('"canonical.change.propose"'),
  "STUDIO04 proposal capability is missing from the shared role contract.",
);
assert(
  github.includes('const BASE_BRANCH = "main"') &&
    github.includes('const STUDIO_BRANCH_PREFIX = "studio/story/"'),
  "STUDIO04 Git adapter must pin accepted base and Studio branch namespace.",
);
assert(
  github.includes("latestMain !== input.request.baseRevision"),
  "STUDIO04 must reject stale canonical bases before mutation.",
);
assert(
  github.includes('branch: branchName') && !github.includes('branch: "main"'),
  "STUDIO04 must never write canonical content directly to main.",
);
assert(
  github.includes('base: BASE_BRANCH') && !github.includes("/merges"),
  "STUDIO04 must stop at pull-request proposal and never auto-merge.",
);
assert(
  edge.includes('Deno.env.get("STUDIO_GITHUB_TOKEN")') &&
    !read("apps/content-studio/src/studio-session.ts").includes("STUDIO_GITHUB_TOKEN"),
  "GitHub credentials must stay server-side.",
);
assert(
  edge.includes("prepare_studio_canonical_change_proposal") &&
    edge.includes("record_studio_canonical_change_proposal_result"),
  "STUDIO04 trusted endpoint must record proposal audit state.",
);
assert(
  migration.includes("canonical_change_proposals") &&
    migration.includes("canonical_change_proposal_events") &&
    migration.includes("canonical.change.propose"),
  "STUDIO04 proposal audit schema/capability is missing.",
);
assert(
  migration.includes("from public, anon, authenticated") &&
    migration.includes("to service_role"),
  "STUDIO04 proposal RPCs must remain service-role-only.",
);
assert(
  migration.includes("canonical_change_proposal_events_append_only"),
  "STUDIO04 proposal events must remain append-only.",
);
assert(
  !contract.includes('"approved"') && !contract.includes('"frozen"'),
  "Repository proposal state must not redefine Layer-4 approval/freeze states.",
);

console.log("Studio canonical Git proposal boundary: OK");
