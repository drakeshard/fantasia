import { expect, test } from "@playwright/test";

test("Characters exposes only production-safe protagonist facts and returns Home", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Characters", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(page.getByRole("main", { name: "Characters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Characters", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Traveler", exact: true })).toBeVisible();
  await expect(page.getByText("Primora · Vaelkrath", { exact: true })).toBeVisible();
  await expect(page.getByText("Infantry", { exact: true })).toBeVisible();
  await expect(page.getByText("More entries appear through the story.", { exact: true })).toBeVisible();

  for (const unrevealedName of ["Julie", "Hangaku", "La Hire", "Jeanne"]) {
    await expect(page.getByText(new RegExp(unrevealedName, "i"))).toHaveCount(0);
  }
  for (const unavailableField of ["Level", "Rarity", "Equipment", "Physical Power", "Magical Power"]) {
    await expect(page.getByText(unavailableField, { exact: true })).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toHaveCount(0);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  if (testInfo.project.name === "chromium-short-touch") {
    expect(page.viewportSize()).toEqual({ width: 844, height: 390 });
  }

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("main", { name: "Fantasia home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Summon", exact: true })).toBeDisabled();
});
