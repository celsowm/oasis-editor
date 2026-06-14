import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("package surface", () => {
  it("publishes the plugin UI subpath", () => {
    expect(packageJson.exports["./ui"]).toEqual({
      types: "./dist/ui.d.ts",
      import: "./dist/ui.js",
    });
  });
});
