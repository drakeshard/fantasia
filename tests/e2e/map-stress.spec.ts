import { expect, type Page, test } from "@playwright/test";

async function openStressMap(page: Page) {
  await page.goto("/?dev=map-stress");
  const review = page.getByRole("main", { name: "Large battlefield elevation stress review" });
  const host = page.getByTestId("stress-map-2p5d-host");
  const canvas = page.getByTestId("stress-map-2p5d-canvas");
  await expect(review).toBeVisible();
  await expect(host).toBeVisible();
  await expect(canvas).toBeVisible();
  return { review, host, canvas };
}

async function openStressDetails(page: Page) {
  const details = page.getByRole("complementary", { name: "Stress map details" });
  if ((await details.count()) === 0) {
    await page.getByRole("button", { name: "Details" }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

test("GAME-MAP05 stress Battlefield renders the full elevation envelope and camera", async ({ page }) => {
  const { review, host, canvas } = await openStressMap(page);

  await expect(page.getByRole("heading", { name: "Extreme Elevation Stress Map" })).toBeVisible();
  await expect(page.getByText("NON-CANONICAL · 30×20 · ELEVATION −7…+7")).toBeVisible();
  await expect(host).toHaveAttribute("data-cell-count", "600");
  await expect(host).toHaveAttribute("data-min-elevation", "-7");
  await expect(host).toHaveAttribute("data-max-elevation", "7");
  await expect(host).toHaveAttribute("data-camera-rotation", "0");
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");

  const reviewBox = await review.boundingBox();
  expect(reviewBox?.width).toBe(page.viewportSize()?.width);
  expect(reviewBox?.height).toBe(page.viewportSize()?.height);

  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(host).toHaveAttribute("data-camera-rotation", "90");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(host).not.toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByRole("button", { name: "Fit map" }).click();
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  await expect(host).toHaveAttribute("data-camera-pan", "0,0");

  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return Boolean(box && box.width > 0 && box.height > 0);
    })
    .toBe(true);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Stress map canvas has no bounding box after readiness check");
  const startX = box.x + box.width * 0.45;
  const startY = box.y + box.height * 0.6;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY + 30, { steps: 3 });
  await page.mouse.up();
  await expect(host).not.toHaveAttribute("data-camera-pan", "0,0");
});

test("GAME-MAP05 stress Blueprint exposes exactly 600 cells with -7 and +7 sentinels", async ({ page }) => {
  await openStressMap(page);
  await page.getByRole("button", { name: "Blueprint" }).click();
  await expect(page.getByTestId("stress-map-grid").locator("button")).toHaveCount(600);

  await page.getByTestId("stress-map-cell-0-0").click();
  await openStressDetails(page);
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(0, 0)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation -7");
  await page.getByRole("button", { name: "Hide details" }).click();

  await page.getByTestId("stress-map-cell-26-0").click();
  await openStressDetails(page);
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(26, 0)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation +7");
  await expect(page.getByTestId("stress-min-sentinel")).toContainText("(0, 0)");
  await expect(page.getByTestId("stress-max-sentinel")).toContainText("(26, 0)");
});
