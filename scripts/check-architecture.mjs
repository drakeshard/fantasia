import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

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
      /from\s+["'](?:preact|@preact\/signals|phaser|playcanvas)["']/,
      /from\s+["'](?:\.\.\/)*apps\//,
      /\b(?:window|document|HTMLElement|HTMLCanvasElement)\b/,
      /from\s+["']@drakeshard\/(?:rpg|tactical)["']/,
    ],
    message: "game/domain must stay renderer, DOM, UI, and sibling-root-import neutral",
  },
  {
    dir: join(root, "packages/runtime/src"),
    forbidden: [/from\s+["'](?:phaser|playcanvas)["']/],
    message: "runtime must not own a production renderer implementation",
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

if (failed) process.exit(1);
console.log("Architecture guard passed.");
