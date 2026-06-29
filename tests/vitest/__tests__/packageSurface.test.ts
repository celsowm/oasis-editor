import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import packageJson from "../../../package.json";

describe("package surface", () => {
  it("publishes the plugin UI subpath", () => {
    expect(packageJson.exports["./ui"]).toEqual({
      types: "./dist/ui.d.ts",
      import: "./dist/ui.js",
    });
  });

  it("exports public layout primitives from the plugin UI surface", () => {
    const publicIndex = fs.readFileSync(
      path.join(process.cwd(), "src/ui/public/index.ts"),
      "utf8",
    );
    const rootIndex = fs.readFileSync(
      path.join(process.cwd(), "src/index.ts"),
      "utf8",
    );
    const uiAdapter = fs.readFileSync(
      path.join(process.cwd(), "src/adapters/ui.ts"),
      "utf8",
    );

    expect(publicIndex).toContain('export { Stack } from "./Stack.js";');
    expect(publicIndex).toContain('export { Grid } from "./Grid.js";');
    expect(publicIndex).toContain(
      'export { ColorField } from "./ColorField.js";',
    );
    expect(publicIndex).toContain("ResponsiveValue");
    expect(publicIndex).toContain("GridSize");
    expect(publicIndex).toContain("GridOffset");
    expect(rootIndex).toContain("Stack,");
    expect(rootIndex).toContain("Grid,");
    expect(rootIndex).toContain("ColorField,");
    expect(rootIndex).toContain("StackProps");
    expect(rootIndex).toContain("GridProps");
    expect(uiAdapter).toContain("Stack,");
    expect(uiAdapter).toContain("Grid,");
    expect(uiAdapter).toContain("ColorField,");
    expect(uiAdapter).toContain("StackProps");
    expect(uiAdapter).toContain("GridProps");
  });
});
