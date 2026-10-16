import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "config/runtime-assets.json");
const sourceRoot = join(root, "apps/web/public/assets");
const bucket = "runtime-assets";
const publish = process.argv.includes("--publish");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
  throw new Error("config/runtime-assets.json does not contain the supported manifest schema.");
}

const ids = new Set();
const paths = new Set();
for (const asset of manifest.assets) {
  if (
    !asset ||
    typeof asset.id !== "string" ||
    typeof asset.path !== "string" ||
    typeof asset.mediaType !== "string" ||
    !Number.isSafeInteger(asset.version) ||
    asset.version < 1
  ) {
    throw new Error("Runtime asset manifest contains a malformed entry.");
  }
  if (ids.has(asset.id)) throw new Error(`Duplicate runtime asset id: ${asset.id}`);
  if (paths.has(asset.path)) throw new Error(`Duplicate runtime asset path: ${asset.path}`);
  ids.add(asset.id);
  paths.add(asset.path);

  const source = resolve(sourceRoot, asset.path);
  if (!source.startsWith(`${resolve(sourceRoot)}/`)) {
    throw new Error(`Runtime asset escapes source root: ${asset.path}`);
  }
  await access(source);
}

console.log(`Verified ${manifest.assets.length} runtime assets against the Git manifest.`);

if (!publish) process.exit(0);

const projectUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
if (!projectUrl || !secretKey) {
  throw new Error("Publishing requires server-only SUPABASE_URL and SUPABASE_SECRET_KEY.");
}
if (!secretKey.startsWith("sb_secret_")) {
  throw new Error("SUPABASE_SECRET_KEY must be a modern server-side sb_secret_ credential.");
}

for (const asset of manifest.assets) {
  const body = await readFile(join(sourceRoot, asset.path));
  const objectPath = asset.path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${projectUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      "cache-control": "max-age=31536000, immutable",
      "content-type": asset.mediaType,
    },
    body,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to publish ${asset.id} (${response.status}): ${detail}`);
  }
  console.log(`Published ${asset.id} -> ${asset.path}`);
}
