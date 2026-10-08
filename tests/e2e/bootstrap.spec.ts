import { expect, test } from "@playwright/test";

test("Fantasia development tactical UI renders RPG state and moves a unit", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development Battlefield" })).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();
  await expect(page.getByRole("button", { name: /MC Infantry.*HP 100\/100/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const details = page.getByLabel("Selected unit details");
  await expect(details.getByText("Infantry", { exact: true })).toBeVisible();
  await expect(details.getByText("100/100", { exact: true })).toBeVisible();
  const physicalPower = details.getByText("Physical Power", { exact: true }).locator("..");
  await expect(physicalPower.getByText("12", { exact: true })).toBeVisible();
  const stability = details.getByText("Stability", { exact: true }).locator("..");
  await expect(stability.getByText("10", { exact: true })).toBeVisible();

  const destination = page.getByTestId("cell-1-2");
  await destination.hover();
  await expect(page.getByText("2", { exact: true }).last()).toBeVisible();
  await destination.click();

  await expect(page.getByText("MC moved to 1, 2.")).toBeVisible();
  await expect(destination.getByText("MC")).toBeVisible();
  await expect(details.getByText("100/100", { exact: true })).toBeVisible();
});
