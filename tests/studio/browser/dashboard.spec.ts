import { expect, type Page, test } from "@playwright/test";

const tokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  user: { email: "operator@example.test" },
};

const readModels = {
  readModelVersion: 1,
  revision: "0123456789abcdef0123456789abcdef01234567",
  freshness: {
    gitRevision: "0123456789abcdef0123456789abcdef01234567",
    gitState: "deployment-snapshot",
    registryObservedAt: "2026-10-18T04:00:00Z",
    providerState: "registry-observed-no-live-provider-fetch",
  },
  search: { total: 1, offset: 0, limit: 100 },
  models: [
    {
      readModelVersion: 1,
      semanticId: "story.s01.ch01.b01",
      entityType: "story",
      displayName: "Strangers on the Road",
      canonical: {
        semanticId: "story.s01.ch01.b01",
        entityType: "story",
        displayName: "Strangers on the Road",
        canonicalPath: "content/narrative/story.json",
        canonicalData: {},
        provenance: {
          authority: "git",
          source: "content/narrative/story.json",
          revision: "0123456789abcdef0123456789abcdef01234567",
          canonical: true,
        },
      },
      lifecycle: "RUNTIME READY",
      schemaVersion: 1,
      validations: [{ dimension: "content", outcome: "FAILED", blocking: true }],
      relations: [],
      assets: [],
      history: [],
      permissions: {
        role: "Viewer",
        capabilities: ["studio.read"],
        canRead: true,
        canEditRegistryMetadata: false,
        canApprove: false,
        canFreeze: false,
        canManageMembership: false,
      },
      provenance: [],
      issues: [],
    },
  ],
  canonicalProposals: {
    state: "unavailable",
    observedAt: null,
    items: [],
    message: "Canonical proposal summary source is unavailable.",
  },
};

async function signIn(page: Page) {
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokenResponse) });
  });
  await page.route("**/functions/v1/studio-operations", async (route) => {
    const request = route.request().postDataJSON() as { type?: string };
    const body = request.type === "studio.read_models.get"
      ? readModels
      : { authorized: true, role: "Viewer", capabilities: ["studio.read"] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Dashboard surfaces operational attention and unavailable evidence truthfully", async ({ page }) => {
  await signIn(page);

  await expect(page.getByText("Production Dashboard", { exact: true })).toBeVisible();
  await expect(page.getByTestId("dashboard-freshness")).toContainText("0123456789ab");
  await expect(page.getByText("Blocking validation", { exact: true })).toBeVisible();
  await expect(page.getByText("Runtime ready · unpublished", { exact: true })).toBeVisible();
  await expect(page.getByText("Canonical proposal summary source is unavailable.", { exact: true })).toBeVisible();
  await expect(page.getByText(/publishing and verification records are not implemented yet/i)).toBeVisible();
  await expect(page.getByText("Read-only access", { exact: true })).toBeVisible();
});
