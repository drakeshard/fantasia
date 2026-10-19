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
  semanticId: "identity.brand.fantasia",
  entityType: "brand-identity",
  displayName: "Fantasia",
  canonical: {
    semanticId: "identity.brand.fantasia",
    entityType: "brand-identity",
    displayName: "Fantasia",
    canonicalPath: "config/identity-ui-assets.json",
    canonicalData: { roles: ["brand-crest", "brand-wordmark"] },
    provenance: {
      authority: "git",
      source: "config/identity-ui-assets.json",
      revision,
      canonical: true,
    },
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
  assets: [],
  canonicalProposals: {
    state: "available",
    observedAt: "2026-10-18T08:00:00Z",
    items: [],
  },
};

async function mockEmptyAssetsStudio(page: Page) {
  await page.route("**/auth/v1/token?grant_type=password", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) }),
  );
  await page.route("**/functions/v1/studio-operations", async (route) => {
    const contentType = route.request().headers()["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ replayed: false }),
      });
      return;
    }

    const request = route.request().postDataJSON() as { type?: string };
    if (request.type === "studio.read_models.get") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(readModels),
      });
      return;
    }
    if (request.type === "session.get") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authorized: true,
          role: "Editor",
          capabilities: ["studio.read", "registry.metadata.edit"],
        }),
      });
      return;
    }
    if (request.type === "provider.google_drive.status") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true, accountEmail: "owner@example.test" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ replayed: false, result: { ok: true } }),
    });
  });
}

async function signIn(page: Page) {
  await mockEmptyAssetsStudio(page);
  await page.goto("/?module=assets");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Add Asset keeps controlled identity/file recovery and uses trusted multipart upload", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
  await expect(page.getByText("Google Drive · Connected as owner@example.test", { exact: true })).toBeVisible();
  await expect(page.getByText("No assets yet", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search assets")).toHaveCount(0);
  await expect(page.getByLabel("Lifecycle")).toHaveCount(0);
  await expect(page.locator("#asset-source-file")).toHaveCount(0);

  await page.getByRole("button", { name: "+ Add Asset" }).click();

  const dialog = page.getByRole("dialog", { name: "Add Asset" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Define asset identity", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Choose a source/master", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Browse...", { exact: false })).toHaveCount(0);
  await expect(dialog.getByText("No file selected.", { exact: true })).toHaveCount(0);

  const assetType = dialog.locator("#asset-role");
  const ownerSelect = dialog.locator("#asset-owner");
  const sourceFile = dialog.locator("#asset-source-file");
  const addAsset = dialog.getByRole("button", { name: "Add Asset" });

  await expect(assetType).toHaveValue("");
  await expect(ownerSelect).toHaveValue("");
  await expect(ownerSelect).toBeDisabled();
  await expect(dialog.locator("#asset-variant")).toHaveValue("");
  await expect(addAsset).toBeDisabled();
  await expect(dialog.getByLabel("Semantic asset ID")).toHaveCount(0);

  await assetType.selectOption("brand-crest");
  await expect(ownerSelect).toBeEnabled();
  await expect(ownerSelect).toHaveValue("");
  await ownerSelect.selectOption("identity.brand.fantasia");
  await expect(dialog.getByText("Fantasia · Brand Crest · base", { exact: true })).toBeVisible();
  await expect(dialog.getByText("asset.identity.brand.fantasia.brand-crest.base", { exact: true })).toBeVisible();
  await expect(addAsset).toBeDisabled();

  await sourceFile.setInputFiles({
    name: "fantasia-crest.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(dialog.getByText("fantasia-crest.svg", { exact: true })).toBeVisible();
  await expect(addAsset).toBeEnabled();

  await dialog.getByRole("button", { name: "Remove" }).click();
  await expect(dialog.getByText("fantasia-crest.svg", { exact: true })).toHaveCount(0);
  await expect(addAsset).toBeDisabled();

  await sourceFile.setInputFiles({
    name: "fantasia-crest.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  const operation = page.waitForRequest(
    (request) =>
      request.url().includes("/functions/v1/studio-operations") &&
      (request.headers()["content-type"] ?? "").includes("multipart/form-data"),
  );

  await addAsset.click();
  const request = await operation;
  expect(request.postData()).toContain("asset.identity.brand.fantasia.brand-crest.base");
  expect(request.postData()).toContain("identity.brand.fantasia");
  expect(request.postData()).toContain("brand-crest");
  expect(request.postData()).not.toContain("service_account");
  expect(request.postData()).not.toContain("private_key");
  await expect(dialog).toHaveCount(0);
});
