import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("workspace-lab")).toBeVisible();
});

test("shell exposes exactly the frozen top-level modules without fake routing", async ({
  page,
}) => {
  const shell = page.getByTestId("studio-shell");
  const moduleNav = shell.getByRole("navigation", { name: "Studio modules" });
  const expected = [
    "Dashboard",
    "Characters",
    "Equipment",
    "Skills",
    "Story",
    "Maps & Encounters",
    "Enemies",
    "Assets",
    "Releases",
  ];

  for (const label of expected) {
    await expect(moduleNav.getByRole("button", { name: label })).toBeVisible();
  }
  await expect(moduleNav.getByRole("button")).toHaveCount(9);

  await moduleNav.getByRole("button", { name: "Story" }).click();
  await expect(moduleNav.getByRole("button", { name: "Story" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page).toHaveURL(/\/$/);
});

test("sidebar collapse preserves usable navigation and narrow layouts keep mobile navigation", async ({
  page,
}) => {
  const shell = page.getByTestId("studio-shell");
  const collapse = shell.getByRole("button", { name: "Collapse navigation" });
  const viewportWidth = page.viewportSize()?.width ?? 0;

  if (viewportWidth <= 768) {
    await expect(collapse).toBeHidden();
    await expect(shell.getByRole("button", { name: "Characters" })).toBeVisible();
    await expect(shell.getByRole("button", { name: "Releases" })).toBeVisible();
    return;
  }

  await collapse.click();
  await expect(shell).toHaveClass(/studio-shell--collapsed/);
  await expect(shell.getByRole("button", { name: "Characters" })).toBeVisible();
  await expect(shell.getByRole("button", { name: "Expand navigation" })).toBeVisible();
});

test("workspace inspector closes and restores focus to its opener", async ({ page }) => {
  const shell = page.getByTestId("studio-shell");
  const inspector = shell.getByTestId("workspace-inspector");
  await expect(inspector).toBeVisible();

  const close = inspector.getByRole("button", { name: "Close inspector" });
  await close.click();
  const opener = shell.getByRole("button", { name: "Show inspector" });
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(shell.getByTestId("workspace-inspector")).toBeVisible();
  await expect(shell.getByRole("button", { name: "Close inspector" })).toBeFocused();
});

test("entity tabs use the shared keyboard behavior", async ({ page }) => {
  const shell = page.getByTestId("studio-shell");
  const overview = shell.getByRole("tab", { name: "Overview" });
  const gameplay = shell.getByRole("tab", { name: "Gameplay" });

  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(gameplay).toBeFocused();
  await expect(gameplay).toHaveAttribute("aria-selected", "true");
  await expect(shell.getByText("Waiting for the selected read model.")).toBeVisible();
});

test("template lab includes all five template kinds and truthful common states", async ({
  page,
}) => {
  for (const kind of ["collection", "entity", "asset-board", "operational-queue", "dashboard"]) {
    await expect(page.locator(`[data-template="${kind}"]`).last()).toBeVisible();
  }

  await expect(page.getByText("No records yet", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Read failed", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Read-only view", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Access not granted", { exact: true }).last()).toBeVisible();
});

test("workspace lab avoids document overflow at every configured baseline viewport", async ({
  page,
}) => {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    minTargetHeight: Math.min(
      ...Array.from(document.querySelectorAll<HTMLElement>("#workspace-lab button"))
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.getBoundingClientRect().height),
    ),
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.minTargetHeight).toBeGreaterThanOrEqual(44);
});

test("captures focused shell and template visual baselines", async ({ page }, testInfo) => {
  await mkdir("visual-artifacts/content-studio", { recursive: true });

  const targets = [
    ["shell", page.getByTestId("studio-shell")],
    ["collection", page.locator('[data-template="collection"]').last()],
    ["entity", page.locator('[data-template="entity"]').last()],
    ["asset-board", page.locator('[data-template="asset-board"]').last()],
    ["operational-queue", page.locator('[data-template="operational-queue"]').last()],
    ["dashboard", page.locator('[data-template="dashboard"]').last()],
  ] as const;

  for (const [name, locator] of targets) {
    await locator.screenshot({
      path: `visual-artifacts/content-studio/${testInfo.project.name}-${name}.png`,
    });
  }
});