import { expect, test } from "@playwright/test";

test("account access preview exposes truthful sign-in and account creation states", async ({
  page,
}) => {
  await page.goto("/?dev=auth");

  const auth = page.getByRole("main", { name: "Fantasia account access" });
  await expect(auth).toBeVisible();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Fantasia", exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Resend confirmation email", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Backend configuration is not available in this build. This screen is in preview mode.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText(/social login/i)).toHaveCount(1);
  await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Create account", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create your account", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/Display name/)).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "new-password",
  );

  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
});

test("account access remains usable in portrait before the gameplay landscape gate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?dev=auth");

  await expect(page.getByRole("main", { name: "Fantasia account access" })).toBeVisible();
  await expect(page.getByRole("main", { name: "Landscape orientation required" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(391);
});
