import { expect, test } from "@playwright/test";

async function openInventory(page: import("@playwright/test").Page) {
  await page.goto("/?lab=1");
  await expect(page.getByRole("heading", { name: "Production component inventory" })).toBeVisible();
}

test("shared selectable collection keeps focus navigation separate from selection", async ({ page }) => {
  await openInventory(page);
  const collection = page.getByRole("listbox", { name: "Inventory examples" });
  const alpha = collection.getByRole("option", { name: "Alpha asset" });
  const beta = collection.getByRole("option", { name: "Beta character" });

  await expect(alpha).toHaveAttribute("aria-selected", "true");
  await expect(beta).toHaveAttribute("aria-selected", "false");

  await alpha.focus();
  await page.keyboard.press("ArrowDown");
  await expect(beta).toBeFocused();
  await expect(alpha).toHaveAttribute("aria-selected", "true");
  await expect(beta).toHaveAttribute("aria-selected", "false");

  await page.keyboard.press("Home");
  await expect(alpha).toBeFocused();
  await expect(alpha).toHaveAttribute("aria-selected", "true");

  await beta.click();
  await expect(beta).toHaveAttribute("aria-selected", "true");
  await expect(alpha).toHaveAttribute("aria-selected", "false");

  const styles = await beta.evaluate((node) => {
    const style = getComputedStyle(node);
    return { outlineColor: style.outlineColor, background: style.backgroundColor };
  });
  expect(styles.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
});

test("shared FilePicker owns the native file relationship and selected-file recovery", async ({ page }) => {
  await openInventory(page);
  const input = page.locator("#inventory-file");
  await expect(page.getByText("Source/master file", { exact: true })).toBeVisible();
  await input.setInputFiles({ name: "source-master.png", mimeType: "image/png", buffer: Buffer.from("asset") });
  await expect(page.getByText("source-master.png", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("source-master.png", { exact: true })).toHaveCount(0);
});

test("production component inventory keeps minimum targets and compact overflow safe", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openInventory(page);
  const inventory = page.getByTestId("production-component-inventory");
  const sizes = await inventory.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
  );
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
});
