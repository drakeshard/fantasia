import { expect, test } from "@playwright/test";

test("Fantasia bootstrap shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByText(/Runtime shell ready/)).toBeVisible();
});
