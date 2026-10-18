import { expect, type Page, test } from "@playwright/test";

async function openStressReview(page: Page) {
  await page.goto("/?dev=map-stress");

  const review = page.getByRole("main", { name: "Large terrain elevation stress review" });
  const host = page.getByTestId("stress-map-2p5d-host");
  const canvas = page.getByTestId("stress-map-2p5d-canvas");

  await expect(review).toBeVisible();
  await expect(host).toBeVisible();
  await expect(canvas).toBeVisible();

  return { review, host, canvas };
}

async function openStressDetails(page: Page) {
  const details = page.getByRole("complementary", { name: "Terrain stress details" });
  if ((await details.count()) === 0) {
    await page.getByRole("button", { name: "Details" }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

test("large terrain stress review exposes the full signed elevation fixture and camera controls", async ({
  page,
}) => {
  const { host } = await openStressReview(page);

  await expect(page.getByRole("heading", { name: "Elevation Stress Field" })).toBeVisible();
  await expect(page.getByText(/EXPERIMENTAL · NON-CANONICAL/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Battlefield" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(host).toHaveAttribute("data-map-cell-count", "768");
  await expect(host).toHaveAttribute("data-elevation-min", "-7");
  await expect(host).toHaveAttribute("data-elevation-max", "7");
  await expect(host).toHaveAttribute("data-camera-rotation", "0");
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");

  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(host).toHaveAttribute("data-camera-rotation", "90");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(host).not.toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByRole("button", { name: "Fit map" }).click();
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  await expect(host).toHaveAttribute("data-camera-pan", "0,0");
});

test("large terrain stress review supports drag-pan after the large Pixi canvas is ready", async ({
  page,
}) => {
  const { host, canvas } = await openStressReview(page);

  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return Boolean(box && box.width > 0 && box.height > 0);
    })
    .toBe(true);

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Stress map canvas has no bounding box after readiness check");
  const startX = canvasBox.x + canvasBox.width * 0.38;
  const startY = canvasBox.y + canvasBox.height * 0.64;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 110, startY + 42, { steps: 3 });
  await page.mouse.up();
  await expect(host).not.toHaveAttribute("data-camera-pan", "0,0");
});

test("large terrain Blueprint audits all 768 cells and exact +7/-7 points", async ({ page }) => {
  await openStressReview(page);
  await page.getByRole("button", { name: "Blueprint" }).click();

  await expect(page.getByRole("button", { name: "Blueprint" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("stress-map-grid").locator("button")).toHaveCount(768);

  await page.getByTestId("stress-cell-1-1").click();
  await openStressDetails(page);
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(1, 1)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation +7");
  await expect(page.getByTestId("stress-level-count")).toHaveText("15");
  await page.getByRole("button", { name: "Hide details" }).click();

  await page.getByTestId("stress-cell-30-22").click();
  await openStressDetails(page);
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(30, 22)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation -7");
  await expect(page.getByTestId("stress-cell-count")).toHaveText("768");
});
