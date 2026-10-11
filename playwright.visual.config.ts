import { defineConfig } from "@playwright/test";

const visualProjects = [
  { name: "wide-1440x900", viewport: { width: 1440, height: 900 }, hasTouch: false },
  { name: "desktop-1280x720", viewport: { width: 1280, height: 720 }, hasTouch: false },
  { name: "tablet-1024x768", viewport: { width: 1024, height: 768 }, hasTouch: false },
  { name: "portrait-tablet-768x1024", viewport: { width: 768, height: 1024 }, hasTouch: true },
  { name: "mobile-390x844", viewport: { width: 390, height: 844 }, hasTouch: true },
  { name: "mobile-360x800", viewport: { width: 360, height: 800 }, hasTouch: true },
  { name: "short-touch-844x390", viewport: { width: 844, height: 390 }, hasTouch: true },
] as const;

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  outputDir: "test-results-visual",
  reporter: [["list"], ["html", { outputFolder: "playwright-visual-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: visualProjects.map((project) => ({
    name: project.name,
    use: {
      viewport: project.viewport,
      hasTouch: project.hasTouch,
    },
  })),
  webServer: {
    command: "pnpm --filter @fantasia/web preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
