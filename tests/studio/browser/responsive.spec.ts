import { expect, test } from "@playwright/test";

test("Studio shared UI stays usable at each supported responsive baseline", async ({ page }) => {
  await page.goto("/?lab=1");
  const shell = page.getByTestId("studio-shell");
  const inventory = page.getByTestId("production-component-inventory");
  await expect(shell).toBeVisible();
  await expect(inventory).toBeVisible();

  const metrics = await page.evaluate(() => {
    const visibleButtons = Array.from(document.querySelectorAll<HTMLElement>(".ui-button")).filter(
      (element) => element.offsetParent !== null,
    );
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      minButtonHeight: Math.min(...visibleButtons.map((button) => button.getBoundingClientRect().height)),
      minButtonWidth: Math.min(...visibleButtons.map((button) => button.getBoundingClientRect().width)),
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.minButtonHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.minButtonWidth).toBeGreaterThanOrEqual(44);

  const collapse = shell.getByRole("button", { name: "Collapse navigation" });
  if (metrics.viewportWidth <= 768) {
    await expect(collapse).toBeHidden();
    await expect(shell.getByRole("button", { name: "Characters" })).toBeVisible();
    await expect(shell.getByRole("button", { name: "Releases" })).toBeVisible();
    return;
  }

  await expect(collapse).toBeVisible();
  await collapse.click();
  await expect(shell).toHaveClass(/studio-shell--collapsed/);
  await expect(shell.getByRole("button", { name: "Characters" })).toBeVisible();
  await expect(shell.getByRole("button", { name: "Expand navigation" })).toBeVisible();
});
