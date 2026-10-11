import { expect, type Locator, type Page, test } from "@playwright/test";

async function expectTopRight(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) return;
  expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.72);
  expect(box.y).toBeLessThan(Math.min(90, viewport.height * 0.25));
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

async function expectHomeBeforeSettings(scope: Locator, page: Page) {
  const home = scope.getByRole("button", { name: "Home", exact: true });
  const settings = scope.getByRole("button", { name: "Settings", exact: true });
  await expect(home).toBeVisible();
  await expect(settings).toBeVisible();
  const homeBox = await home.boundingBox();
  const settingsBox = await settings.boundingBox();
  expect(homeBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  if (!homeBox || !settingsBox) return;
  expect(homeBox.x).toBeLessThan(settingsBox.x);
  await expectTopRight(settings, page);
}

test("global Home and Settings utilities stay predictable across player screens", async ({ page }) => {
  await page.goto("/");

  const homeHud = page.locator(".home-lobby-hud");
  const homeSettings = homeHud.getByRole("button", { name: "Settings", exact: true });
  await expectTopRight(homeSettings, page);
  await expect(page.locator(".home-game-dock").getByRole("button", { name: "Settings" })).toHaveCount(0);

  await page.getByRole("button", { name: "Campaign", exact: true }).click();
  const sagaHud = page.locator(".saga-top-hud");
  await expectHomeBeforeSettings(sagaHud, page);

  await page.getByRole("button", { name: /A Stranger in France/ }).click();
  const chapterNav = page.locator(".campaign-root-navigation");
  await expect(chapterNav.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expectHomeBeforeSettings(chapterNav, page);

  const inspector = page.locator(".campaign-inspector");
  await inspector.getByRole("button", { name: "View story", exact: true }).click();
  const storyHud = page.locator(".story-hud");
  await expect(storyHud.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expectHomeBeforeSettings(storyHud, page);

  await storyHud.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  const charactersHud = page.locator(".characters-hud");
  await expectHomeBeforeSettings(charactersHud, page);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test("battle Settings uses the same top-right utility zone without inventing a Home exit", async ({
  page,
}) => {
  await page.goto("/?dev=battle");
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await expectTopRight(settings, page);
  await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
