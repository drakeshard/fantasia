import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const runtimeRequire = createRequire(new URL("../packages/runtime/package.json", import.meta.url));
const supportedSubpaths = [
  "@drakeshard/foundation/time",
  "@drakeshard/foundation/random",
  "@drakeshard/foundation/input",
  "@drakeshard/foundation/input/browser",
  "@drakeshard/foundation/storage",
  "@drakeshard/foundation/storage/browser",
];

for (const specifier of supportedSubpaths) {
  const resolved = runtimeRequire.resolve(specifier);
  await import(pathToFileURL(resolved).href);
  console.log(`resolved ${specifier}`);
}

let rootResolved = false;
try {
  runtimeRequire.resolve("@drakeshard/foundation");
  rootResolved = true;
} catch {
  // Expected: Foundation intentionally has no package-root export.
}

if (rootResolved) {
  throw new Error("Unsupported @drakeshard/foundation root import unexpectedly resolved");
}

console.log("Foundation package consumer check passed.");
