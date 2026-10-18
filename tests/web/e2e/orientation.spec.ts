import { expect, test } from "@playwright/test";

test("portrait view is gated behind the landscape-required screen", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Single deterministic portrait gate proof",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("main", { name: "Landscape orientation required" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rotate your device" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Campaign", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue current story", exact: true }),
  ).toHaveCount(0);

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(391);
});
