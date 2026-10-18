import { expect, type Page, test } from "@playwright/test";

function projectedCellPoint(width: number, height: number, x: number, y: number) {
  const tileWidth = 84;
  const tileHeight = 42;
  const padding = 44;
  const minX = -252;
  const minY = -57;
  const contentWidth = 676;
  const contentHeight = 418;
  const scale = Math.min(
    1.35,
    Math.max(0.52, Math.min(width / contentWidth, height / contentHeight)),
  );
  const worldX = (width - contentWidth * scale) / 2 + (padding - minX) * scale;
  const worldY = (height - contentHeight * scale) / 2 + (padding - minY) * scale;
  return {
    x: worldX + (x - y) * (tileWidth / 2) * scale,
    y: worldY + (x + y) * (tileHeight / 2) * scale,
  };
}

async function activateCanvasPoint(page: Page, x: number, y: number) {
  const canvas = page.getByTestId("production-battlefield-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const point = projectedCellPoint(box.width, box.height, x, y);
  await page.touchscreen.tap(box.x + point.x, box.y + point.y);
}

test("compact Battle keeps authoritative preview facts visible before confirmation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-short-touch",
    "GAME-UI24E5 compact proof is scoped to the 844×390 short-touch reference",
  );

  await page.goto("/?dev=battle");
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toBeVisible();

  const moveButton = page.getByRole("button", { name: "Move", exact: true });
  await moveButton.click();
  await activateCanvasPoint(page, 1, 5);

  const preview = page.locator(".command-preview");
  await expect(preview.getByText("Move to selected square", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Square 1, 5 · Cost 1 · Movement after 4/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm move", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await activateCanvasPoint(page, 2, 5);

  await expect(preview.getByText("Attack Lancer", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Target Lancer · .* · HP /)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm attack", exact: true })).toBeVisible();

  for (const name of ["Inspect", "Move", "Attack", "End turn", "Settings"]) {
    const control = page.getByRole("button", { name, exact: true });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const viewport = page.viewportSize();
  expect(viewport).toEqual({ width: 844, height: 390 });
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  expect(pageSize.width).toBeLessThanOrEqual(844);
  expect(pageSize.height).toBeLessThanOrEqual(390);
});
