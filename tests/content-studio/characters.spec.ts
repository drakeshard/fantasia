import { expect, type Page, test } from "@playwright/test";

const revision = "0123456789abcdef0123456789abcdef01234567";
const tokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  user: { email: "operator@example.test" },
};

const character = {
  readModelVersion: 1,
  semanticId: "character.production.hero",
  entityType: "character",
  displayName: "MC",
  canonical: {
    semanticId: "character.production.hero",
    entityType: "character",
    displayName: "MC",
    canonicalPath: "content/characters/characters.json",
    canonicalData: {
      semanticId: "character.production.hero",
      actorId: "production:hero",
      tacticalEntityId: "production-tactical:hero",
      displayName: "MC",
      side: "player",
      shortLabel: "MC",
      movementAllowance: 4,
      initialCoord: { x: 1, y: 4 },
      rpg: {
        classes: ["Infantry"],
        initialClass: "Infantry",
        attributes: {
          physicalPower: 12,
          magicalPower: 5,
          defense: 10,
          resistance: 7,
          speed: 8,
          stability: 10,
        },
        hp: { current: 100, capacity: 100 },
      },
    },
    provenance: {
      authority: "git",
      source: "content/characters/characters.json",
      revision,
      canonical: true,
    },
  },
  lifecycle: null,
  schemaVersion: null,
  validations: [],
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
  provenance: [
    {
      authority: "git",
      source: "content/characters/characters.json",
      revision,
      canonical: true,
    },
  ],
  issues: [],
};

const readModels = {
  readModelVersion: 1,
  revision,
  freshness: {
    gitRevision: revision,
    gitState: "deployment-snapshot",
    registryObservedAt: "2026-10-18T04:00:00Z",
    providerState: "registry-observed-no-live-provider-fetch",
  },
  search: { total: 1, offset: 0, limit: 100 },
  models: [character],
  canonicalProposals: {
    state: "available",
    observedAt: "2026-10-18T04:00:00Z",
    items: [],
  },
};

async function mockStudio(page: Page, role: "Viewer" | "Editor") {
  await page.route("**/auth/v1/token?grant_type=password", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tokenResponse),
    }),
  );
  await page.route("**/functions/v1/studio-operations", async (route) => {
    const request = route.request().postDataJSON() as { type?: string };
    const body =
      request.type === "studio.read_models.get"
        ? readModels
        : {
            authorized: true,
            role,
            capabilities:
              role === "Viewer"
                ? ["studio.read"]
                : ["studio.read", "registry.metadata.edit", "canonical.change.propose"],
          };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.route("**/functions/v1/studio-canonical-change", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        replayed: false,
        proposal: {
          changeRequestId: "character-test-1234",
          semanticId: "character.production.hero",
          status: "PR_OPEN",
          branchName: "studio/character/character.production.hero/character-test-1234",
          commitSha: revision,
          pullRequestNumber: 201,
          pullRequestUrl: "https://github.com/drakeshard/fantasia/pull/201",
          validationMessage: "Validated character semantic IDs.",
        },
        request,
      }),
    });
  });
}

async function signIn(page: Page) {
  await page.goto("/?module=characters");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("Viewer can browse canonical Characters but cannot author", async ({ page }) => {
  await mockStudio(page, "Viewer");
  await signIn(page);
  await expect(page.getByTestId("characters-collection")).toBeVisible();
  await page.getByRole("button", { name: /MC/ }).click();
  await expect(page).toHaveURL(/semanticId=character\.production\.hero/);
  await expect(page.getByText("Canonical identity", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Display name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Create Git proposal" })).toBeDisabled();
  await expect(page.getByText("Read-only access", { exact: true })).toBeVisible();
});

test("Characters Assets tab consumes the shared Asset Board empty state", async ({ page }) => {
  await mockStudio(page, "Viewer");
  await signIn(page);
  await page.getByRole("button", { name: /MC/ }).click();
  await page.getByRole("tab", { name: "Assets" }).click();
  await expect(page.getByText("No registered semantic assets", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Provider folders are not treated as semantic asset authority.", { exact: true }),
  ).toBeVisible();
});

test("Editor creates a controlled Git proposal without direct acceptance", async ({ page }) => {
  await mockStudio(page, "Editor");
  await signIn(page);
  await page.getByRole("button", { name: /MC/ }).click();
  await page.getByLabel("Display name").fill("Main Character");
  const proposal = page.waitForRequest("**/functions/v1/studio-canonical-change");
  await page.getByRole("button", { name: "Create Git proposal" }).click();
  const request = await proposal;
  const body = request.postDataJSON() as {
    payload: {
      contentType: string;
      canonicalPath: string;
      operation: { kind: string; displayName: string };
      baseRevision: string;
    };
  };
  expect(body.payload.contentType).toBe("fantasia.character.v1");
  expect(body.payload.canonicalPath).toBe("content/characters/characters.json");
  expect(body.payload.operation).toEqual({
    kind: "set-display-name",
    displayName: "Main Character",
  });
  expect(body.payload.baseRevision).toBe(revision);
  await expect(page.getByText(/Git remains canonical until the PR is merged/)).toBeVisible();
  await expect(page.getByText(/Layer 4 approval\/freeze is separate/)).toBeVisible();
});
