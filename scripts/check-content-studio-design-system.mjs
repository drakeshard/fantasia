import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const studioRoot = path.join(root, "apps", "content-studio");
const stylesRoot = path.join(studioRoot, "src", "styles");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  console.error(`Content Studio design-system check failed: ${message}`);
  process.exitCode = 1;
}

function productionStyleFiles() {
  return fs
    .readdirSync(stylesRoot)
    .filter((name) => name === "studio-auth.css" || /^production-.*\.css$/.test(name))
    .map((name) => path.join(stylesRoot, name));
}

const forbiddenSharedSelectors = [
  ".ui-",
  ".studio-shell",
  ".studio-workspace-header",
  ".studio-template",
  ".studio-collection",
  ".studio-semantic",
  ".studio-readiness",
  ".studio-provider-reference",
  ".studio-relation-card",
  ".studio-runtime-card",
];

for (const file of productionStyleFiles()) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);

  for (const selector of forbiddenSharedSelectors) {
    if (source.includes(selector)) {
      fail(`${relative} reaches into shared selector ${selector}; use a feature-prefixed hook or change the shared owner.`);
    }
  }

  if (/#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/.test(source)) {
    fail(`${relative} contains a raw palette value; feature CSS must consume Studio theme variables.`);
  }

  if (source.includes("!important")) {
    fail(`${relative} contains !important; fix ownership/specificity instead.`);
  }
}

const tokens = read("apps/content-studio/src/styles/tokens.css");
if (/#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/.test(tokens)) {
  fail("tokens.css contains palette values; structural tokens must stay theme-neutral.");
}

const theme = read("apps/content-studio/src/styles/theme-fantasia-midnight.css");
if (!theme.includes('[data-studio-theme="fantasia-midnight"]')) {
  fail("theme-fantasia-midnight.css must scope the title theme explicitly.");
}

const fidelity = read("apps/content-studio/src/styles/material-fidelity.css");
for (const selector of forbiddenSharedSelectors) {
  if (fidelity.includes(selector)) {
    fail(`material-fidelity.css still styles shared selector ${selector}; production paint belongs to shared UI owners.`);
  }
}

const entrypoint = read("apps/content-studio/src/styles/design-system.css");
const requiredImports = [
  '"./tokens.css"',
  '"./theme-fantasia-midnight.css"',
  '"./base.css"',
  '"../ui/primitives.css"',
  '"../ui/semantic.css"',
  '"../ui/workspace.css"',
  '"../ui/composites.css"',
  '"../ui/entity-asset.css"',
];
let previous = -1;
for (const requiredImport of requiredImports) {
  const index = entrypoint.indexOf(requiredImport);
  if (index === -1) {
    fail(`design-system.css is missing ${requiredImport}.`);
    continue;
  }
  if (index < previous) fail(`design-system.css imports ${requiredImport} out of ownership order.`);
  previous = index;
}

if (!process.exitCode) {
  console.log("Content Studio design-system ownership: OK");
}
