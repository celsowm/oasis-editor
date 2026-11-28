import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const ALLOWED = join(SRC, "core", "format", "numberFormat.ts");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("single number-formatting service", () => {
  it("has exactly one implementation of the roman/alphabetic primitives", () => {
    const duplicates = sourceFiles(SRC).filter(file => {
      if (file === ALLOWED) return false;
      const source = readFileSync(file, "utf8");
      return /function\s+toRoman\b|function\s+toAlpha\b/.test(source);
    });
    expect(duplicates).toEqual([]);
  });
});
