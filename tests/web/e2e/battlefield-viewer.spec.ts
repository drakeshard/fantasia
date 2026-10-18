import { expect, test } from "@playwright/test";

test("battlefield developer viewer defaults to the small standardized reference fixture", async ({ page }) => {
  await page.goto("/?dev=battlefield");

  const viewer = page.getByRole("main", { name: "Fantasia battlefield developer viewer" });
  const host = page.getByTestId("battlefield-viewer-host");
  await expect(viewer).toBeVisible();
  await expect(host).toBeVisible();
  await expect(host).toHaveAttribute("data-fixture-id", "reference");
  await expect(host).toHaveAttribute("data-fixture-kind", "reference");
  await expect(host).toHaveAttribute("data-cell-count", "80");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "80");
  await expect(page.getByTestId("battlefield-viewer-canvas")).toBeVisible();
  await expect(page.getByTestId("battlefield-cell-count")).toHaveText("80");
  await expect(page.getByText("Timing probe").locator(".." )).toContainText("none");

  await expect(host).toHaveAttribute("data-camera-rotation", "0");
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByTestId("battlefield-rotate-right").click();
  await expect(host).toHaveAttribute("data-camera-rotation", "90");
  await page.getByTestId("battlefield-zoom-in").click();
  await expect(host).not.toHaveAttribute("data-camera-zoom", "1.00");
  await page.getByTestId("battlefield-fit").click();
  await expect(host).toHaveAttribute("data-camera-zoom", "1.00");
});

test("Ghost Sea and Avalon are explicit 64x64 stress smoke fixtures", async ({ page }) => {
  await page.goto("/?dev=battlefield&fixture=ghost-sea-hunt");

  const host = page.getByTestId("battlefield-viewer-host");
  await expect(host).toHaveAttribute("data-fixture-kind", "stress");
  await expect(host).toHaveAttribute("data-fixture-id", "ghost-sea-hunt");
  await expect(host).toHaveAttribute("data-cell-count", "4096");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "4096", { timeout: 30_000 });
  await expect(page.getByText("Stress Fixture 01 · Seven Sea League")).toBeVisible();

  await page.getByTestId("battlefield-fixture-avalon-arthuria-confrontation").click();
  await expect(host).toHaveAttribute("data-fixture-id", "avalon-arthuria-confrontation");
  await expect(host).toHaveAttribute("data-cell-count", "4096");
  await expect(host).toHaveAttribute("data-rendered-cell-count", "4096", { timeout: 30_000 });
  await expect(page.getByText("Stress Fixture 02 · Avalon Approach")).toBeVisible();

  await expect(host).not.toHaveAttribute("data-performance-sample-status");
  await expect(host).not.toHaveAttribute("data-frame-sample-count");
});

test("legacy environment-scenes URL is only a compatibility alias to the standardized viewer", async ({ page }) => {
  await page.goto("/?dev=environment-scenes");

  await expect(page.getByRole("main", { name: "Fantasia battlefield developer viewer" })).toBeVisible();
  await expect(page.getByTestId("battlefield-viewer-host")).toHaveAttribute("data-fixture-id", "reference");
  await expect(page.getByTestId("environment-scene-host")).toHaveCount(0);
});
