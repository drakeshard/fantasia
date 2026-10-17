import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { fantasiaStoryContentPlugin } from "./story-content-plugin.js";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [fantasiaStoryContentPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(appRoot, "index.html"),
        primitivesReview: resolve(appRoot, "primitives-review.html"),
      },
    },
  },
});
