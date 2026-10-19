import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByTestId("production-component-inventory")).toBeVisible();
});

test("selectable collection keeps focus and selection as separate observable states", async ({ page }) => {
  const inventory = page.getByTestId("production-component-inventory");
  const list = inventory.getByRole("listbox", { name: "Inventory selectable records" });
  const alpha = list.getByRole("option", { name: /Alpha record/ });
  const beta = list.getByRole("option", { name: /Beta record/ });

  await expect(alpha).toHaveAttribute("aria-selected", "true");
  await beta.focus();
  await expect(beta).toBeFocused();
  await expect(beta).toHaveAttribute("aria-selected", "false");

  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { name: /Gamma record/ })).toBeFocused();
  await expect(alpha).toHaveAttribute("aria-selected", "true");

  await beta.click();
  await expect(beta).toHaveAttribute("aria-selected", "true");
  await expect(alpha).toHaveAttribute("aria-selected", "false");
});

test("shared file picker encapsulates the native input and exposes selected-file feedback", async ({ page }) => {
  const inventory = page.getByTestId("production-component-inventory");
  const input = inventory.locator("#inventory-file");
  await input.setInputFiles({
    name: "source-master.png",
    mimeType: "image/png",
    buffer: Buffer.from("fixture"),
  });

  await expect(inventory.getByText("source-master.png", { exact: true })).toBeVisible();
  await expect(inventory.getByRole("button", { name: "Remove" })).toBeVisible();
  await inventory.getByRole("button", { name: "Remove" }).click();
  await expect(inventory.getByText("Choose a source/master", { exact: true })).toBeVisible();
});

test("production components preserve minimum targets, focus visibility and compact overflow", async ({ page }) => {
  const inventory = page.getByTestId("production-component-inventory");
  const row = inventory.getByRole("option", { name: /Alpha record/ });
  await row.focus();
  const focus = await row.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { outline: style.outlineStyle, height: rect.height };
  });
  expect(focus.outline).not.toBe("none");
  expect(focus.height).toBeGreaterThanOrEqual(44);

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport);
});

test("reduced motion removes production-component transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const inventory = page.getByTestId("production-component-inventory");
  const row = inventory.getByRole("option", { name: /Alpha record/ });
  await expect(row).toHaveCSS("transition-duration", "0s");
});
