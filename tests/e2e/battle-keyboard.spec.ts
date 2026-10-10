import { expect, type Locator, test } from "@playwright/test";

async function pressFocused(locator: Locator) {
  await locator.focus();
  await locator.press("Enter");
}

test("battle supports logical-cell keyboard navigation without pointer input", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Keyboard spatial-navigation proof is desktop scoped",
  );
  await page.goto("/");

  await pressFocused(page.getByRole("button", { name: "Back", exact: true }));
  await pressFocused(page.getByRole("button", { name: "Development battle sandbox", exact: true }));
  await expect(page.getByText("Scout's turn", { exact: true })).toBeVisible();

  const unitDetails = page.locator("details.unit-details-sheet");
  await pressFocused(unitDetails.locator("summary"));
  await expect(unitDetails).toHaveAttribute("open", "");

  const status = page.getByRole("status");
  await expect(status).toHaveCount(1);
  await expect(page.locator(".command-preview[aria-live]")).toHaveCount(0);

  const enemyCell = page.locator('[data-battle-cell="2:5"]');
  await pressFocused(enemyCell);
  await expect(unitDetails.getByText("Lancer · Opponent", { exact: true })).toBeVisible();

  await pressFocused(page.getByRole("button", { name: /Scout.*Active turn/ }));
  await pressFocused(page.getByRole("button", { name: "Move", exact: true }));

  const scoutCell = page.locator('[data-battle-cell="0:5"]');
  await scoutCell.focus();
  await scoutCell.press("ArrowRight");
  await expect(page.locator('[data-battle-cell="1:5"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".command-preview").getByText("Move to selected square", { exact: true }),
  ).toBeVisible();
  await pressFocused(page.getByRole("button", { name: "Confirm move", exact: true }));
  await expect(status).toContainText("Moved to 1, 5. 4 movement remains.");

  await pressFocused(page.getByRole("button", { name: "Attack", exact: true }));
  const movedScoutCell = page.locator('[data-battle-cell="1:5"]');
  await movedScoutCell.focus();
  await movedScoutCell.press("ArrowRight");
  await expect(page.locator('[data-battle-cell="2:5"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".command-preview").getByText("Attack Lancer", { exact: true }),
  ).toBeVisible();
  await pressFocused(page.getByRole("button", { name: "Confirm attack", exact: true }));
  await expect(status).toContainText("Attack dealt 9 damage.");

  await pressFocused(page.getByRole("button", { name: "End turn", exact: true }));
  await expect(page.getByText("MC's turn", { exact: true })).toBeVisible();

  const cellBox = await page.locator('[data-battle-cell="1:5"]').boundingBox();
  expect(cellBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(cellBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});
