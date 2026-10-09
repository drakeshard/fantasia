import { expect, test } from "@playwright/test";

async function zoomLabel(page: import("@playwright/test").Page) {
  return page.locator(".campaign-map-footer").getByText(/^Zoom /);
}

test("campaign camera keeps stage markers screen-sized and restores context through Back", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator(".stage-list-entry").filter({ hasText: "Strangers on the Road" }).click();
  const inspector = page.locator(".campaign-inspector");
  await expect(inspector.getByText("Strangers on the Road", { exact: true })).toBeVisible();

  const marker = page.locator(".campaign-node").first();
  const baselineBox = await marker.boundingBox();
  expect(baselineBox).not.toBeNull();

  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(await zoomLabel(page)).toHaveText("Zoom 1.50×");

  const zoomedBox = await marker.boundingBox();
  expect(zoomedBox).not.toBeNull();
  expect(zoomedBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(zoomedBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(Math.abs((zoomedBox?.width ?? 0) - (baselineBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((zoomedBox?.height ?? 0) - (baselineBox?.height ?? 0))).toBeLessThanOrEqual(1);

  const viewport = page.getByTestId("campaign-map-viewport");
  await viewport.evaluate((element) => {
    element.scrollLeft = 180;
    element.scrollTop = 90;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const beforeBack = await viewport.evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop,
  }));
  expect(beforeBack.left).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: /A Stranger in France/ }).click();

  await expect(inspector.getByText("Strangers on the Road", { exact: true })).toBeVisible();
  await expect(await zoomLabel(page)).toHaveText("Zoom 1.50×");
  await expect
    .poll(() =>
      viewport.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop })),
    )
    .toEqual(beforeBack);

  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(await zoomLabel(page)).toHaveText("Zoom 1.00×");
  await expect
    .poll(() =>
      viewport.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop })),
    )
    .toEqual({ left: 0, top: 0 });
});

test("dragging the campaign map does not activate a stage while a click still selects", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Mouse drag semantics use desktop input");
  await page.goto("/");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();

  const inspector = page.locator(".campaign-inspector");
  await expect(inspector.getByText("The Other Side", { exact: true })).toBeVisible();

  const draggedTarget = page.getByRole("button", {
    name: "Strangers on the Road, Battle, Available",
    exact: true,
  });
  const box = await draggedTarget.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 16, startY, { steps: 3 });
  await page.mouse.up();

  await expect(inspector.getByText("The Other Side", { exact: true })).toBeVisible();
  await page.waitForTimeout(100);

  await page
    .getByRole("button", {
      name: "Shelter Before Nightfall, Story, Available",
      exact: true,
    })
    .click();
  await expect(inspector.getByText("Shelter Before Nightfall", { exact: true })).toBeVisible();
});

test("wheel and pinch zoom are map-scoped and bounded", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Pointer synthesis is validated on desktop Chromium",
  );
  await page.goto("/");

  const viewport = page.getByTestId("campaign-map-viewport");
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();
  if (!viewportBox) return;

  await page.mouse.move(
    viewportBox.x + viewportBox.width / 2,
    viewportBox.y + viewportBox.height / 2,
  );
  await page.mouse.wheel(0, -240);
  await expect(await zoomLabel(page)).not.toHaveText("Zoom 1.00×");
  const afterWheel = await (await zoomLabel(page)).textContent();

  await page.mouse.move(10, 10);
  await page.mouse.wheel(0, -240);
  await expect(await zoomLabel(page)).toHaveText(afterWheel ?? "");

  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const first = { x: rect.left + 120, y: rect.top + 120 };
    const second = { x: rect.left + 220, y: rect.top + 120 };
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 41,
        pointerType: "touch",
        clientX: first.x,
        clientY: first.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 42,
        pointerType: "touch",
        clientX: second.x,
        clientY: second.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 42,
        pointerType: "touch",
        clientX: second.x + 80,
        clientY: second.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 42,
        pointerType: "touch",
        clientX: second.x + 80,
        clientY: second.y,
      }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 41,
        pointerType: "touch",
        clientX: first.x,
        clientY: first.y,
      }),
    );
  });
  await expect(await zoomLabel(page)).not.toHaveText("Zoom 1.00×");

  for (let index = 0; index < 20; index += 1) {
    await page.getByRole("button", { name: "Zoom in", exact: true }).click({ force: true });
  }
  await expect(await zoomLabel(page)).toHaveText("Zoom 2.50×");
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeDisabled();

  const textScale = await page
    .locator("html")
    .evaluate((element) => getComputedStyle(element).getPropertyValue("--ui-text-scale").trim());
  expect(textScale).toBe("1");
});
