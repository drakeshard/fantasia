import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

const artifactRoot = path.resolve("visual-artifacts");

async function projectDirectory(testInfo: TestInfo) {
  const directory = path.join(artifactRoot, testInfo.project.name);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function waitForVisualStability(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

test("capture player-facing primitive state matrix", async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  test.skip(Boolean(viewport && viewport.height > viewport.width), "Landscape primitive review only");

  await page.goto("/primitives-review.html");
  await expect(page.getByRole("main", { name: "Fantasia UI primitive review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary commitment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unavailable feature" })).toBeDisabled();

  const interactiveSizes = await page.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        label: button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    }),
  );

  for (const size of interactiveSizes) {
    expect(size.width, `${size.label} width`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${size.label} height`).toBeGreaterThanOrEqual(44);
  }

  const selected = page.getByRole("button", { name: "Selected" });
  await selected.focus();
  await expect(selected).toBeFocused();

  const visualState = await selected.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      outlineColor: style.outlineColor,
      borderColor: style.borderColor,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(visualState.outlineWidth).not.toBe("0px");
  expect(visualState.outlineColor).not.toBe(visualState.borderColor);

  const directory = await projectDirectory(testInfo);
  await waitForVisualStability(page);
  await page.screenshot({
    path: path.join(directory, "primitives-review.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  await writeFile(
    path.join(directory, "primitives-review-controls.json"),
    `${JSON.stringify({ viewport, interactiveSizes, visualState }, null, 2)}\n`,
  );
});
