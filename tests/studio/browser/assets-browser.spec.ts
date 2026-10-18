import { expect, type Page, test } from "@playwright/test";

const revision = "0123456789abcdef0123456789abcdef01234567";
const tokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  user: { email: "operator@example.test" },
};

function owner(semanticId: string, displayName: string, entityType: string) {
  return {
    readModelVersion: 1,
    semanticId,
    entityType,
    displayName,
    canonical: {
      semanticId,
      entityType,
      displayName,
      canonicalPath: "config/identity-ui-assets.json",
      canonicalData: {},
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
}

function source(semanticAssetId: string, versionId: string) {
  return {
    semanticAssetId,
    versionId,
    versionNumber: 1,
    providerKind: "google-drive",
    sourceAvailable: true,
    mediaType: "image/png",
    byteSize: 2048,
    dimensions: { width: 1024, height: 1024 },
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    providerReference: { visibility: "redacted" },
    operations: ["metadata", "preview", "download"],
    provenance: {
      authority: "provider",
      source: "google-drive",
      observedAt: "2026-10-18T08:00:00Z",
      canonical: true,
    },
  };
}

function asset(
  semanticId: string,
  ownerSemanticId: string,
  ownerDisplayName: string,
  ownerEntityType: string,
  role: string,
  readiness: "ready" | "warning",
  versionId: string,
) {
  const currentSource = source(semanticId, versionId);
  return {
    semanticId,
    ownerSemanticId,
    ownerEntityType,
    ownerDisplayName,
    role,
    variant: "base",
    lifecycle: "WORKING",
    readiness,
    currentVersion: currentSource,
    derivativeRequired: false,
    versions: [
      {
        versionId,
        versionNumber: 1,
        lifecycle: "WORKING",
        current: true,
        createdAt: "2026-10-18T08:00:00Z",
        source: currentSource,
        validations: [],
      },
    ],
    relations: [],
    validations: [],
    runtimeDerivatives: [],
    history: [],
    issues: [],
  };
}

const mcOwner = owner("character.production.hero", "MC", "character");
const arbiterOwner = owner("identity.faction-rule.arbiter", "Arbiter", "faction-rule");
const mcAsset = asset(
  "asset.character.production.hero.portrait.base",
  mcOwner.semanticId,
  "MC",
  "character",
  "portrait",
  "ready",
  "11111111-1111-4111-8111-111111111111",
);
const arbiterAsset = asset(
  "asset.identity.faction-rule.arbiter.faction-rule-emblem.base",
  arbiterOwner.semanticId,
  "Arbiter",
  "faction-rule",
  "faction-rule-emblem",
  "warning",
  "22222222-2222-4222-8222-222222222222",
);

const readModels = {
  readModelVersion: 1,
  revision,
  freshness: {
    gitRevision: revision,
    gitState: "deployment-snapshot",
    registryObservedAt: "2026-10-18T08:00:00Z",
    providerState: "registry-observed-provider-access-on-demand",
  },
  search: { total: 2, offset: 0, limit: 100 },
  models: [mcOwner, arbiterOwner],
  assets: [mcAsset, arbiterAsset],
  canonicalProposals: {
    state: "available",
    observedAt: "2026-10-18T08:00:00Z",
    items: [],
  },
};

async function signIn(page: Page) {
  await page.route("**/auth/v1/token?grant_type=password", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) }),
  );
  await page.route("**/functions/v1/studio-operations", async (route) => {
    const contentType = route.request().headers()["content-type"] ?? "";
    if (!contentType.includes("application/json")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
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
    if (request.type === "registry.asset_source.access") {
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("preview") });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/?module=assets");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Assets browser keeps search, primary filters and recovery with the collection", async ({ page }) => {
  await signIn(page);

  const browser = page.getByRole("complementary", { name: "Asset browser" });
  const results = browser.locator(".studio-assets-selector--rail");
  await expect(browser).toBeVisible();
  await expect(browser.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(browser.getByLabel("Search assets")).toBeVisible();
  await expect(browser.getByLabel("Asset type")).toBeVisible();
  await expect(browser.getByLabel("Owner")).toBeVisible();
  await expect(browser.getByLabel("Lifecycle")).toHaveCount(0);

  await browser.getByLabel("Search assets").fill("Arbiter");
  await expect(browser.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arbiter" })).toBeVisible();
  await expect(results.getByText("MC", { exact: true })).toHaveCount(0);

  await browser.getByRole("button", { name: "More filters" }).click();
  await expect(browser.getByLabel("Lifecycle")).toBeVisible();
  await expect(browser.getByLabel("Readiness")).toBeVisible();

  await browser.getByLabel("Search assets").fill("does-not-exist");
  await expect(browser.getByText("No matching assets", { exact: true })).toBeVisible();
  await browser.getByRole("button", { name: "Clear filters" }).click();
  await expect(browser.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(results.getByText("MC", { exact: true })).toBeVisible();
  await expect(results.getByText("Arbiter", { exact: true })).toBeVisible();
});

test("Assets browser primary filtering changes the visible selection and stays overflow-safe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await signIn(page);

  const browser = page.getByRole("complementary", { name: "Asset browser" });
  await browser.getByLabel("Owner").selectOption(arbiterOwner.semanticId);
  await expect(browser.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arbiter" })).toBeVisible();

  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
});
