import { defineConfig } from "vite";
import baseConfig from "./vite.config.js";

export default defineConfig((env) => {
  const resolvedBase =
    typeof baseConfig === "function" ? baseConfig(env) : baseConfig;

  return {
    ...resolvedBase,
    test: {
      ...(resolvedBase.test ?? {}),
      include: ["tests/vitest/__tests__/word-parity/**/*.word-parity.ts"],
      exclude: ["node_modules", "dist", "dist-app", "e2e/**"],
      environment: "node",
    },
  };
});
