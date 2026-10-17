import { readFile } from "node:fs/promises";

const wranglerPath = "wrangler.content-studio.jsonc";
const workflowPath = ".github/workflows/deploy-content-studio.yml";

const [wranglerRaw, workflow] = await Promise.all([
  readFile(wranglerPath, "utf8"),
  readFile(workflowPath, "utf8"),
]);

const wrangler = JSON.parse(wranglerRaw);
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

requireCondition(
  wrangler.name === "drakeshard-fantasia-content-studio",
  "Content Studio Wrangler config must use its dedicated Worker name.",
);
requireCondition(
  wrangler.assets?.directory === "./apps/content-studio/dist",
  "Content Studio Wrangler config must deploy only apps/content-studio/dist.",
);
requireCondition(
  wrangler.assets?.not_found_handling === "single-page-application",
  "Content Studio Wrangler config must retain SPA fallback handling.",
);

requireCondition(
  workflow.includes("name: Deploy Content Studio"),
  "Content Studio deployment workflow must keep its dedicated name.",
);
requireCondition(
  workflow.includes("workflow_dispatch:"),
  "Content Studio deployment must remain manually dispatched.",
);
requireCondition(
  workflow.includes("group: deploy-content-studio"),
  "Content Studio deployment must use independent concurrency.",
);
requireCondition(
  workflow.includes("pnpm install --frozen-lockfile"),
  "Content Studio deployment must use the committed frozen lockfile.",
);
requireCondition(
  workflow.includes("node scripts/prepare-shared-packages.mjs") &&
    workflow.includes("node scripts/verify-shared-packages.mjs"),
  "Content Studio deployment must preserve shared-package preparation and provenance verification.",
);
requireCondition(
  workflow.includes("pnpm --filter @fantasia/content-studio build"),
  "Content Studio deployment must build only the Content Studio application target.",
);
requireCondition(
  workflow.includes("test -f apps/content-studio/dist/index.html"),
  "Content Studio deployment must verify the expected built entry point before publishing.",
);
requireCondition(
  workflow.includes("wrangler@4.148.0 deploy --config wrangler.content-studio.jsonc"),
  "Content Studio deployment must use the pinned Wrangler version and dedicated config.",
);
requireCondition(
  !workflow.includes("wrangler.story-studio.jsonc") && !workflow.includes("apps/story-studio"),
  "Content Studio deployment must not deploy or mutate the legacy Story Studio target.",
);
requireCondition(
  !workflow.includes("--config wrangler.jsonc") && !workflow.includes("apps/web/dist"),
  "Content Studio deployment must not deploy or mutate the player-game target.",
);

if (failures.length > 0) {
  console.error("Content Studio deployment contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Content Studio deployment contract is valid.");
}
