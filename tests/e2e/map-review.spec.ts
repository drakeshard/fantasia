import { expect, test } from "@playwright/test";

test("CH01-B01 candidate review defaults to fixed 2.5D and preserves exact blueprint inspection", async ({
  page,
}) => {
  await page.goto("/?dev=map-b01");

  await expect(page.getByRole("main", { name: "CH01-B01 candidate map review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strangers on the Road" })).toBeVisible();
  await expect(page.getByText(/PROVISIONAL LAYOUT CANDIDATE/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Battlefield" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("b01-map-2p5d-host")).toBeVisible();
  await expect(page.getByTestId("b01-map-2p5d-canvas")).toBeVisible();
  await expect(page.getByTestId("b01-map-grid")).toHaveCount(0);

  await page.getByRole("button", { name: "Blueprint" }).click();
  await expect(page.getByRole("button", { name: "Blueprint" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("b01-map-grid").locator("button")).toHaveCount(216);

  await page.getByTestId("map-cell-10-2").click();
  await expect(page.getByTestId("selected-coordinate")).toHaveText("(10, 2)");
  await expect(page.getByTestId("selected-label")).toHaveText("Unknown Warrior");
  await expect(page.getByText("Elevation +1", { exact: true })).toBeVisible();
  await expect(page.getByText(/hangaku-intervention/)).toBeVisible();

  await page.getByTestId("map-cell-4-6").click();
  await expect(page.getByTestId("selected-coordinate")).toHaveText("(4, 6)");
  await expect(page.getByText("Cart route anchor", { exact: true })).toBeVisible();
  await expect(page.getByText("Inside tested 2×1 cart clearance", { exact: true })).toBeVisible();

  await page.getByTestId("map-cell-16-5").click();
  await expect(page.getByText("East exit zone", { exact: true })).toBeVisible();
});
