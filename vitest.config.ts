import { defineConfig } from "vitest/config";
import { fantasiaStoryContentPlugin } from "./apps/web/story-content-plugin.js";

export default defineConfig({
  plugins: [fantasiaStoryContentPlugin()],
  test: {
    include: [
      "packages/**/*.test.ts",
      "tests/game/**/*.test.ts",
      "tests/runtime/**/*.test.ts",
      "tests/web/unit/**/*.test.ts",
      "tests/studio/unit/**/*.test.ts",
      "tests/content/**/*.test.ts",
    ],
    environment: "node",
  },
});
