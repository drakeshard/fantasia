import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "config/identity-ui-assets.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

const expectedRoleIds = [
  "brand-crest",
  "brand-wordmark",
  "faction-rule-emblem",
  "faction-playstyle-emblem",
  "class-icon",
  "element-icon",
  "stat-icon",
  "equipment-slot-icon",
  "equipment-family-icon",
  "identity-plate",
];

const expectedCounts = new Map([
  ["faction-rule-emblem", 7],
  ["faction-playstyle-emblem", 11],
  ["class-icon", 11],
  ["element-icon", 9],
  ["stat-icon", 9],
  ["equipment-slot-icon", 4],
  ["equipment-family-icon", 11],
  ["identity-plate", 1],
]);

const expectedNames = new Map([
  ["faction-rule-emblem", ["Slayer", "Providence", "Stormsage", "Conqueror", "Defiant", "Ruin", "Arbiter"]],
  ["faction-playstyle-emblem", ["Oathbound", "Trailblazer", "Predator", "Legion", "Covenant", "Tactician", "Guardian", "Ravager", "Conjurer", "Timeweaver", "Realmbringer"]],
  ["class-icon", ["Infantry", "Lancer", "Cavalry", "Archer", "Assassin", "Flyer", "Aquatic", "Holy", "Sorcerer", "Demon", "Dragon"]],
  ["element-icon", ["Fire", "Water", "Ice", "Lightning", "Wind", "Earth", "Light", "Dark", "Arcane"]],
  ["stat-icon", ["Max HP", "Physical Power", "Magical Power", "Defense", "Resistance", "Speed", "Stability", "Critical Chance", "Critical Damage"]],
  ["equipment-slot-icon", ["Weapon", "Helmet", "Armor", "Accessory"]],
  ["equipment-family-icon", ["Axe", "Bow", "Small Sword / Dagger", "Hammer / Blunt", "Lance", "Sword", "Staff", "Focus / Catalyst", "Mail", "Cloth", "Leather"]],
]);

function fail(message) {
  throw new Error(`Identity/UI asset catalog: ${message}`);
}

if (catalog.schemaVersion !== 1 || catalog.catalogId !== "fantasia.identity-ui-assets") {
  fail("schemaVersion/catalogId is invalid");
}
if (!Array.isArray(catalog.roles) || !Array.isArray(catalog.owners)) fail("roles/owners must be arrays");

const roleIds = catalog.roles.map((role) => role.id);
if (new Set(roleIds).size !== roleIds.length) fail("role IDs must be unique");
if (JSON.stringify(roleIds) !== JSON.stringify(expectedRoleIds)) fail("controlled role list/order drifted");
const roleSet = new Set(roleIds);

const ownerIds = new Set();
for (const owner of catalog.owners) {
  if (typeof owner.semanticId !== "string" || !owner.semanticId || owner.semanticId.match(/\s/)) fail("owner semanticId is invalid");
  if (ownerIds.has(owner.semanticId)) fail(`duplicate owner ${owner.semanticId}`);
  ownerIds.add(owner.semanticId);
  if (typeof owner.displayName !== "string" || !owner.displayName.trim()) fail(`owner ${owner.semanticId} has no displayName`);
  if (typeof owner.entityType !== "string" || !owner.entityType.trim()) fail(`owner ${owner.semanticId} has no entityType`);
  if (!Array.isArray(owner.roles) || owner.roles.length === 0) fail(`owner ${owner.semanticId} has no roles`);
  for (const role of owner.roles) if (!roleSet.has(role)) fail(`owner ${owner.semanticId} references unknown role ${role}`);
}

for (const [role, expected] of expectedCounts) {
  const owners = catalog.owners.filter((owner) => owner.roles.includes(role));
  if (owners.length !== expected) fail(`${role} expected ${expected} owners, got ${owners.length}`);
}
for (const [role, names] of expectedNames) {
  const actual = catalog.owners.filter((owner) => owner.roles.includes(role)).map((owner) => owner.displayName);
  if (JSON.stringify(actual) !== JSON.stringify(names)) fail(`${role} controlled names/order drifted`);
}

const plateOwners = catalog.owners.filter((owner) => owner.roles.includes("identity-plate"));
if (plateOwners[0]?.semanticId !== "identity-plate.faction-playstyle.standard" || plateOwners[0]?.visualStatus !== "FROZEN") {
  fail("the frozen shared Faction Playstyle backplate must remain the sole initial identity-plate owner");
}

for (const semanticId of ["faction-playstyle.oathbound", "faction-playstyle.predator"]) {
  const owner = catalog.owners.find((item) => item.semanticId === semanticId);
  if (owner?.visualStatus !== "FROZEN") fail(`${semanticId} must preserve its frozen visual-reference status`);
}

console.log(`Identity/UI asset catalog valid: ${catalog.roles.length} roles, ${catalog.owners.length} owners.`);
