import { expect, test } from "@playwright/test";

test("Fantasia Foundation runtime shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();
});
