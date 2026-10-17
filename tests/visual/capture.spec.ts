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

async function captureGeometry(
  page: Page,
  testInfo: TestInfo,
  filename: string,
  selectors: readonly string[],
) {
  const geometry = await page.evaluate((requestedSelectors) => {
    const regions = Object.fromEntries(
      requestedSelectors.map((selector) => {
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
  }, selectors);

  const directory = await projectDirectory(testInfo);
  await writeFile(path.join(directory, filename), `${JSON.stringify(geometry, null, 2)}\n`);
}

async function captureAuthGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "auth-geometry.json", [
    ".auth-screen",
    ".auth-brand-panel",
    ".auth-panel",
    ".auth-panel-frame",
    ".auth-mode-switch",
    ".auth-form",
  ]);
}

async function captureHomeGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "home-geometry.json", [
    ".home-screen",
    ".home-lobby-hud",
    ".home-lobby-field",
    ".home-lobby-stage",
    ".home-current-story",
    ".home-feature-rail",
    ".home-game-dock",
  ]);
}

async function captureCharactersGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "characters-geometry.json", [
    ".characters-screen",
    ".characters-hud",
    ".characters-layout",
    ".characters-roster",
    ".character-profile",
    ".character-profile-facts",
  ]);
}

async function captureTalentGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "talent-geometry.json", [
    ".talent-screen",
    ".talent-hud",
    ".talent-workspace",
    ".talent-family-rail",
    ".talent-content",
    ".talent-doctrine-grid",
  ]);
}

async function captureSagaGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "saga-geometry.json", [
    ".saga-campaign-screen",
    ".saga-war-table",
    ".saga-top-hud",
    ".saga-war-table-body",
    ".saga-chapter-route",
    ".saga-current-mission",
  ]);
}

async function captureChapterGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "chapter-geometry.json", [
    ".campaign-rooted-shell",
    ".campaign-screen",
    ".campaign-shell",
    ".campaign-header",
    ".campaign-map-panel",
    ".campaign-map-viewport",
    ".stage-list",
    ".campaign-inspector",
  ]);
}

async function captureStoryGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "story-geometry.json", [
    ".story-screen",
    ".story-hud",
    ".story-stage",
    ".story-scene-context",
    ".story-caption",
    ".story-controls",
  ]);
}

async function captureBattleGeometry(page: Page, testInfo: TestInfo) {
  await captureGeometry(page, testInfo, "battle-geometry.json", [
    ".battle-screen",
    ".battle-stage",
    ".pixi-battlefield",
    ".battle-statusbar",
    ".active-unit-card",
    ".turn-order-card",
    ".command-preview",
    ".battle-actionbar",
    ".unit-details-sheet",
  ]);
}

test("capture controlled player-facing UI for review", async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  const portrait = Boolean(viewport && viewport.height > viewport.width);

  if (portrait) {
    await page.goto("/");
    await expect(page.getByRole("main", { name: "Landscape orientation required" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rotate your device" })).toBeVisible();
    await captureViewport(page, testInfo, "orientation-gate");
    return;
  }

  await page.goto("/?dev=auth");
  await expect(page.getByRole("main", { name: "Fantasia account access" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Fantasia", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /forgot password/i })).toHaveCount(0);
  await captureViewport(page, testInfo, "auth");
  await captureAuthGeometry(page, testInfo);

  await page.goto("/");
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();
  await captureViewport(page, testInfo, "home");
  await captureHomeGeometry(page, testInfo);

  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(page.getByRole("main", { name: "Characters" })).toBeVisible();
  await captureViewport(page, testInfo, "characters");
  await captureCharactersGeometry(page, testInfo);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();

  await page.getByRole("button", { name: "Talent", exact: true }).click();
  await expect(page.getByRole("main", { name: "Talents" })).toBeVisible();
  await captureViewport(page, testInfo, "talent");
  await captureTalentGeometry(page, testInfo);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();

  await page.getByRole("button", { name: "Campaign", exact: true }).click();
  await expect(page.getByRole("main").locator(".saga-reference-screen")).toBeVisible();
  await captureViewport(page, testInfo, "saga");
  await captureSagaGeometry(page, testInfo);

  await page.goto("/");
  await page.getByRole("button", { name: "Continue current story", exact: true }).click();
  await expect(page.getByText("Loire approaches", { exact: true })).toBeVisible();
  await expect(page.locator(".campaign-node").first()).toBeVisible();
  await captureViewport(page, testInfo, "chapter");
  await captureChapterGeometry(page, testInfo);

  await page.getByRole("button", { name: "View story", exact: true }).click();
  await expect(page.getByRole("main", { name: "Story playback" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Other Side", exact: true })).toBeVisible();
  await captureViewport(page, testInfo, "story");
  await captureStoryGeometry(page, testInfo);

  await page.goto("/?dev=battle");
  await expect(page.getByRole("main").locator(".battle-stage")).toBeVisible();
  await expect(page.getByTestId("production-battlefield")).toBeVisible();
  await captureViewport(page, testInfo, "battle");
  await captureBattleGeometry(page, testInfo);

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
  await captureViewport(page, testInfo, "settings");
});
