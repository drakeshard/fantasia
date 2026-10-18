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
  if (touch) await page.touchscreen.tap(targetX, targetY);
  else await page.mouse.click(targetX, targetY);
}

async function openBattleSandbox(page: Page) {
  await page.goto("/?dev=battle");
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toBeVisible();
}

test("home, saga, chapter and approved story navigation preserve truthful execution", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue current story", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Campaign", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Summon", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Campaign", exact: true }).click();
  await expect(page.getByText("The Maid of France", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /A Stranger in France/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /The Siege of Orléans/ })).toBeDisabled();

  await page.getByRole("button", { name: /A Stranger in France/ }).click();
  await expect(page.getByText("Loire approaches", { exact: true })).toBeVisible();
  await expect(page.locator(".campaign-node")).toHaveCount(6);
  await expect(page.locator(".stage-list-entry")).toHaveCount(6);

  const inspector = page.locator(".campaign-inspector");
  await expect(inspector.getByText("The Other Side", { exact: true })).toBeVisible();
  await inspector.getByRole("button", { name: "View story", exact: true }).click();

  await expect(page.getByRole("main", { name: "Story playback" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Other Side", exact: true })).toBeVisible();
  await expect(
    page.getByText("A sharp shimmer folds in on itself behind MC and vanishes.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Player regains movement control", { exact: false })).toHaveCount(0);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByText("Loire approaches", { exact: true })).toBeVisible();
  await expect(inspector.getByText("The Other Side", { exact: true })).toBeVisible();

  await page.locator(".stage-list-entry").filter({ hasText: "Strangers on the Road" }).click();
  await expect(inspector.getByText("Strangers on the Road", { exact: true })).toBeVisible();
  await expect(
    inspector.getByText("Escort civilians and the supply cart to safety."),
  ).toBeVisible();
  await inspector.getByRole("button", { name: "Enter battle", exact: true }).click();
  await expect(
    page
      .getByText(
        "Canonical battle execution is unavailable until the reviewed CH01 encounter geometry and content are implemented.",
        { exact: true },
      )
      .last(),
  ).toBeVisible();
  await expect(page.getByText("Defeat the opposing units", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: /The Siege of Orléans/ })).toBeDisabled();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  if (testInfo.project.name === "chromium-short-touch") {
    expect(page.viewportSize()).toEqual({ width: 844, height: 390 });
  }
});

test("standardized Fantasia Battle HUD remains reachable through development query", async ({
  page,
}, testInfo) => {
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
  await expect(host.locator("canvas")).toHaveAttribute(
    "data-testid",
    "production-battlefield-canvas",
  );

  const touch = testInfo.project.name !== "chromium-desktop";
  const preview = page.locator(".command-preview");
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await activateCanvasPoint(page, 1, 5, touch);
  await expect(preview.getByText("Move to selected square", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await activateCanvasPoint(page, 2, 5, touch);
  await page.getByRole("button", { name: "Confirm attack", exact: true }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.getByText("MC's turn", { exact: true })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

  const sample = await page.evaluate<FrameSample>(
    () =>
      new Promise((resolve) => {
        const stamps: number[] = [];
        const collect = (time: number) => {
          stamps.push(time);
          if (stamps.length < 31) return requestAnimationFrame(collect);
          const intervals = stamps.slice(1).map((stamp, index) => stamp - (stamps[index] ?? stamp));
          const sorted = [...intervals].sort((left, right) => left - right);
          resolve({
            medianMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
            p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
            maxMs: Math.max(...intervals),
          });
        };
        requestAnimationFrame(collect);
      }),
  );
  expect(sample.maxMs).toBeLessThan(500);
});

test("home, campaign, story and battle primary actions remain reachable at 200 percent interface text", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Desktop text-scale proof only");
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("button", { name: "Campaign", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue current story", exact: true }).click();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View story", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();

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
