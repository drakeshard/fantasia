import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const expected = JSON.parse(
  await readFile(join(root, "config/shared-library-provenance.json"), "utf8"),
);
const generated = JSON.parse(
  await readFile(join(root, ".artifacts/shared/generated-provenance.json"), "utf8"),
);

if (expected.status === "bootstrap-pending") {
  throw new Error("Committed shared-library provenance is still bootstrap-pending.");
}

for (const [key, artifact] of Object.entries(expected.artifacts)) {
  const actual = generated.artifacts[key];
  if (!actual) throw new Error(`Missing generated provenance for ${key}.`);
  for (const field of ["repository", "sourceSha", "package", "packageVersion", "file", "sha256"]) {
    if (actual[field] !== artifact[field])
      throw new Error(`${key} provenance mismatch for ${field}.`);
  }
  const bytes = await readFile(join(root, ".artifacts/shared", artifact.file));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== artifact.sha256) throw new Error(`${key} artifact digest mismatch.`);
}

console.log("Shared-library provenance verified.");
