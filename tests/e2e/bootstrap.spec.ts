import { expect, test } from "@playwright/test";

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

async function activateCanvasPoint(
  page: Parameters<typeof test>[0] extends never ? never : import("@playwright/test").Page,
  x: number,
  y: number,
  touch: boolean,
) {
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

test("standardized Fantasia Battle HUD previews before authoritative commands", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(page.getByText("Fantasia", { exact: true })).toBeVisible();
  await expect(page.getByText("Round 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Scout's turn", { exact: true })).toBeVisible();
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Attack", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "End turn", exact: true })).toBeVisible();

  const host = page.getByTestId("production-battlefield");
  await expect(host).toBeVisible();
  const canvas = host.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-testid", "production-battlefield-canvas");

  const touch = testInfo.project.name !== "chromium-desktop";

  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByText("Choose a destination", { exact: true })).toBeVisible();
  await activateCanvasPoint(page, 1, 5, touch);
  await expect(page.getByText("Move to selected square", { exact: true })).toBeVisible();
  await expect(page.getByText(/Square 1, 5 · Cost 1 · Movement after 4/)).toBeVisible();
  await expect(page.getByText("5 remaining", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await expect(page.getByText("Moved to 1, 5. 4 movement remains.", { exact: true })).toBeVisible();
  await expect(page.getByText("4 remaining", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await expect(page.getByText("Choose a target", { exact: true })).toBeVisible();
  await activateCanvasPoint(page, 2, 5, touch);
  await expect(page.getByText("Attack Lancer", { exact: true })).toBeVisible();
  await expect(page.getByText(/Target Lancer · Lancer · HP 110\/110/)).toBeVisible();

  await page.getByRole("button", { name: "Confirm attack", exact: true }).click();
  await expect(page.getByText("Attack dealt 9 damage.", { exact: true })).toBeVisible();

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
    `[GAME-UI03 ${testInfo.project.name}] rAF observation median=${sample.medianMs.toFixed(2)}ms p95=${sample.p95Ms.toFixed(2)}ms max=${sample.maxMs.toFixed(2)}ms`,
  );
  expect(sample.maxMs).toBeLessThan(500);
});

test("Battle HUD keeps primary actions reachable at 200 percent interface text", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Desktop text-scale proof only");
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });

  for (const name of ["Inspect", "Move", "Attack", "End turn"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
