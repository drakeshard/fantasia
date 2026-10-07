const supportedSubpaths = [
  "@drakeshard/foundation/time",
  "@drakeshard/foundation/random",
  "@drakeshard/foundation/input",
  "@drakeshard/foundation/input/browser",
  "@drakeshard/foundation/storage",
  "@drakeshard/foundation/storage/browser",
];

for (const specifier of supportedSubpaths) {
  await import(specifier);
  console.log(`resolved ${specifier}`);
}

let rootResolved = false;
try {
  await import("@drakeshard/foundation");
  rootResolved = true;
} catch {
  // Expected: Foundation intentionally has no package-root export.
}

if (rootResolved) {
  throw new Error("Unsupported @drakeshard/foundation root import unexpectedly resolved");
}

console.log("Foundation package consumer check passed.");
