import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

const artifactRoot = path.resolve("visual-artifacts");

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

async function projectDirectory(testInfo: TestInfo) {
  const directory = path.join(artifactRoot, testInfo.project.name);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function captureViewport(page: Page, testInfo: TestInfo, name: string) {
  const directory = await projectDirectory(testInfo);
  await waitForVisualStability(page);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: false,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
}

async function captureHomeGeometry(page: Page, testInfo: TestInfo) {
  const geometry = await page.evaluate(() => {
    const selectors = [
      ".home-screen",
      ".home-topbar",
      ".home-main-layout",
      ".home-hero-copy",
      ".home-hero-title",
      ".home-story-card",
      ".home-command-column",
      ".home-footer",
    ];

    const regions = Object.fromEntries(
      selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return [selector, null];
        const rect = element.getBoundingClientRect();
        return [
          selector,
          {
            x: Number(rect.x.toFixed(2)),
            y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
            right: Number(rect.right.toFixed(2)),
            bottom: Number(rect.bottom.toFixed(2)),
          },
        ];
      }),
    );

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      regions,
    };
  });

  const directory = await projectDirectory(testInfo);
  await writeFile(
    path.join(directory, "home-geometry.json"),
    `${JSON.stringify(geometry, null, 2)}\n`,
  );
}

test("capture controlled player-facing UI for review", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();
  await captureViewport(page, testInfo, "home");
  await captureHomeGeometry(page, testInfo);

  await page.getByRole("button", { name: "Campaign", exact: true }).click();
  await expect(page.getByRole("main").locator(".saga-reference-screen")).toBeVisible();
  await captureViewport(page, testInfo, "saga");

  await page.goto("/");
  await page.getByRole("button", { name: "Continue current story", exact: true }).click();
  await expect(page.locator(".campaign-map")).toBeVisible();
  await captureViewport(page, testInfo, "chapter");

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
  await captureViewport(page, testInfo, "settings");
});
