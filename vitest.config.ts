import { defineConfig } from "vitest/config";
import { fantasiaStoryContentPlugin } from "./apps/web/story-content-plugin.js";

export default defineConfig({
  plugins: [fantasiaStoryContentPlugin()],
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
