import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByTestId("workspace-lab")).toBeVisible();
});

test("asset board keeps semantic identity separate from provider references and runtime evidence", async ({
  page,
}) => {
  const board = page.locator('[data-template="asset-board"]').last();
  await expect(board.getByTestId("asset-board-composition")).toBeVisible();
  await expect(board.getByText("character.example.portrait.base", { exact: true }).first()).toBeVisible();
  await expect(board.getByText("Redacted by trusted read boundary", { exact: true })).toBeVisible();
  await expect(board.getByText("image/png", { exact: true })).toBeVisible();
  await expect(board.getByText("2400 × 3200", { exact: true })).toBeVisible();
  await expect(board.getByText("sha256:example-checksum-v3", { exact: true })).toBeVisible();
  await expect(board.getByText("Mapped", { exact: true })).toBeVisible();
  await expect(board.getByText("characters/example/portrait-base.webp", { exact: true }).first()).toBeVisible();
});

test("asset board retains version history and exposes relation and validation evidence independently", async ({
  page,
}) => {
  const board = page.locator('[data-template="asset-board"]').last();
  await expect(board.getByText(/v1 · Historical version/)).toBeVisible();
  await expect(board.getByText(/v2 · Historical version/)).toBeVisible();
  await expect(board.getByText(/v3 · Current version/).first()).toBeVisible();
  await expect(board.getByText("used-by", { exact: true })).toBeVisible();
  await expect(board.getByText("alternate-of", { exact: true })).toBeVisible();
  await expect(board.getByText("provider-reference-redacted", { exact: true })).toBeVisible();
});

test("asset selection surfaces a missing current version without fabricating source metadata", async ({
  page,
}) => {
  const board = page.locator('[data-template="asset-board"]').last();
  await board.getByRole("button", { name: /Battle sprite/ }).click();
  await expect(board.getByText("No current asset version", { exact: true })).toBeVisible();
  await expect(board.getByText("Required derivative not registered", { exact: true })).toBeVisible();
  await expect(board.getByText("current-version-missing", { exact: true })).toBeVisible();
});

test("asset board distinguishes empty, unavailable, loading and error states", async ({ page }) => {
  await expect(page.getByText("No registered semantic assets", { exact: true })).toBeVisible();
  await expect(page.getByText("Asset evidence unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Loading asset board", { exact: true })).toBeVisible();
  await expect(page.getByText("Asset board read failed", { exact: true })).toBeVisible();
});

test("asset board remains usable without horizontal document overflow", async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    minAssetTargetHeight: Math.min(
      ...Array.from(document.querySelectorAll<HTMLElement>(".studio-asset-card"))
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.getBoundingClientRect().height),
    ),
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.minAssetTargetHeight).toBeGreaterThanOrEqual(44);
});
