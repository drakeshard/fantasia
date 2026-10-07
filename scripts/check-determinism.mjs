import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const domainRoot = join(root, "packages/game/src");
const extensions = new Set([".ts", ".tsx"]);
const forbidden = [
  { pattern: /Math\.random\s*\(/, reason: "uncontrolled Math.random()" },
  { pattern: /Date\.now\s*\(/, reason: "wall-clock Date.now()" },
  { pattern: /new\s+Date\s*\(/, reason: "wall-clock Date construction" },
  { pattern: /performance\.now\s*\(/, reason: "presentation/runtime clock" },
];

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

let failed = false;
for (const file of await walk(domainRoot)) {
  const source = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      console.error(`${relative(root, file)}: authoritative domain uses ${rule.reason}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("Determinism guard passed.");
