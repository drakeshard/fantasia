import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = await readFile(
  path.join(root, "supabase/migrations/20261018070000_game_studio02_identity_operations.sql"),
  "utf8",
);
const contract = await readFile(
  path.join(root, "supabase/functions/studio-operations/contract.ts"),
  "utf8",
);
const api = await readFile(
  path.join(root, "supabase/functions/studio-operations/index.ts"),
  "utf8",
);
const client = await readFile(path.join(root, "apps/content-studio/src/studio-session.ts"), "utf8");

function requireText(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message ?? `Missing required fragment: ${fragment}`);
}

function forbid(source, pattern, message) {
  if (pattern.test(source)) throw new Error(message);
}

for (const role of ["Viewer", "Editor", "Approver", "Admin"]) {
  requireText(contract, `"${role}"`, `Missing frozen Studio role ${role}.`);
  requireText(migration, `'${role}'`, `Database role enum is missing ${role}.`);
}

requireText(contract, 'Approver: ["studio.read", "registry.metadata.edit", "review.approve", "review.freeze"]', "Approver capability contract drifted.");
requireText(contract, 'Admin: ["studio.read", "registry.metadata.edit", "studio.membership.manage"]', "Admin capability contract drifted.");
forbid(contract, /Admin:[^\n]+review\.approve/, "Admin must not implicitly receive approval authority.");
forbid(contract, /Admin:[^\n]+review\.freeze/, "Admin must not implicitly receive freeze authority.");
forbid(contract, /Approver:[^\n]+studio\.membership\.manage/, "Approver must not receive Studio membership administration.");

requireText(migration, "references auth.users(id)", "Studio membership must bind to Supabase Auth identity rather than player accounts.");
forbid(migration, /references\s+public\.(accounts|account_profiles)/i, "Studio authorization must not depend on player account tables.");
forbid(migration, /grant\s+[^;]*(insert|update|delete)[^;]*to\s+(anon|authenticated)/i, "Browser roles must not receive direct Studio mutation privileges.");
requireText(migration, "create table studio_registry.operation_receipts", "Studio operations need idempotency receipts.");
requireText(migration, "create table studio_registry.membership_events", "Membership administration must remain auditable.");
requireText(migration, "insert into studio_registry.change_events", "Registry proof mutation must append STUDIO01 audit evidence.");

requireText(api, 'authorization?.startsWith("Bearer ")', "Studio Operations API must require bearer authentication.");
requireText(api, "/auth/v1/user", "Studio Operations API must validate the caller through Supabase Auth.");
requireText(api, "p_actor_user_id: user.id", "Mutation actor identity must come from the verified JWT user.");
forbid(api, /operation\.payload\.(actor|roleClaim|capabilities)/, "API must not authorize from browser-supplied actor or capability claims.");
forbid(api, /executeSql|mutateRegistry|providerProxy/i, "Studio Operations API must remain narrow rather than generic.");

forbid(client, /SUPABASE_(SECRET|SERVICE_ROLE)|service[_-]?role/i, "Content Studio browser code must not contain privileged Supabase credentials.");
requireText(client, "/functions/v1/studio-operations", "Content Studio must resolve Studio authorization through the trusted API.");
requireText(client, "/auth/v1/token?grant_type=password", "Content Studio must authenticate independently from the player shell.");
forbid(client, /signup|signUp/i, "STUDIO02 must not add a public Studio signup path.");

console.log("Studio identity, role, and trusted Operations API boundary check passed.");
