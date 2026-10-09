import { expect, test } from "@playwright/test";
import { UI_PREFERENCES_STORAGE_KEY } from "../../apps/web/src/preferences.ts";

test("D08 settings persist UI preferences and restore modal focus", async ({ page }, testInfo) => {
  await page.goto("/");

  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await expect(settings).toBeVisible();
  await settings.focus();
  await settings.click();

  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();

  await dialog.getByLabel("Interface text").selectOption("1.25");
  await dialog.getByLabel("Persistent map labels").uncheck();
  await dialog.getByLabel("Reduce motion").check();

  await expect(page.locator("html")).toHaveAttribute("data-ui-persistent-labels", "false");
  await expect(page.locator("html")).toHaveAttribute("data-ui-reduce-motion", "true");
  await expect(page.locator("html")).toHaveCSS("font-size", "20px");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settings).toBeFocused();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ui-persistent-labels", "false");
  await expect(page.locator("html")).toHaveAttribute("data-ui-reduce-motion", "true");
  await expect(page.locator("html")).toHaveCSS("font-size", "20px");

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

  if (testInfo.project.name === "chromium-short-touch") {
    expect(page.viewportSize()).toEqual({ width: 844, height: 390 });
  }
});

test("D08 recovers truthfully from malformed stored preferences", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "{not-json");
  }, UI_PREFERENCES_STORAGE_KEY);
  await page.goto("/");

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(
    dialog.getByText("Saved interface preferences could not be read. Defaults are in use until you save or reset them."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Retry storage", exact: true }).click();
  await expect(dialog.getByText("Interface preferences are saved in this browser.")).toBeVisible();
});

test("D08 settings remain reachable from the development battle sandbox", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Development battle sandbox", exact: true }).click();
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
});
