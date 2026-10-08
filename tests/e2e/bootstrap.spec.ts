import { expect, test } from "@playwright/test";

test("Fantasia development tactical UI renders and moves a unit", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development Battlefield" })).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();
  await expect(page.getByRole("button", { name: /MC Infantry/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const destination = page.getByTestId("cell-1-2");
  await destination.hover();
  await expect(page.getByText("2", { exact: true }).last()).toBeVisible();
  await destination.click();

  await expect(page.getByText("MC moved to 1, 2.")).toBeVisible();
  await expect(destination.getByText("MC")).toBeVisible();
});
