import { expect, type Page, test } from "@playwright/test";

const visualAnchors = [
  ["semantic-dimensions", "Independent semantic dimensions"],
  ["primitive-actions", "00B primitive regression surface"],
  ["form-controls", "00B form regression surface"],
  ["workspace-shell", "Global Studio shell"],
] as const;

async function alignHeadingToViewport(page: Page, heading: string) {
  const target = page.getByRole("heading", { name: heading, exact: true });
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await target.evaluate((element) => element.scrollIntoView({ block: "start", inline: "nearest" }));
  await page.evaluate(() => window.scrollBy(0, -16));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

for (const [snapshotName, heading] of visualAnchors) {
  test(`${heading} matches the accepted viewport baseline`, async ({ page }) => {
    await alignHeadingToViewport(page, heading);
    await expect(page).toHaveScreenshot(`${snapshotName}.png`);
  });
}

test("dialog overlay matches the accepted viewport baseline", async ({ page }) => {
  await alignHeadingToViewport(page, "00B dialog and drawer regression");
  await page.getByTestId("open-dialog").click();
  await expect(page.getByRole("dialog", { name: "Confirm generic action" })).toBeVisible();
  await expect(page).toHaveScreenshot("dialog-overlay.png");
});
