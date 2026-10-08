import { expect, test } from "@playwright/test";

test("Fantasia tactical playtest renders and moves a unit", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Fantasia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tactical Playtest" })).toBeVisible();
  await expect(page.getByText(/Foundation 0\.1\.2 runtime integration ready/)).toBeVisible();

  const destination = page.getByRole("button", { name: "Tile 2,3" });
  await expect(destination).toHaveAttribute("data-reachable", "true");
  await destination.hover();
  await expect(page.getByText("Preview path cost: 1")).toBeVisible();

  await destination.click();
  await expect(destination).toContainText("MC");
});
