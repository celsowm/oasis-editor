import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("native UI guardrail", () => {
  it("passes the repo native-element check", () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    expect(() =>
      execFileSync("node", ["./scripts/check-native-ui-elements.mjs"], {
        cwd: repoRoot,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});
