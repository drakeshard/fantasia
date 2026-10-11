import { defineConfig } from "vite";
import { fantasiaStoryContentPlugin } from "./story-content-plugin.js";

export default defineConfig({
  plugins: [fantasiaStoryContentPlugin()],
});
