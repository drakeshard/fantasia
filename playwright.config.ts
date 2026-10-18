import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 851, height: 393 },
      },
    },
    {
      name: "chromium-short-touch",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 844, height: 390 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm --filter @fantasia/web preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
