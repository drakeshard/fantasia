import { expect, test } from "@playwright/test";

test("CH01-B01 review is a full-screen camera workspace with exact blueprint fallback", async ({
  page,
}) => {
  await page.goto("/?dev=map-b01");

  const review = page.getByRole("main", { name: "CH01-B01 candidate map review" });
  const host = page.getByTestId("b01-map-2p5d-host");
  await expect(review).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strangers on the Road" })).toBeVisible();
  await expect(page.getByText(/PROVISIONAL/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Battlefield" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(host).toBeVisible();
  await expect(page.getByTestId("b01-map-2p5d-canvas")).toBeVisible();
  await expect(page.getByTestId("b01-map-grid")).toHaveCount(0);

  const reviewBox = await review.boundingBox();
  expect(reviewBox?.width).toBe(page.viewportSize()?.width);
  expect(reviewBox?.height).toBe(page.viewportSize()?.height);

  await expect(host).toHaveAttribute("data-camera-rotation", "0");
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  await expect(host).toHaveAttribute("data-camera-pan", "0,0");

  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(host).toHaveAttribute("data-camera-rotation", "90");
  await page.getByRole("button", { name: "Rotate left" }).click();
  await expect(host).toHaveAttribute("data-camera-rotation", "0");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(host).not.toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByRole("button", { name: "Fit map" }).click();
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  await expect(host).toHaveAttribute("data-camera-pan", "0,0");

  const selectedBeforeDrag = await page.getByTestId("selected-coordinate").textContent();
  const canvasBox = await page.getByTestId("b01-map-2p5d-canvas").boundingBox();
  if (!canvasBox) throw new Error("B01 map canvas has no bounding box");
  const startX = canvasBox.x + canvasBox.width * 0.48;
  const startY = canvasBox.y + canvasBox.height * 0.55;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY + 35, { steps: 5 });
  await page.mouse.up();
  await expect(host).not.toHaveAttribute("data-camera-pan", "0,0");
  await expect(page.getByTestId("selected-coordinate")).toHaveText(selectedBeforeDrag ?? "");

  await page.getByRole("button", { name: "Hide details" }).click();
  await expect(page.getByRole("complementary", { name: "Map review details" })).toHaveCount(0);
  await page.getByRole("button", { name: "Details" }).click();
  await expect(page.getByRole("complementary", { name: "Map review details" })).toBeVisible();

  await page.getByRole("button", { name: "Blueprint" }).click();
  await expect(page.getByRole("button", { name: "Blueprint" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("b01-map-grid").locator("button")).toHaveCount(216);

  await page.getByTestId("map-cell-10-2").click();
  await expect(page.getByTestId("selected-coordinate")).toHaveText("(10, 2)");
  await expect(page.getByTestId("selected-label")).toHaveText("Unknown Warrior");
  await expect(page.getByText("Elevation +1", { exact: true })).toBeVisible();
  await expect(page.getByText(/hangaku-intervention/)).toBeVisible();

  await page.getByTestId("map-cell-4-6").click();
  await expect(page.getByTestId("selected-coordinate")).toHaveText("(4, 6)");
  await expect(page.getByText("Cart route anchor", { exact: true })).toBeVisible();
  await expect(page.getByText("Inside tested 2×1 cart clearance", { exact: true })).toBeVisible();

  await page.getByTestId("map-cell-16-5").click();
  await expect(page.getByText("East exit zone", { exact: true })).toBeVisible();
});
