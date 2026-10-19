import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/studio/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 900 },
    hasTouch: false,
  },
  webServer: {
    command: "pnpm --filter @fantasia/content-studio preview --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
  },
});
