import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByTestId("workspace-lab")).toBeVisible();
});

test("shell exposes exactly the frozen top-level modules without fake routing", async ({ page }) => {
  const shell = page.getByTestId("studio-shell");
  const moduleNav = shell.getByRole("navigation", { name: "Studio modules" });
  const expected = [
    "Dashboard",
    "Characters",
    "Equipment",
    "Skills",
    "Story",
    "Maps & Encounters",
    "Enemies",
    "Assets",
    "Releases",
  ];

  for (const label of expected) {
    await expect(moduleNav.getByRole("button", { name: label })).toBeVisible();
  }
  await expect(moduleNav.getByRole("button")).toHaveCount(9);

  await moduleNav.getByRole("button", { name: "Story" }).click();
  await expect(moduleNav.getByRole("button", { name: "Story" })).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/\/?lab=1$/);
});

test("workspace inspector closes and restores focus to its opener", async ({ page }) => {
  const shell = page.getByTestId("studio-shell");
  const inspector = shell.getByTestId("workspace-inspector");
  await expect(inspector).toBeVisible();

  await inspector.getByRole("button", { name: "Close inspector" }).click();
  const opener = shell.getByRole("button", { name: "Show inspector" });
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(shell.getByTestId("workspace-inspector")).toBeVisible();
  await expect(shell.getByRole("button", { name: "Close inspector" })).toBeFocused();
});

test("template lab includes all five template kinds and truthful common states", async ({ page }) => {
  for (const kind of ["collection", "entity", "asset-board", "operational-queue", "dashboard"]) {
    await expect(page.locator(`[data-template="${kind}"]`).last()).toBeVisible();
  }

  await expect(page.getByText("No records yet", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Read failed", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Read-only view", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Access not granted", { exact: true }).last()).toBeVisible();
});
