import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fantasia Content Studio" })).toBeVisible();
});

test("renders the exact lifecycle with textual and non-color cues", async ({ page }) => {
  const lifecycleSet = page.getByTestId("lifecycle-badge-set");
  const badges = lifecycleSet.locator('[data-dimension="lifecycle"]');

  await expect(badges).toHaveCount(8);
  await expect(badges.nth(0)).toContainText("WORKING");
  await expect(badges.nth(1)).toContainText("CANDIDATE");
  await expect(badges.nth(2)).toContainText("IN REVIEW");
  await expect(badges.nth(3)).toContainText("APPROVED");
  await expect(badges.nth(4)).toContainText("FROZEN");
  await expect(badges.nth(5)).toContainText("RUNTIME READY");
  await expect(badges.nth(6)).toContainText("PUBLISHED");
  await expect(badges.nth(7)).toContainText("RETIRED");

  for (let index = 0; index < 8; index += 1) {
    await expect(badges.nth(index).locator(".studio-status-badge__icon")).not.toBeEmpty();
  }
});

test("mixed fixtures keep semantic dimensions simultaneously visible", async ({ page }) => {
  const approvedWarning = page.getByTestId("fixture-approved-warning");
  await expect(approvedWarning).toContainText("APPROVED");
  await expect(approvedWarning).toContainText("Warning");
  await expect(approvedWarning).toContainText("Approved");
  await expect(approvedWarning).toContainText("Runtime not ready");
  await expect(approvedWarning).toContainText("Unpublished");
  await expect(approvedWarning).toContainText("Not verified");

  const frozenRuntime = page.getByTestId("fixture-frozen-runtime-not-ready");
  await expect(frozenRuntime).toContainText("FROZEN");
  await expect(frozenRuntime).toContainText("Runtime not ready");

  const readyUnpublished = page.getByTestId("fixture-runtime-ready-unpublished");
  await expect(readyUnpublished).toContainText("RUNTIME READY");
  await expect(readyUnpublished).toContainText("Runtime ready");
  await expect(readyUnpublished).toContainText("Unpublished");

  const publishedWarning = page.getByTestId("fixture-published-verification-warning");
  await expect(publishedWarning).toContainText("PUBLISHED");
  await expect(publishedWarning).toContainText("Published");
  await expect(publishedWarning).toContainText("Verification warning");
});

test("versions, provider references and derivatives retain provenance", async ({ page }) => {
  const versionBadges = page.locator(".studio-version-badge");
  await expect(versionBadges.filter({ hasText: "v003" }).first()).toContainText("Current version");
  await expect(versionBadges.filter({ hasText: "v002" }).first()).toContainText(
    "Historical version",
  );
  await expect(versionBadges.filter({ hasText: "v001" }).first()).toContainText(
    "Historical version",
  );

  const semanticIdentity = page.getByText("asset.character.jeanne.base", { exact: true });
  await expect(semanticIdentity.first()).toBeVisible();

  await expect(page.getByText("Drive · Source / master", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Git · Canonical definition", { exact: true })).toBeVisible();
  await expect(page.getByText("Registry · Registry metadata", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Runtime delivery · Runtime derivative", { exact: true }),
  ).toBeVisible();

  const runtimeCard = page
    .locator(".studio-runtime-card")
    .filter({ hasText: "asset.character.jeanne.base.runtime-web" })
    .first();
  await expect(runtimeCard).toContainText("Source version");
  await expect(runtimeCard).toContainText("v003");
});

test("review workflow labels do not create alternate lifecycle badges", async ({ page }) => {
  await expect(page.getByText("Review requested", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Changes requested", { exact: true }).last()).toBeVisible();

  const lifecycleStates = await page
    .locator('[data-dimension="lifecycle"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-state")));

  expect(lifecycleStates).not.toContain("requested");
  expect(lifecycleStates).not.toContain("changes-requested");
});

test("semantic matrix avoids document overflow at desktop and compact touch sizes", async ({
  page,
}) => {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    semanticBadgeCount: document.querySelectorAll(".studio-status-badge").length,
  }));

  expect(metrics.semanticBadgeCount).toBeGreaterThan(20);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
});

test("captures the semantic state matrix for visual review", async ({ page }, testInfo) => {
  await mkdir("visual-artifacts/content-studio", { recursive: true });
  await page.screenshot({
    path: `visual-artifacts/content-studio/${testInfo.project.name}-semantics.png`,
    fullPage: true,
  });
});
