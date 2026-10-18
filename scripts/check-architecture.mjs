import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const pins = JSON.parse(await readFile(join(root, "config/shared-library-pins.json"), "utf8"));

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const rules = [
  {
    dir: join(root, "packages/game/src"),
    forbidden: [
      /from\s+["'](?:preact|@preact\/signals|phaser|playcanvas|pixi\.js)["']/,
      /from\s+["']@drakeshard\/foundation(?:\/[^"']+)?["']/,
      /from\s+["'](?:\.\.\/)*apps\//,
      /\b(?:window|document|HTMLElement|HTMLCanvasElement)\b/,
      /["'](?:\.\.\/)*\.cache\/shared-sources\//,
    ],
    message:
      "game/domain must stay renderer, DOM, UI, Foundation-runtime, and repository-source neutral",
  },
  {
    dir: join(root, "packages/runtime/src"),
    forbidden: [/from\s+["'](?:phaser|playcanvas|pixi\.js)["']/],
    message: "runtime must not own a production renderer implementation",
  },
  {
    dir: join(root, "apps/content-studio/src/ui"),
    forbidden: [/from\s+["'][^"']*features\//],
    message: "shared Content Studio UI must not import production feature modules",
  },
];

let failed = false;
for (const rule of rules) {
  for (const file of await collect(rule.dir)) {
    const source = await readFile(file, "utf8");
    for (const pattern of rule.forbidden) {
      if (pattern.test(source)) {
        console.error(`${relative(root, file)}: ${rule.message}`);
        failed = true;
      }
    }
  }
}

const applicationSources = [
  ...(await collect(join(root, "packages/runtime/src"))),
  ...(await collect(join(root, "apps/web/src"))),
];
for (const file of applicationSources) {
  const source = await readFile(file, "utf8");
  if (/from\s+["']@drakeshard\/foundation["']/.test(source)) {
    console.error(`${relative(root, file)}: unsupported Foundation package-root import`);
    failed = true;
  }
  if (/drakeshard\/web-foundation|packages\/foundation\/src/.test(source)) {
    console.error(`${relative(root, file)}: Foundation repository/source import is forbidden`);
    failed = true;
  }
}

const sharedImportPattern = /["'](@drakeshard\/(rpg|tactical)(?:\/([^"']+))?)["']/g;
for (const file of await collect(join(root, "packages/game/src"))) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(sharedImportPattern)) {
    const [, specifier, libraryName, subpath] = match;
    if (!subpath) {
      console.error(`${relative(root, file)}: unsupported shared-library root import ${specifier}`);
      failed = true;
      continue;
    }
    const selected = pins.libraries[libraryName]?.selectedSubpaths ?? [];
    if (!selected.includes(subpath)) {
      console.error(`${relative(root, file)}: unselected shared-library subpath ${specifier}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("Architecture guard passed.");
