import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    include: ["tests/vitest/__tests__/word-parity/**/*.word-parity.ts"],
    exclude: ["node_modules", "dist", "dist-app", "e2e/**"],
    environment: "node",
  },
});
