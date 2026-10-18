import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const studioRoot = path.join(root, "apps", "content-studio");
const stylesRoot = path.join(studioRoot, "src", "styles");
const uiRoot = path.join(studioRoot, "src", "ui");
const tokenPath = "apps/content-studio/src/styles/tokens.css";
const themePath = "apps/content-studio/src/styles/theme-fantasia-midnight.css";
const themeScope = '[data-studio-theme="fantasia-midnight"]';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function hasRawPalette(source) {
  const css = withoutComments(source);
  return /#[0-9a-fA-F]{3,8}(?![\w-])|\brgba?\s*\(|\bhsla?\s*\(/.test(css);
}

function fail(message) {
  console.error(`Content Studio design-system check failed: ${message}`);
  process.exitCode = 1;
}

function cssFilesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(absolute);
    return entry.isFile() && entry.name.endsWith(".css") ? [absolute] : [];
  });
}

function productionStyleFiles() {
  return fs
    .readdirSync(stylesRoot)
    .filter((name) => name === "studio-auth.css" || /^production-.*\.css$/.test(name))
    .map((name) => path.join(stylesRoot, name));
}

function studioDeclarations(source) {
  return [...withoutComments(source).matchAll(/(--studio-[\w-]+)\s*:/g)].map((match) => match[1]);
}

function studioReferences(source) {
  return [...withoutComments(source).matchAll(/var\(\s*(--studio-[\w-]+)/g)].map((match) => match[1]);
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
  const css = withoutComments(source);
  const relative = path.relative(root, file);

  for (const selector of forbiddenSharedSelectors) {
    if (css.includes(selector)) {
      fail(`${relative} reaches into shared selector ${selector}; use a feature-prefixed hook or change the shared owner.`);
    }
  }

  if (hasRawPalette(source)) {
    fail(`${relative} contains a raw palette value; feature CSS must consume Studio theme variables.`);
  }

  if (css.includes("!important")) {
    fail(`${relative} contains !important; fix ownership/specificity instead.`);
  }
}

const tokens = read(tokenPath);
if (hasRawPalette(tokens)) {
  fail("tokens.css contains palette values; structural tokens must stay theme-neutral.");
}

const theme = read(themePath);
const themeCss = withoutComments(theme).trim();
if (!themeCss.startsWith(`${themeScope} {`)) {
  fail("theme-fantasia-midnight.css must begin with the explicit title-theme scope.");
}
if ((themeCss.match(/{/g) ?? []).length !== 1 || (themeCss.match(/}/g) ?? []).length !== 1) {
  fail("theme-fantasia-midnight.css must only remap tokens in the title-theme scope; DOM/component selectors belong to shared CSS owners.");
}

const contractOwners = new Map();
for (const [relativePath, source] of [
  [tokenPath, tokens],
  [themePath, theme],
]) {
  for (const token of studioDeclarations(source)) {
    const existing = contractOwners.get(token);
    if (existing) {
      fail(`${token} is declared by both ${existing} and ${relativePath}; each Studio token must have one contract owner.`);
      continue;
    }
    contractOwners.set(token, relativePath);
  }
}

const requiredThemeTokens = [
  "--studio-app-background",
  "--studio-surface-canvas",
  "--studio-surface-panel",
  "--studio-surface-raised",
  "--studio-text-primary",
  "--studio-text-secondary",
  "--studio-text-muted",
  "--studio-border-subtle",
  "--studio-border-control",
  "--studio-border-active",
  "--studio-accent-primary",
  "--studio-accent-navigation",
  "--studio-focus-ring",
  "--studio-button-primary-bg",
  "--studio-button-secondary-bg",
  "--studio-control-bg",
  "--studio-dialog-bg",
  "--studio-validation-passed",
  "--studio-validation-warning",
  "--studio-validation-blocking",
];
for (const token of requiredThemeTokens) {
  if (contractOwners.get(token) !== themePath) {
    fail(`${themePath} is missing required semantic/theme contract ${token}.`);
  }
}

for (const file of [...cssFilesUnder(stylesRoot), ...cssFilesUnder(uiRoot)]) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");

  if (relative !== tokenPath && relative !== themePath) {
    for (const token of studioDeclarations(source)) {
      fail(`${relative} declares ${token}; public Studio tokens belong only to tokens.css or the active theme.`);
    }
  }

  for (const token of studioReferences(source)) {
    if (!contractOwners.has(token)) {
      fail(`${relative} references undefined Studio token ${token}.`);
    }
  }
}

const fidelity = withoutComments(read("apps/content-studio/src/styles/material-fidelity.css"));
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
  console.log("Content Studio design-system ownership and token contracts: OK");
}
