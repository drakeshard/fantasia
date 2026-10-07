import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const pins = JSON.parse(await readFile(join(root, "config/shared-library-pins.json"), "utf8"));
const sourceRoot = join(root, ".cache/shared-sources");
const artifactRoot = join(root, ".artifacts/shared");

await mkdir(sourceRoot, { recursive: true });
await mkdir(artifactRoot, { recursive: true });

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

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

const provenance = { schemaVersion: 1, artifacts: {} };
for (const [key, library] of Object.entries(pins.libraries)) {
  const checkout = join(sourceRoot, key);
  await rm(checkout, { recursive: true, force: true });
  await mkdir(checkout, { recursive: true });
  await run("git", ["init", "--quiet", checkout]);
  await run("git", ["-C", checkout, "remote", "add", "origin", library.repository]);
  await run("git", ["-C", checkout, "fetch", "--depth=1", "origin", library.sha]);
  await run("git", ["-C", checkout, "checkout", "--detach", "FETCH_HEAD"]);

  const headFile = await new Promise((resolvePromise, reject) => {
    let output = "";
    const child = spawn("git", ["-C", checkout, "rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "inherit"] });
    child.stdout.on("data", (chunk) => (output += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolvePromise(output.trim()) : reject(new Error("git rev-parse failed"))));
  });
  if (headFile !== library.sha) throw new Error(`${key} checkout mismatch: ${headFile}`);

  await run("corepack", ["pnpm", "install", "--frozen-lockfile"], { cwd: checkout });
  await run("corepack", ["pnpm", "build"], { cwd: checkout });
  await run("corepack", ["pnpm", "check:public-api-readiness"], { cwd: checkout });
  await run("corepack", ["pnpm", "check:package-consumer"], { cwd: checkout });

  const before = new Set((await import("node:fs/promises")).then ? [] : []);
  void before;
  await run("corepack", ["pnpm", "pack", "--pack-destination", artifactRoot], { cwd: checkout });
  const expectedName = `${library.package.replace("@", "").replace("/", "-")}-${library.version}.tgz`;
  const artifactPath = resolve(artifactRoot, expectedName);
  provenance.artifacts[key] = {
    repository: library.repository,
    sourceSha: library.sha,
    package: library.package,
    packageVersion: library.version,
    file: basename(artifactPath),
    sha256: await sha256(artifactPath),
    selectedSubpaths: library.selectedSubpaths,
  };
}

await writeFile(join(artifactRoot, "generated-provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
console.log("Prepared pinned shared-library artifacts.");
