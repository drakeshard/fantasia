import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

type ContrastPair = {
  foreground: string;
  background: string;
  minimum: 3 | 4.5;
  purpose: string;
};

type DesignSystemContract = {
  schemaVersion: 1;
  theme: { id: string; scope: string };
  requiredThemeTokens: string[];
  contrastPairs: ContrastPair[];
};

const designSystemContract = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "apps/content-studio/design-system-contract.json"), "utf8"),
) as DesignSystemContract;

const { requiredThemeTokens, contrastPairs } = designSystemContract;

function relativeLuminance(rgb: [number, number, number]) {
  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: [number, number, number], background: [number, number, number]) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseComputedRgb(value: string): [number, number, number] {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    throw new Error(`Expected computed RGB color, received: ${value}`);
  }
  return channels as [number, number, number];
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=1");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
});

test("Fantasia Midnight resolves the centralized runtime theme contract", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-studio-theme", designSystemContract.theme.id);

  const resolved = await page.evaluate((tokens) => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(tokens.map((token) => [token, styles.getPropertyValue(token).trim()]));
  }, requiredThemeTokens);

  for (const token of requiredThemeTokens) {
    expect(resolved[token], `${token} should resolve under ${designSystemContract.theme.id}`).not.toBe("");
  }

  expect(resolved["--studio-focus-ring"]).not.toBe(resolved["--studio-accent-primary"]);
  expect(resolved["--studio-text-primary"]).not.toBe(resolved["--studio-surface-canvas"]);
});

test("representative semantic color pairs satisfy the accessibility contract", async ({ page }) => {
  const computedPairs = await page.evaluate((pairs) => {
    return pairs.map((pair) => {
      const probe = document.createElement("div");
      probe.style.color = `var(${pair.foreground})`;
      probe.style.backgroundColor = `var(${pair.background})`;
      probe.style.position = "fixed";
      probe.style.left = "-10000px";
      document.body.append(probe);
      const styles = getComputedStyle(probe);
      const result = {
        ...pair,
        foregroundValue: styles.color,
        backgroundValue: styles.backgroundColor,
      };
      probe.remove();
      return result;
    });
  }, contrastPairs);

  for (const pair of computedPairs) {
    const ratio = contrastRatio(
      parseComputedRgb(pair.foregroundValue),
      parseComputedRgb(pair.backgroundValue),
    );
    expect(
      ratio,
      `${pair.purpose}: ${pair.foreground} on ${pair.background} should be >= ${pair.minimum}:1, received ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(pair.minimum);
  }
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

test("reduced-motion preference removes primitive animation and transition behavior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const reducedMotion = await page.evaluate(() => {
    const spinner = getComputedStyle(document.querySelector(".ui-spinner__mark")!);
    const button = getComputedStyle(document.querySelector(".ui-button")!);
    const control = getComputedStyle(document.querySelector(".ui-control")!);

    return {
      spinnerAnimationName: spinner.animationName,
      buttonTransitionDuration: button.transitionDuration,
      controlTransitionDuration: control.transitionDuration,
    };
  });

  expect(reducedMotion.spinnerAnimationName).toBe("none");
  expect(reducedMotion.buttonTransitionDuration).toBe("0s");
  expect(reducedMotion.controlTransitionDuration).toBe("0s");
});
