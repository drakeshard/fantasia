import { expect, type Page, test } from "@playwright/test";

const visualContracts = [
  ["semantic-dimensions", "Independent semantic dimensions"],
  ["studio-shell", "Global Studio shell"],
] as const;

function sectionByHeading(page: Page, heading: string) {
  return page
    .getByRole("heading", { name: heading, exact: true })
    .locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " preview-section ")][1]');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

for (const [snapshotName, heading] of visualContracts) {
  test(`${heading} matches the accepted shared visual baseline`, async ({ page }) => {
    const section = sectionByHeading(page, heading);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`${snapshotName}.png`);
  });
}
