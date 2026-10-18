import { expect, type Page, test } from "@playwright/test";

async function openEnvironmentScenes(page: Page) {
  await page.goto("/?dev=environment-scenes");

  const review = page.getByRole("main", { name: "Fantasia environment scene review" });
  const host = page.getByTestId("environment-scene-host");
  await expect(review).toBeVisible();
  await expect(host).toBeVisible();
  return { review, host };
}

async function openDetails(page: Page) {
  const details = page.getByRole("complementary", { name: "Environment scene details" });
  if ((await details.count()) === 0) {
    await page.getByRole("button", { name: "Details" }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

test("environment review defaults to the styled Twin Isles Shore scene", async ({ page }, testInfo) => {
  const { review, host } = await openEnvironmentScenes(page);

  await expect(page.getByRole("heading", { name: "Twin Isles Shore" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Twin Isles Shore" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(host).toHaveAttribute("data-scene-id", "twin-isles-shore");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "504");
  await expect(host).toHaveAttribute("data-weather-cell-count", "0");
  await expect(page.getByTestId("environment-twin-isles-canvas")).toBeVisible();
  await expect(page.getByTestId("environment-blizzard-overlay")).toHaveCount(0);

  const reviewBox = await review.boundingBox();
  expect(reviewBox?.width).toBe(page.viewportSize()?.width);
  expect(reviewBox?.height).toBe(page.viewportSize()?.height);

  await openDetails(page);
  await expect(page.getByTestId("environment-selected-coordinate")).toHaveText("(8, 6)");
  await expect(page.getByTestId("environment-selected-terrain")).toHaveText("terrain.ridge");
  await expect(page.getByText("Clear weather", { exact: true })).toBeVisible();

  await expect(host).toHaveAttribute("data-camera-rotation", "0");
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  if (testInfo.project.use.hasTouch === true) return;

  await page.getByRole("button", { name: "Rotate right" }).click();
  await expect(host).toHaveAttribute("data-camera-rotation", "90");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(host).not.toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByRole("button", { name: "Fit map" }).click();
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
});

test("environment review switches to desert canyon tundra and localized blizzard", async ({ page }) => {
  const { host } = await openEnvironmentScenes(page);

  await page.getByRole("button", { name: "Canyon Blizzard Frontier" }).click();
  await expect(page.getByRole("heading", { name: "Canyon Blizzard Frontier" })).toBeVisible();
  await expect(host).toHaveAttribute("data-scene-id", "canyon-blizzard-frontier");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "600");
  await expect(host).toHaveAttribute("data-weather-cell-count", "180");
  await expect(page.getByTestId("environment-canyon-blizzard-canvas")).toBeVisible();

  const blizzard = page.getByTestId("environment-blizzard-overlay");
  await expect(blizzard).toBeVisible();
  await expect(blizzard).toHaveAttribute("data-weather-cell-count", "180");

  await openDetails(page);
  await expect(page.getByTestId("environment-selected-coordinate")).toHaveText("(24, 10)");
  await expect(page.getByTestId("environment-selected-terrain")).toHaveText("terrain.snow");
  await expect(page.getByText("weather.blizzard", { exact: true })).toBeVisible();
  await expect(page.getByText("Sand · canyon · tundra · snow", { exact: true })).toBeVisible();
});

test("legacy B01 and MAP05 developer routes are removed", async ({ page }) => {
  await page.goto("/?dev=map-b01");
  await expect(page.getByTestId("b01-map-2p5d-host")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Strangers on the Road" })).toHaveCount(0);

  await page.goto("/?dev=map-stress");
  await expect(page.getByTestId("stress-map-2p5d-host")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Elevation Extremes" })).toHaveCount(0);
});
