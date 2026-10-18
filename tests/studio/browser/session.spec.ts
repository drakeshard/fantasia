import { expect, type Page, test } from "@playwright/test";

const tokenResponse = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  user: { email: "operator@example.test" },
};

async function mockSignIn(page: Page, sessionBody: unknown) {
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tokenResponse),
    });
  });
  await page.route("**/functions/v1/studio-operations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sessionBody),
    });
  });
}

async function submitSignIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("production root starts signed out and exposes no workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("studio-signed-out")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByTestId("studio-shell")).toHaveCount(0);
});

test("authenticated user without active Studio membership is denied", async ({ page }) => {
  await mockSignIn(page, { authorized: false, role: null, capabilities: [] });
  await submitSignIn(page);

  await expect(page.getByTestId("studio-unauthorized")).toBeVisible();
  await expect(page.getByText("Authentication alone is not Studio authorization.")).toBeVisible();
  await expect(page.getByTestId("studio-shell")).toHaveCount(0);
});

test("Viewer receives real read-only role presentation", async ({ page }) => {
  await mockSignIn(page, { authorized: true, role: "Viewer", capabilities: ["studio.read"] });
  await submitSignIn(page);

  await expect(page.getByTestId("studio-authorized")).toBeVisible();
  await expect(page.getByTestId("studio-shell")).toBeVisible();
  await expect(page.getByText("Viewer", { exact: true })).toBeVisible();
  await expect(page.getByText("Read-only capabilities", { exact: true })).toBeVisible();
  await expect(page.getByText("UI Lab fixture", { exact: false })).toHaveCount(0);
});

for (const fixture of [
  {
    role: "Editor",
    capabilities: ["studio.read", "registry.metadata.edit"],
  },
  {
    role: "Approver",
    capabilities: ["studio.read", "registry.metadata.edit", "review.approve", "review.freeze"],
  },
  {
    role: "Admin",
    capabilities: ["studio.read", "registry.metadata.edit", "studio.membership.manage"],
  },
] as const) {
  test(`${fixture.role} role is presented from server authorization result`, async ({ page }) => {
    await mockSignIn(page, {
      authorized: true,
      role: fixture.role,
      capabilities: fixture.capabilities,
    });
    await submitSignIn(page);

    await expect(page.getByText(fixture.role, { exact: true })).toBeVisible();
    await expect(page.getByText("Trusted operations enabled", { exact: true })).toBeVisible();
  });
}

test("sign out clears the authenticated Studio shell", async ({ page }) => {
  await mockSignIn(page, { authorized: true, role: "Viewer", capabilities: ["studio.read"] });
  await page.route("**/auth/v1/logout", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
  await submitSignIn(page);
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page.getByTestId("studio-signed-out")).toBeVisible();
  await expect(page.getByTestId("studio-shell")).toHaveCount(0);
  const stored = await page.evaluate(() =>
    localStorage.getItem("fantasia.content-studio.session.v1"),
  );
  expect(stored).toBeNull();
});

test("invalid restored session fails closed", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "fantasia.content-studio.session.v1",
      JSON.stringify({
        accessToken: "invalid-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3_600_000,
        email: "operator@example.test",
      }),
    );
  });
  await page.route("**/functions/v1/studio-operations", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"message":"Authentication required."}',
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("studio-session-error")).toBeVisible();
  await expect(page.getByTestId("studio-shell")).toHaveCount(0);
});
