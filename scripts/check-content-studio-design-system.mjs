import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const studioRoot = path.join(root, "apps", "content-studio");
const stylesRoot = path.join(studioRoot, "src", "styles");
const uiRoot = path.join(studioRoot, "src", "ui");
const featuresRoot = path.join(studioRoot, "src", "features");
const contractPath = "apps/content-studio/design-system-contract.json";
const tokenPath = "apps/content-studio/src/styles/tokens.css";
const themePath = "apps/content-studio/src/styles/theme-fantasia-midnight.css";
const basePath = "apps/content-studio/src/styles/base.css";

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }
function withoutComments(source) { return source.replace(/\/\*[\s\S]*?\*\//g, ""); }
function hasRawPalette(source) { const css = withoutComments(source); return /#[0-9a-fA-F]{3,8}(?![\w-])|\brgba?\s*\(|\bhsla?\s*\(/.test(css); }
function fail(message) { console.error(`Content Studio design-system check failed: ${message}`); process.exitCode = 1; }

function filesUnder(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(absolute, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [absolute] : [];
  });
}
function cssFilesUnder(directory) { return filesUnder(directory, ".css"); }
function productionStyleFiles() {
  return fs.readdirSync(stylesRoot).filter((name) => name === "studio-auth.css" || /^production-.*\.css$/.test(name)).map((name) => path.join(stylesRoot, name));
}
function studioDeclarations(source) { return [...withoutComments(source).matchAll(/(--studio-[\w-]+)\s*:/g)].map((match) => match[1]); }
function studioReferences(source) { return [...withoutComments(source).matchAll(/var\(\s*(--studio-[\w-]+)/g)].map((match) => match[1]); }

let designSystemContract;
try { designSystemContract = JSON.parse(read(contractPath)); }
catch (error) { fail(`${contractPath} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`); designSystemContract = {}; }
if (designSystemContract.schemaVersion !== 1) fail(`${contractPath} must use schemaVersion 1.`);

const themeId = designSystemContract.theme?.id;
const themeScope = designSystemContract.theme?.scope;
if (typeof themeId !== "string" || themeId.length === 0) fail(`${contractPath} must define theme.id.`);
if (themeScope !== `[data-studio-theme="${themeId}"]`) fail(`${contractPath} theme.scope must exactly match its data-studio-theme id.`);

const requiredThemeTokens = Array.isArray(designSystemContract.requiredThemeTokens) ? designSystemContract.requiredThemeTokens : [];
if (requiredThemeTokens.length === 0) fail(`${contractPath} must define requiredThemeTokens.`);
const uniqueRequiredThemeTokens = new Set(requiredThemeTokens);
if (uniqueRequiredThemeTokens.size !== requiredThemeTokens.length) fail(`${contractPath} contains duplicate requiredThemeTokens.`);
for (const token of requiredThemeTokens) if (typeof token !== "string" || !token.startsWith("--studio-")) fail(`${contractPath} contains invalid theme token ${String(token)}.`);

const contrastPairs = Array.isArray(designSystemContract.contrastPairs) ? designSystemContract.contrastPairs : [];
if (contrastPairs.length === 0) fail(`${contractPath} must define representative contrastPairs.`);
for (const [index, pair] of contrastPairs.entries()) {
  if (typeof pair?.foreground !== "string" || typeof pair?.background !== "string" || !uniqueRequiredThemeTokens.has(pair.foreground) || !uniqueRequiredThemeTokens.has(pair.background)) fail(`${contractPath} contrastPairs[${index}] must reference required theme tokens.`);
  if (pair?.minimum !== 3 && pair?.minimum !== 4.5) fail(`${contractPath} contrastPairs[${index}] minimum must be 3 or 4.5.`);
  if (typeof pair?.purpose !== "string" || pair.purpose.trim().length === 0) fail(`${contractPath} contrastPairs[${index}] must explain its purpose.`);
}

const forbiddenSharedSelectors = [
  ".ui-", ".studio-component-", ".studio-shell", ".studio-workspace-header", ".studio-template", ".studio-collection", ".studio-semantic", ".studio-readiness", ".studio-provider-reference", ".studio-relation-card", ".studio-runtime-card",
];
for (const file of productionStyleFiles()) {
  const source = fs.readFileSync(file, "utf8");
  const css = withoutComments(source);
  const relative = path.relative(root, file);
  for (const selector of forbiddenSharedSelectors) if (css.includes(selector)) fail(`${relative} reaches into shared selector ${selector}; use a feature-prefixed layout hook or change the shared owner.`);
  if (hasRawPalette(source)) fail(`${relative} contains a raw palette value; feature CSS must consume Studio theme variables.`);
  if (css.includes("!important")) fail(`${relative} contains !important; fix ownership/specificity instead.`);
}

// Production features compose the shared control system; they do not invent native controls.
// The hidden native file input is intentionally owned only by ui/components/file-picker.tsx.
const rawInteractive = /<(button|input|select|textarea|dialog)\b/i;
const sharedClassEscape = /<(Button|IconButton|TextField|TextArea|SelectField|Checkbox|Surface|Dialog|Tabs|StateMessage|FilterBar|SelectableCollection|SelectableRow|MasterDetailLayout|FilePicker)\b[^>]*\bclassName\s*=/s;
for (const file of filesUnder(featuresRoot, ".tsx")) {
  const relative = path.relative(root, file);
  const source = withoutComments(fs.readFileSync(file, "utf8"));
  const raw = source.match(rawInteractive);
  if (raw) fail(`${relative} declares raw <${raw[1]}>; production interactive controls must come from the shared Studio UI layer.`);
  const escape = source.match(sharedClassEscape);
  if (escape) fail(`${relative} passes className to shared ${escape[1]}; add a reusable variant or an outer feature layout wrapper instead of repainting a shared root.`);
}

const tokens = read(tokenPath);
if (hasRawPalette(tokens)) fail("tokens.css contains palette values; structural tokens must stay theme-neutral.");
const theme = read(themePath);
const themeCss = withoutComments(theme).trim();
if (!themeCss.startsWith(`${themeScope} {`)) fail(`${themePath} must begin with the title-theme scope from ${contractPath}.`);
if ((themeCss.match(/{/g) ?? []).length !== 1 || (themeCss.match(/}/g) ?? []).length !== 1) fail(`${themePath} must only remap tokens in the title-theme scope; DOM/component selectors belong to shared CSS owners.`);

const contractOwners = new Map();
for (const [relativePath, source] of [[tokenPath, tokens], [themePath, theme]]) {
  for (const token of studioDeclarations(source)) {
    const existing = contractOwners.get(token);
    if (existing) { fail(`${token} is declared by both ${existing} and ${relativePath}; each Studio token must have one contract owner.`); continue; }
    contractOwners.set(token, relativePath);
  }
}
for (const token of requiredThemeTokens) if (contractOwners.get(token) !== themePath) fail(`${themePath} is missing required semantic/theme contract ${token}.`);

const sharedPaintFiles = [path.join(root, basePath), ...cssFilesUnder(uiRoot)];
for (const file of sharedPaintFiles) {
  const relative = path.relative(root, file);
  if (hasRawPalette(fs.readFileSync(file, "utf8"))) fail(`${relative} contains a raw palette value; shared CSS must consume semantic/component theme tokens.`);
}
for (const file of [...cssFilesUnder(stylesRoot), ...cssFilesUnder(uiRoot)]) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  if (relative !== tokenPath && relative !== themePath) for (const token of studioDeclarations(source)) fail(`${relative} declares ${token}; public Studio tokens belong only to tokens.css or the active theme.`);
  for (const token of studioReferences(source)) {
    if (!contractOwners.has(token)) fail(`${relative} references undefined Studio token ${token}.`);
    if (relative !== themePath && token.startsWith("--studio-color-")) fail(`${relative} consumes palette token ${token}; shared/feature CSS must consume semantic or component tokens instead.`);
  }
}

const fidelity = withoutComments(read("apps/content-studio/src/styles/material-fidelity.css"));
for (const selector of forbiddenSharedSelectors) if (fidelity.includes(selector)) fail(`material-fidelity.css still styles shared selector ${selector}; production paint belongs to shared UI owners.`);

const entrypoint = read("apps/content-studio/src/styles/design-system.css");
const requiredImports = [
  '"./tokens.css"', '"./theme-fantasia-midnight.css"', '"./base.css"', '"../ui/primitives.css"', '"../ui/components.css"', '"../ui/semantic.css"', '"../ui/workspace.css"', '"../ui/composites.css"', '"../ui/entity-asset.css"',
];
let previous = -1;
for (const requiredImport of requiredImports) {
  const index = entrypoint.indexOf(requiredImport);
  if (index === -1) { fail(`design-system.css is missing ${requiredImport}.`); continue; }
  if (index < previous) fail(`design-system.css imports ${requiredImport} out of ownership order.`);
  previous = index;
}

if (!process.exitCode) console.log("Content Studio design-system ownership, reusable controls, theme contract, and accessibility contract: OK");
