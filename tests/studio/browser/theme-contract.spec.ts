import { expect, test } from "@playwright/test";

const requiredThemeTokens = [
  "--studio-app-background",
  "--studio-surface-canvas",
  "--studio-surface-panel",
  "--studio-surface-raised",
  "--studio-text-primary",
  "--studio-text-secondary",
  "--studio-text-muted",
  "--studio-border-subtle",
  "--studio-border-control",
  "--studio-border-active",
  "--studio-accent-primary",
  "--studio-accent-navigation",
  "--studio-focus-ring",
  "--studio-button-primary-bg",
  "--studio-button-secondary-bg",
  "--studio-control-bg",
  "--studio-dialog-bg",
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
});

test("Fantasia Midnight resolves the required runtime theme contract", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-studio-theme", "fantasia-midnight");

  const resolved = await page.evaluate((tokens) => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(tokens.map((token) => [token, styles.getPropertyValue(token).trim()]));
  }, requiredThemeTokens);

  for (const token of requiredThemeTokens) {
    expect(resolved[token], `${token} should resolve under fantasia-midnight`).not.toBe("");
  }

  expect(resolved["--studio-focus-ring"]).not.toBe(resolved["--studio-accent-primary"]);
  expect(resolved["--studio-text-primary"]).not.toBe(resolved["--studio-surface-canvas"]);
});

test("shared primitives consume the theme while base CSS owns application paint", async ({ page }) => {
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const primaryButton = getComputedStyle(document.querySelector(".ui-button--primary")!);
    const control = getComputedStyle(document.querySelector(".ui-control")!);
    const panel = getComputedStyle(document.querySelector(".ui-surface--panel")!);

    return {
      bodyBackgroundImage: body.backgroundImage,
      buttonBackgroundImage: primaryButton.backgroundImage,
      buttonBorderColor: primaryButton.borderColor,
      controlBackgroundImage: control.backgroundImage,
      controlBorderColor: control.borderColor,
      panelBackgroundImage: panel.backgroundImage,
    };
  });

  expect(styles.bodyBackgroundImage).not.toBe("none");
  expect(styles.buttonBackgroundImage).not.toBe("none");
  expect(styles.buttonBorderColor).not.toBe("");
  expect(styles.controlBackgroundImage).not.toBe("none");
  expect(styles.controlBorderColor).not.toBe("");
  expect(styles.panelBackgroundImage).not.toBe("none");
});
