import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const pins = JSON.parse(await readFile(join(root, "config/shared-library-pins.json"), "utf8"));
const provenance = JSON.parse(
  await readFile(join(root, "config/shared-library-provenance.json"), "utf8"),
);
const consumerRoot = join(root, ".cache/shared-consumer");

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

await rm(consumerRoot, { recursive: true, force: true });
await mkdir(consumerRoot, { recursive: true });

const dependencies = {};
const imports = [];
let importIndex = 0;
for (const [key, library] of Object.entries(pins.libraries)) {
  const artifact = provenance.artifacts[key];
  if (!artifact) throw new Error(`Missing committed provenance for ${key}.`);
  const artifactPath = join(root, ".artifacts/shared", artifact.file);
  const relativeArtifact = relative(consumerRoot, artifactPath).split(sep).join("/");
  dependencies[library.package] = `file:${relativeArtifact}`;

  for (const subpath of library.selectedSubpaths) {
    const binding = `surface${importIndex}`;
    imports.push(`import * as ${binding} from ${JSON.stringify(`${library.package}/${subpath}`)};`);
    imports.push(
      `if (!${binding} || typeof ${binding} !== "object") throw new Error(${JSON.stringify(`Could not import ${library.package}/${subpath}`)});`,
    );
    importIndex += 1;
  }
}

await writeFile(
  join(consumerRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "fantasia-shared-consumer-smoke",
      private: true,
      type: "module",
      packageManager: "pnpm@12.8.1",
      dependencies,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  join(consumerRoot, "consumer.mjs"),
  `${imports.join("\n")}\nconsole.log("Combined RPG/Tactical package consumer passed (${importIndex} subpaths).")\n`,
);

await run(
  "corepack",
  ["pnpm", "install", "--ignore-workspace", "--lockfile=false", "--ignore-scripts"],
  { cwd: consumerRoot },
);
await run("node", ["consumer.mjs"], { cwd: consumerRoot });
