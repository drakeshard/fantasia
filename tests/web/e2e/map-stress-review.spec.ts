import { expect, type Page, test } from "@playwright/test";

async function openStressReview(page: Page) {
  await page.goto("/?dev=map-stress");

  const review = page.getByRole("main", {
    name: "GAME-MAP05 non-canonical battlefield stress review",
  });
  const host = page.getByTestId("stress-map-2p5d-host");
  const canvas = page.getByTestId("stress-map-2p5d-canvas");

  await expect(review).toBeVisible();
  await expect(host).toBeVisible();
  await expect(canvas).toBeVisible();

  return { review, host, canvas };
}

async function openDetails(page: Page) {
  const details = page.getByRole("complementary", { name: "Stress map review details" });
  if ((await details.count()) === 0) {
    await page.getByRole("button", { name: "Details" }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

test("GAME-MAP05 renders all 600 stress cells with the review shell overlaid", async ({ page }) => {
  const { review, host } = await openStressReview(page);

  await expect(page.getByRole("heading", { name: "Elevation Extremes" })).toBeVisible();
  await expect(page.getByText(/EXPERIMENTAL · NON-CANONICAL/)).toBeVisible();
  await expect(host).toHaveAttribute("data-rendered-cell-count", "600");
  await expect(host).toHaveAttribute("data-elevation-min", "-7");
  await expect(host).toHaveAttribute("data-elevation-max", "7");
  await expect
    .poll(async () => Number(await host.getAttribute("data-elevation-face-count")))
    .toBeGreaterThan(0);

  const topbar = page.locator(".map-review-topbar");
  const modeSwitch = page.locator(".map-review-mode-switch");
  await expect(topbar).toBeVisible();
  await expect
    .poll(() => topbar.evaluate((element) => getComputedStyle(element).position))
    .toBe("absolute");

  const reviewBox = await review.boundingBox();
  const topbarBox = await topbar.boundingBox();
  const modeSwitchBox = await modeSwitch.boundingBox();
  if (!reviewBox || !topbarBox || !modeSwitchBox) {
    throw new Error("Stress review overlay controls do not have measurable layout boxes");
  }
  expect(topbarBox.y - reviewBox.y).toBeLessThanOrEqual(20);
  expect(topbarBox.height).toBeLessThan(reviewBox.height / 2);
  expect(modeSwitchBox.width).toBeLessThan(reviewBox.width * 0.6);
});

test("GAME-MAP05 Blueprint exposes exact 600-cell geometry and signed elevation sentinels", async ({
  page,
}) => {
  await openStressReview(page);
  await page.getByRole("button", { name: "Blueprint" }).click();

  await expect(page.getByTestId("stress-map-grid").locator("button")).toHaveCount(600);
  await page.getByTestId("stress-map-cell-5-15").click();
  const details = await openDetails(page);
  await expect
    .poll(() => details.evaluate((element) => getComputedStyle(element).position))
    .toBe("absolute");
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(5, 15)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation -7");

  await page.getByRole("button", { name: "Hide details" }).click();
  await expect(page.getByRole("complementary", { name: "Stress map review details" })).toHaveCount(0);
  await page.getByTestId("stress-map-cell-25-4").click();
  await openDetails(page);
  await expect(page.getByTestId("stress-selected-coordinate")).toHaveText("(25, 4)");
  await expect(page.getByTestId("stress-selected-elevation")).toHaveText("Elevation +7");
});
