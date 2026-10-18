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

async function expectPerformanceSample(host: ReturnType<Page["getByTestId"]>) {
  await expect(host).toHaveAttribute("data-performance-sample-status", "complete", {
    timeout: 30_000,
  });
  await expect(host).toHaveAttribute("data-renderer-init-ms", /^\d+(?:\.\d+)?$/);
  await expect(host).toHaveAttribute("data-renderer-redraw-ms", /^\d+(?:\.\d+)?$/);
  await expect(host).toHaveAttribute("data-frame-median-ms", /^\d+(?:\.\d+)?$/);
  await expect(host).toHaveAttribute("data-frame-p95-ms", /^\d+(?:\.\d+)?$/);
  await expect(host).toHaveAttribute("data-frame-worst-ms", /^\d+(?:\.\d+)?$/);
  await expect(host).toHaveAttribute("data-frame-sample-count", "36");
}

test("environment review defaults to the 64x64 Ghost Sea Hunt stress scene", async ({
  page,
}, testInfo) => {
  const { review, host } = await openEnvironmentScenes(page);

  await expect(page.getByRole("heading", { name: "Ghost Sea Hunt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ghost Sea Hunt" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(host).toHaveAttribute("data-scene-id", "ghost-sea-hunt");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "4096", { timeout: 30_000 });
  await expect(host).toHaveAttribute("data-weather-cell-count", "4096");
  await expect(page.getByTestId("environment-ghost-sea-canvas")).toBeVisible();

  const weather = page.getByTestId("environment-weather-overlay");
  await expect(weather).toBeVisible();
  await expect(weather).toHaveAttribute("data-weather-id", "weather.ghost-mist");
  await expect(weather).toHaveAttribute("data-weather-cell-count", "4096");
  await expectPerformanceSample(host);

  const reviewBox = await review.boundingBox();
  expect(reviewBox?.width).toBe(page.viewportSize()?.width);
  expect(reviewBox?.height).toBe(page.viewportSize()?.height);

  await openDetails(page);
  await expect(page.getByTestId("environment-selected-coordinate")).toHaveText("(50, 43)");
  await expect(page.getByTestId("environment-selected-terrain")).toHaveText(
    "terrain.water.abyss",
  );
  await expect(page.getByText("weather.ghost-mist", { exact: true })).toBeVisible();
  await expect(page.getByText("4096 rendered cells", { exact: true })).toBeVisible();
  await expect(page.getByTestId("environment-performance-result")).toBeVisible();

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

test("environment review switches to the 64x64 Avalon Arthuria stress scene", async ({ page }) => {
  const { host } = await openEnvironmentScenes(page);

  await page.getByRole("button", { name: "Avalon — Arthuria Confrontation" }).click();
  await expect(page.getByRole("heading", { name: "Avalon — Arthuria Confrontation" })).toBeVisible();
  await expect(host).toHaveAttribute("data-scene-id", "avalon-arthuria-confrontation");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "4096", { timeout: 30_000 });
  await expect(host).toHaveAttribute("data-weather-cell-count", "4096");
  await expect(page.getByTestId("environment-avalon-canvas")).toBeVisible();

  const weather = page.getByTestId("environment-weather-overlay");
  await expect(weather).toBeVisible();
  await expect(weather).toHaveAttribute("data-weather-id", "weather.avalon-mist");
  await expectPerformanceSample(host);

  await openDetails(page);
  await expect(page.getByTestId("environment-selected-coordinate")).toHaveText("(43, 31)");
  await expect(page.getByTestId("environment-selected-terrain")).toHaveText(
    "terrain.stone.sacred",
  );
  await expect(page.getByTestId("environment-selected-elevation")).toHaveText("Elevation +5");
  await expect(page.getByText("weather.avalon-mist", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mist meadow · enchanted water · shore · sacred stone", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("environment-performance-result")).toBeVisible();
});

test("legacy B01 and MAP05 developer routes remain removed", async ({ page }) => {
  await page.goto("/?dev=map-b01");
  await expect(page.getByTestId("b01-map-2p5d-host")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Strangers on the Road" })).toHaveCount(0);

  await page.goto("/?dev=map-stress");
  await expect(page.getByTestId("stress-map-2p5d-host")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Elevation Extremes" })).toHaveCount(0);
});
