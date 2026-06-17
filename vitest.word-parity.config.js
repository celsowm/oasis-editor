import { defineConfig } from "vite";
import { resolve } from "path";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [solidPlugin()],
  test: {
    include: ["tests/vitest/__tests__/word-parity/**/*.word-parity.ts"],
    exclude: ["node_modules", "dist", "dist-app", "e2e/**"],
    environment: "node",
  },
});
