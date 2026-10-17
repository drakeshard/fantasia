import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const migrationNames = (await readdir(migrationsDir)).filter((name) =>
  name.endsWith("_game_studio01_registry_foundation.sql"),
);

if (migrationNames.length !== 1) {
  throw new Error(
    `Expected exactly one GAME-STUDIO01 registry migration, found ${migrationNames.length}.`,
  );
}

const migrationPath = path.join(migrationsDir, migrationNames[0]);
const sql = await readFile(migrationPath, "utf8");

function requireText(fragment, message) {
  if (!sql.includes(fragment)) {
    throw new Error(message ?? `Missing required registry contract fragment: ${fragment}`);
  }
}

function forbid(pattern, message) {
  if (pattern.test(sql)) {
    throw new Error(message);
  }
}

const tables = [
  "content_entities",
  "assets",
  "asset_versions",
  "entity_relations",
  "asset_relations",
  "runtime_derivatives",
  "validation_results",
  "change_events",
];

requireText("create schema if not exists studio_registry;", "Registry must use the isolated studio_registry schema.");
for (const table of tables) {
  requireText(
    `create table studio_registry.${table}`,
    `Missing Layer 2B registry table: ${table}.`,
  );
  requireText(
    `alter table studio_registry.${table} enable row level security;`,
    `RLS must be enabled on studio_registry.${table}.`,
  );
}

const lifecycle = [
  "WORKING",
  "CANDIDATE",
  "IN REVIEW",
  "APPROVED",
  "FROZEN",
  "RUNTIME READY",
  "PUBLISHED",
  "RETIRED",
];
const lifecycleBlock = sql.match(
  /create type studio_registry\.lifecycle_state as enum \(([\s\S]*?)\);/,
)?.[1];
if (!lifecycleBlock) {
  throw new Error("Missing studio_registry.lifecycle_state enum.");
}
const enumValues = [...lifecycleBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
if (JSON.stringify(enumValues) !== JSON.stringify(lifecycle)) {
  throw new Error(
    `Lifecycle enum must exactly match frozen order. Got: ${enumValues.join(" -> ")}`,
  );
}

const readinessDimensions = [
  "Source Valid",
  "Metadata Complete",
  "Visual Approved",
  "Relations Valid",
  "Runtime Derivatives Valid",
  "Ready for Runtime",
  "Runtime Verified",
  "Published",
];
for (const dimension of readinessDimensions) {
  requireText(`'${dimension}'`, `Missing frozen readiness dimension: ${dimension}.`);
}

requireText(
  "foreign key (current_version_id, semantic_id)",
  "Asset current-version ownership must be enforced with a composite foreign key.",
);
requireText(
  "references studio_registry.asset_versions(id, asset_id)",
  "Asset/version ownership must reference the exact owning asset.",
);
requireText(
  "foreign key (source_asset_version_id, asset_id)",
  "Runtime derivative provenance must be bound to the exact source asset version.",
);
requireText(
  "num_nonnulls(entity_id, asset_id, asset_version_id, runtime_derivative_id) = 1",
  "Validation and audit records must target exactly one registry subject.",
);
requireText(
  "create trigger validation_results_append_only",
  "Validation history must be append-only.",
);
requireText(
  "create trigger change_events_append_only",
  "Change-event history must be append-only.",
);
requireText(
  "revoke all on schema studio_registry from public, anon, authenticated;",
  "Browser roles must not receive direct schema access in STUDIO01.",
);
requireText(
  "revoke all on all tables in schema studio_registry from public, anon, authenticated, service_role;",
  "Registry table grants must start from explicit least privilege.",
);
requireText(
  "grant select, insert, update, delete on all tables in schema studio_registry to service_role;",
  "Only the trusted service role should receive direct registry DML in STUDIO01.",
);
requireText(
  "revoke update, delete on table studio_registry.validation_results from service_role;",
  "Validation evidence must remain append-only for the trusted application path.",
);
requireText(
  "revoke update, delete on table studio_registry.change_events from service_role;",
  "Change events must remain append-only for the trusted application path.",
);

forbid(
  /grant\s+[^;]+\s+to\s+(anon|authenticated)\b/i,
  "GAME-STUDIO01 must not grant direct registry privileges to anon/authenticated browser roles.",
);
forbid(
  /references\s+(public\.accounts|auth\.users|public\.account_)/i,
  "Studio registry identity must remain separate from player/Auth identity.",
);
forbid(
  /config\/runtime-assets\.json/i,
  "Registry migration must not mutate or embed the Git-owned runtime manifest.",
);
forbid(
  /\bready\s+boolean\b/i,
  "Registry readiness must derive from validation evidence, not a ready boolean.",
);

console.log(`Studio registry contract check passed (${migrationNames[0]}).`);
