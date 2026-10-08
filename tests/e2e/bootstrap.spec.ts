import { expect, test } from "@playwright/test";

test("Fantasia development UI resolves an authoritative turn, attack, and move", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development Battlefield" })).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();
  await expect(page.getByText("Turn: Scout", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Scout Archer.*HP 80\/80/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const details = page.getByLabel("Selected unit details");
  await expect(details.getByText(/Archer.*player.*Active/i)).toBeVisible();
  await expect(details.getByText("80/80", { exact: true })).toBeVisible();
  const speed = details.getByText("Speed", { exact: true }).locator("..");
  await expect(speed.getByText("12", { exact: true })).toBeVisible();
  const mainAct = details.getByText("Main Act", { exact: true }).locator("..");
  await expect(mainAct.getByText("Ready", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Attack Lancer" }).click();
  await expect(page.getByText("Scout hit Lancer for 9 damage.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lancer Lancer.*HP 101\/110/i })).toBeVisible();
  await expect(mainAct.getByText("Spent", { exact: true })).toBeVisible();

  const destination = page.getByTestId("cell-1-5");
  await destination.hover();
  await expect(page.getByText("1", { exact: true }).last()).toBeVisible();
  await destination.click();
  await expect(page.getByText("Scout moved to 1, 5. 4 movement remains.", { exact: true })).toBeVisible();
  await expect(destination.getByText("SC")).toBeVisible();
});
