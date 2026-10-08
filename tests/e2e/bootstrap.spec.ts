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

test("Fantasia production renderer drives the authoritative encounter", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fantasia", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fantasia Production Battlefield" }),
  ).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();
  await expect(page.getByText("Round 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Turn: Scout", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pixi \/ WebGL · Runtime tick 0/)).toBeVisible();

  const host = page.getByTestId("production-battlefield");
  await expect(host).toBeVisible();
  const canvas = host.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-testid", "production-battlefield-canvas");
  await canvas.scrollIntoViewIfNeeded();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const destination = projectedCellPoint(box.width, box.height, 1, 5);
  const destinationX = box.x + destination.x;
  const destinationY = box.y + destination.y;
  if (testInfo.project.name === "chromium-mobile") {
    await page.touchscreen.tap(destinationX, destinationY);
  } else {
    await page.mouse.click(destinationX, destinationY);
  }
  await expect(page.getByText("Moved to 1, 5. 4 movement remains.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pixi \/ WebGL · Runtime tick 1/)).toBeVisible();
  await expect(page.getByText("Move 4", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Attack Lancer" }).click();
  await expect(page.getByText("Attack dealt 9 damage.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lancer Lancer.*HP 101\/110/i })).toBeVisible();
  await expect(page.getByText(/Pixi \/ WebGL · Runtime tick 2/)).toBeVisible();

  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText("Turn: MC", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pixi \/ WebGL · Runtime tick 3/)).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

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
    `[GAME-I08 ${testInfo.project.name}] rAF observation median=${sample.medianMs.toFixed(2)}ms p95=${sample.p95Ms.toFixed(2)}ms max=${sample.maxMs.toFixed(2)}ms`,
  );
  expect(sample.maxMs).toBeLessThan(500);
});
