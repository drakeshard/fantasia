import { expect, test } from "@playwright/test";

test("Talent menu exposes controlled account-wide progression without inventing economy", async ({
  page,
}) => {
  await page.goto("/");

  const dock = page.locator(".home-game-dock");
  await expect(dock.getByText("Home", { exact: true })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Campaign", exact: true })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Characters", exact: true })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Talent", exact: true })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Summon", exact: true })).toBeDisabled();

  await dock.getByRole("button", { name: "Talent", exact: true }).click();
  await expect(page.getByRole("main", { name: "Talents", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Talents", exact: true })).toBeVisible();

  await expect(page.getByRole("tab", { name: /Class Talent/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: /Faction Rule Talent/ })).toContainText(
    "Not authored",
  );
  await expect(page.getByRole("tab", { name: /Faction Playstyle Talent/ })).toContainText(
    "Not authored",
  );

  await expect(page.getByRole("heading", { name: "Lancer", exact: true })).toBeVisible();
  for (const doctrine of ["Counter-Charge", "Iron Wall", "Anchor", "General Mastery"]) {
    await expect(page.getByRole("heading", { name: doctrine, exact: true })).toBeVisible();
  }

  await expect(page.getByText("Spear Drill I", { exact: true })).toBeVisible();
  await expect(page.getByText("Set Against the Charge", { exact: true })).toBeVisible();
  await expect(page.getByText("Reinforced Plate I", { exact: true })).toBeVisible();
  await expect(page.getByText("Firm Footing I", { exact: true })).toBeVisible();
  await expect(page.getByText("Tempered Mind I", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved principle", { exact: true })).toBeVisible();
  await expect(page.getByText("Value pending", { exact: true })).toBeVisible();

  const speedBoundary = page.getByText(/Base Speed is never increased by permanent Talent/);
  const purchaseBoundary = page.getByText(/Purchasing is not available yet/);
  if ((page.viewportSize()?.height ?? 0) >= 500) {
    await expect(speedBoundary).toBeVisible();
    await expect(purchaseBoundary).toBeVisible();
  } else {
    await expect(speedBoundary).toHaveCount(1);
    await expect(purchaseBoundary).toHaveCount(1);
  }

  await expect(page.getByRole("button", { name: /purchase/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /upgrade/i })).toHaveCount(0);
  await expect(page.getByText(/talent points/i)).toHaveCount(0);

  await page.getByRole("tab", { name: /Faction Rule Talent/ }).click();
  await expect(
    page.getByRole("heading", { name: "No production tree is authored yet." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Faction Playstyle Talent/ }).click();
  await expect(
    page.getByRole("heading", { name: "No production tree is authored yet." }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settingsDialog = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settingsDialog).toBeVisible();
  await expect(settingsDialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(settingsDialog).toHaveCount(0);

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
