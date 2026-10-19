import { expect, type Page, test } from "@playwright/test";

const uiLabHeadings = [
  ["semantic-dimensions", "Independent semantic dimensions"],
  ["primitive-actions", "00B primitive regression surface"],
  ["form-controls", "00B form regression surface"],
  ["tabs", "00B tabs and keyboard regression"],
  ["feedback", "00B feedback regression surface"],
  ["structural-primitives", "00B structural primitives"],
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

for (const [snapshotName, heading] of uiLabHeadings) {
  test(`${heading} matches the accepted shared visual baseline`, async ({ page }) => {
    const section = sectionByHeading(page, heading);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot(`${snapshotName}.png`);
  });
}

test("dialog appearance matches the accepted shared visual baseline", async ({ page }) => {
  await page.getByTestId("open-dialog").click();
  const dialog = page.getByRole("dialog", { name: "Confirm generic action" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveScreenshot("dialog.png");
});

test("shared Studio shell matches the accepted workspace visual baseline", async ({ page }) => {
  const section = sectionByHeading(page, "Global Studio shell");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await expect(section).toHaveScreenshot("studio-shell.png");
});
