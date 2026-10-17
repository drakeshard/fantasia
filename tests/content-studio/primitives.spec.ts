import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
});

test("tabs support keyboard navigation and skip disabled items", async ({ page }) => {
  const overview = page.getByRole("tab", { name: "Overview" });
  const assets = page.getByRole("tab", { name: "Assets" });
  const history = page.getByRole("tab", { name: "History" });
  const unavailable = page.getByRole("tab", { name: "Unavailable" });

  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(assets).toBeFocused();
  await expect(assets).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("End");
  await expect(history).toBeFocused();
  await expect(history).toHaveAttribute("aria-selected", "true");
  await expect(unavailable).toBeDisabled();

  const focusAndSelection = await history.evaluate((element) => {
    const style = getComputedStyle(element);
    const root = getComputedStyle(document.documentElement);
    return {
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      selectionColor: style.color,
      focusToken: root.getPropertyValue("--studio-focus-ring").trim(),
      accentToken: root.getPropertyValue("--studio-accent-primary").trim(),
    };
  });

  expect(focusAndSelection.outlineWidth).toBe("2px");
  expect(focusAndSelection.focusToken).not.toBe(focusAndSelection.accentToken);
  expect(focusAndSelection.outlineColor).not.toBe(focusAndSelection.selectionColor);
});

test("dialog escape cancels and restores focus to the opener", async ({ page }) => {
  const opener = page.getByTestId("open-dialog");
  const dialog = page.locator("#preview-dialog");

  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Reference", { exact: true })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("pending action blocks duplicate commitment", async ({ page }) => {
  const action = page.getByTestId("async-action");
  const count = page.getByTestId("commit-count");

  await action.click();
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute("aria-busy", "true");
  await action.click({ force: true });
  await expect(count).toHaveText("Accepted commitments: 1");

  await expect(action).toBeEnabled();
  await expect(action).toHaveAttribute("aria-busy", "false");
  await expect(count).toHaveText("Accepted commitments: 1");
});

test("invalid form control exposes its error relationship", async ({ page }) => {
  const input = page.getByLabel("Required reference");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const describedBy = await input.getAttribute("aria-describedby");
  expect(describedBy).toBe("studio-invalid-error");
  await expect(page.locator(`#${describedBy}`)).toHaveText("This reference is unavailable.");
});

test("compact and desktop layouts preserve minimum targets and avoid document overflow", async ({
  page,
}) => {
  const metrics = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(".ui-button")).filter(
      (element) => element.offsetParent !== null,
    );
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      minButtonHeight: Math.min(...buttons.map((button) => button.getBoundingClientRect().height)),
      minButtonWidth: Math.min(...buttons.map((button) => button.getBoundingClientRect().width)),
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.minButtonHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.minButtonWidth).toBeGreaterThanOrEqual(44);
});

test("captures the primitive state matrix for visual review", async ({ page }, testInfo) => {
  await mkdir("visual-artifacts/content-studio", { recursive: true });
  await page.screenshot({
    path: `visual-artifacts/content-studio/${testInfo.project.name}-primitives.png`,
    fullPage: true,
  });
});
