import { expect, type Page, test } from "@playwright/test";

const revision = "0123456789abcdef0123456789abcdef01234567";
const tokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  user: { email: "operator@example.test" },
};

const owner = {
  readModelVersion: 1,
  semanticId: "character.production.hero",
  entityType: "character",
  displayName: "MC",
  canonical: {
    semanticId: "character.production.hero",
    entityType: "character",
    displayName: "MC",
    canonicalPath: "content/characters/characters.json",
    canonicalData: {},
    provenance: { authority: "git", source: "content/characters/characters.json", revision, canonical: true },
  },
  lifecycle: "WORKING",
  schemaVersion: 1,
  validations: [],
  relations: [],
  assets: [],
  history: [],
  permissions: {
    role: "Editor",
    capabilities: ["studio.read", "registry.metadata.edit"],
    canRead: true,
    canEditRegistryMetadata: true,
    canApprove: false,
    canFreeze: false,
    canManageMembership: false,
  },
  provenance: [],
  issues: [],
};

const source = (versionId: string, versionNumber: number) => ({
  semanticAssetId: "asset.character.production.hero.portrait.base",
  versionId,
  versionNumber,
  providerKind: "google-drive",
  sourceAvailable: true,
  mediaType: "image/png",
  byteSize: 1024,
  dimensions: { width: 1024, height: 1024 },
  checksum: { algorithm: "sha256", value: "a".repeat(64) },
  providerReference: { visibility: "redacted" },
  operations: ["metadata", "preview", "download"],
  provenance: { authority: "provider", source: "google-drive", observedAt: "2026-10-18T08:00:00Z", canonical: true },
});

const asset = {
  semanticId: "asset.character.production.hero.portrait.base",
  ownerSemanticId: owner.semanticId,
  ownerEntityType: "character",
  ownerDisplayName: "MC",
  role: "portrait",
  variant: "base",
  lifecycle: "WORKING",
  readiness: "ready",
  currentVersion: source("11111111-1111-4111-8111-111111111111", 2),
  derivativeRequired: true,
  versions: [
    {
      versionId: "11111111-1111-4111-8111-111111111111",
      versionNumber: 2,
      lifecycle: "WORKING",
      current: true,
      createdAt: "2026-10-18T08:00:00Z",
      source: source("11111111-1111-4111-8111-111111111111", 2),
      validations: [{ dimension: "Source Valid", outcome: "PASSED", blocking: false, checkedAt: "2026-10-18T08:00:00Z" }],
    },
    {
      versionId: "22222222-2222-4222-8222-222222222222",
      versionNumber: 1,
      lifecycle: "WORKING",
      current: false,
      createdAt: "2026-10-18T07:00:00Z",
      source: source("22222222-2222-4222-8222-222222222222", 1),
      validations: [],
    },
  ],
  relations: [],
  validations: [{ dimension: "Source Valid", outcome: "PASSED", blocking: false, checkedAt: "2026-10-18T08:00:00Z" }],
  runtimeDerivatives: [],
  history: [{ eventType: "registry.asset_version.created", occurredAt: "2026-10-18T08:00:00Z", sourceKind: "google-drive" }],
  issues: [],
};

const readModels = {
  readModelVersion: 1,
  revision,
  freshness: {
    gitRevision: revision,
    gitState: "deployment-snapshot",
    registryObservedAt: "2026-10-18T08:00:00Z",
    providerState: "registry-observed-provider-access-on-demand",
  },
  search: { total: 1, offset: 0, limit: 100 },
  models: [owner],
  assets: [asset],
  canonicalProposals: { state: "available", observedAt: "2026-10-18T08:00:00Z", items: [] },
};

async function mockStudio(page: Page, role: "Viewer" | "Editor") {
  await page.route("**/auth/v1/token?grant_type=password", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) }),
  );
  await page.route("**/functions/v1/studio-operations", async (route) => {
    const contentType = route.request().headers()["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ replayed: false }) });
      return;
    }
    const request = route.request().postDataJSON() as { type?: string };
    if (request.type === "studio.read_models.get") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readModels) });
      return;
    }
    if (request.type === "session.get") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authorized: true,
          role,
          capabilities: role === "Viewer" ? ["studio.read"] : ["studio.read", "registry.metadata.edit"],
        }),
      });
      return;
    }
    if (request.type === "provider.google_drive.status") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true, accountEmail: "owner@example.test" }) });
      return;
    }
    if (request.type === "registry.asset_source.access") {
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("preview-bytes") });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ replayed: false, result: { ok: true } }) });
  });
}

async function signIn(page: Page, role: "Viewer" | "Editor") {
  await mockStudio(page, role);
  await page.goto("/?module=assets");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Viewer can inspect Asset source history but cannot mutate it", async ({ page }) => {
  await signIn(page, "Viewer");

  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
  await expect(page.getByText(asset.semanticId, { exact: true })).toHaveCount(1);
  await expect(page.getByTestId("asset-live-preview")).toBeVisible();
  await expect(page.getByText("v2").first()).toBeVisible();
  await expect(page.getByText("v1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace source" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Make current" })).toBeDisabled();
  await expect(page.getByText("Read-only Assets workspace", { exact: true })).toBeVisible();
});

test("Editor replaces an Asset source/master through the trusted multipart boundary", async ({ page }) => {
  await signIn(page, "Editor");
  await page.getByRole("button", { name: "Replace source" }).click();
  await expect(page.getByRole("dialog", { name: "Replace source/master" })).toBeVisible();
  await page.locator("#asset-source-file").setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from("source-master"),
  });
  const operation = page.waitForRequest(
    (request) => request.url().includes("/functions/v1/studio-operations") && (request.headers()["content-type"] ?? "").includes("multipart/form-data"),
  );
  await page.getByRole("button", { name: "Upload new version" }).click();
  const request = await operation;
  expect(request.postData()).toContain(asset.semanticId);
  expect(request.postData()).not.toContain("service_account");
  expect(request.postData()).not.toContain("private_key");
});

test("Editor explicitly promotes a retained Asset version without changing lifecycle", async ({ page }) => {
  await signIn(page, "Editor");
  const operation = page.waitForRequest((request) => {
    if (!request.url().includes("/functions/v1/studio-operations")) return false;
    try {
      return request.postDataJSON()?.type === "registry.asset_version.select";
    } catch {
      return false;
    }
  });
  await page.getByRole("button", { name: "Make current" }).click();
  const request = await operation;
  const body = request.postDataJSON() as { payload: { assetSemanticId: string; versionId: string } };
  expect(body.payload).toEqual({
    assetSemanticId: asset.semanticId,
    versionId: "22222222-2222-4222-8222-222222222222",
  });
});
