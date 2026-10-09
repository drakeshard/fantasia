import { expect, type Page, test } from "@playwright/test";

interface FrameSample {
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
}

function projectedCellPoint(width: number, height: number, x: number, y: number) {
  const tileWidth = 84;
  const tileHeight = 42;
  const padding = 44;
  const minX = -252;
  const minY = -57;
  const contentWidth = 676;
  const contentHeight = 418;
  const scale = Math.min(
    1.35,
    Math.max(0.52, Math.min(width / contentWidth, height / contentHeight)),
  );
  const worldX = (width - contentWidth * scale) / 2 + (padding - minX) * scale;
  const worldY = (height - contentHeight * scale) / 2 + (padding - minY) * scale;
  return {
    x: worldX + (x - y) * (tileWidth / 2) * scale,
    y: worldY + (x + y) * (tileHeight / 2) * scale,
  };
}

async function activateCanvasPoint(page: Page, x: number, y: number, touch: boolean) {
  const canvas = page.getByTestId("production-battlefield-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const point = projectedCellPoint(box.width, box.height, x, y);
  const targetX = box.x + point.x;
  const targetY = box.y + point.y;
  if (touch) {
    await page.touchscreen.tap(targetX, targetY);
  } else {
    await page.mouse.click(targetX, targetY);
  }
}

async function openBattleSandbox(page: Page) {
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Development battle sandbox", exact: true }).click();
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toBeVisible();
}

test("campaign shell exposes chapter and stage navigation without faking canonical entry", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(page.getByText("A Stranger in France", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("LOIRE APPROACHES", { exact: true })).toBeVisible();
  await expect(page.locator(".campaign-node")).toHaveCount(6);
  await expect(page.locator(".stage-list-entry")).toHaveCount(6);

  await page
    .locator(".stage-list-entry")
    .filter({ hasText: "Strangers on the Road" })
    .click();
  const inspector = page.locator(".campaign-inspector");
  await expect(inspector.getByText("Strangers on the Road", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Escort civilians and the supply cart to safety.")).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Enter battle", exact: true })).toBeVisible();

  await inspector.getByRole("button", { name: "Enter battle", exact: true }).click();
  await expect(
    page.getByText(
      "Canonical story and battle execution is not implemented in the current production slice.",
      { exact: true },
    ).last(),
  ).toBeVisible();
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByText("Choose a chapter", { exact: true })).toBeVisible();
  await expect(page.getByText("The Siege of Orléans", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /The Siege of Orléans/ }).click();
  await expect(page.getByText("No stage selected", { exact: true })).toBeVisible();
  await expect(page.locator(".campaign-node")).toHaveCount(0);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

  const primaryControls = [
    page.getByRole("button", { name: "Back", exact: true }),
    page.getByRole("button", { name: "Fit", exact: true }),
  ];
  for (const control of primaryControls) {
    if (await control.isVisible()) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  }

  if (testInfo.project.name === "chromium-short-touch") {
    expect(page.viewportSize()).toEqual({ width: 844, height: 390 });
  }
});

test("standardized Fantasia Battle HUD remains reachable through the non-canonical sandbox", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await openBattleSandbox(page);

  if (testInfo.project.name === "chromium-desktop") {
    await expect(page.getByText("Fantasia", { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Round 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Scout's turn", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "End turn", exact: true })).toBeVisible();

  const host = page.getByTestId("production-battlefield");
  await expect(host).toBeVisible();
  const canvas = host.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-testid", "production-battlefield-canvas");

  const touch = testInfo.project.name !== "chromium-desktop";
  const preview = page.locator(".command-preview");

  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(preview.getByText("Choose a destination", { exact: true })).toBeVisible();
  await activateCanvasPoint(page, 1, 5, touch);
  await expect(preview.getByText("Move to selected square", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Square 1, 5 · Cost 1 · Movement after 4/)).toBeVisible();
  await expect(page.getByText("5 remaining", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await expect(
    preview.getByText("Moved to 1, 5. 4 movement remains.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 remaining", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await expect(preview.getByText("Choose a target", { exact: true })).toBeVisible();
  await activateCanvasPoint(page, 2, 5, touch);
  await expect(preview.getByText("Attack Lancer", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Target Lancer · Lancer · HP 110\/110/)).toBeVisible();

  await page.getByRole("button", { name: "Confirm attack", exact: true }).click();
  await expect(preview.getByText("Attack dealt 9 damage.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.getByText("MC's turn", { exact: true })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

  for (const name of ["Inspect", "Move", "Attack", "End turn"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  if (testInfo.project.name === "chromium-short-touch") {
    expect(page.viewportSize()).toEqual({ width: 844, height: 390 });
    await expect(page.getByText("Unit details", { exact: true })).toBeVisible();
  }

  const sample = await page.evaluate<FrameSample>(
    () =>
      new Promise((resolve) => {
        const stamps: number[] = [];
        const collect = (time: number) => {
          stamps.push(time);
          if (stamps.length < 31) {
            requestAnimationFrame(collect);
            return;
          }
          const intervals = stamps.slice(1).map((stamp, index) => stamp - (stamps[index] ?? stamp));
          const sorted = [...intervals].sort((left, right) => left - right);
          const medianMs = sorted[Math.floor(sorted.length / 2)] ?? 0;
          const p95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
          const maxMs = Math.max(...intervals);
          resolve({ medianMs, p95Ms, maxMs });
        };
        requestAnimationFrame(collect);
      }),
  );
  console.log(
    `[GAME-UI04 ${testInfo.project.name}] rAF observation median=${sample.medianMs.toFixed(2)}ms p95=${sample.p95Ms.toFixed(2)}ms max=${sample.maxMs.toFixed(2)}ms`,
  );
  expect(sample.maxMs).toBeLessThan(500);
});

test("campaign and battle primary actions remain reachable at 200 percent interface text", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Desktop text-scale proof only");
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });

  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit", exact: true })).toBeVisible();
  let viewportWidth = page.viewportSize()?.width ?? 0;
  let bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

  await openBattleSandbox(page);
  for (const name of ["Inspect", "Move", "Attack", "End turn"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  viewportWidth = page.viewportSize()?.width ?? 0;
  bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
