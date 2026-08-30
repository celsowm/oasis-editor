import { describe, it, expect } from "vitest";
import { parseFieldInstruction, evaluateFieldInstruction } from "../../ooxml/fieldEvaluationEngine.js";

describe("FieldEvaluationEngine", () => {
  it("parses complex field instruction strings into AST", () => {
    const ast = parseFieldInstruction('REF "HeaderBookmark" \\h \\z');
    expect(ast.name).toBe("REF");
    expect(ast.args).toEqual(["HeaderBookmark"]);
    expect(ast.switches).toEqual({ h: true, z: true });
  });

  it("evaluates PAGE, NUMPAGES, REF, and PAGEREF fields", () => {
    const context = {
      pageNumber: 3,
      totalPages: 10,
      bookmarks: {
        Chapter1: { pageNumber: 5, text: "Introduction" },
      },
    };

    expect(evaluateFieldInstruction("PAGE", context)).toBe("3");
    expect(evaluateFieldInstruction("NUMPAGES", context)).toBe("10");
    expect(evaluateFieldInstruction("REF Chapter1", context)).toBe("Introduction");
    expect(evaluateFieldInstruction("PAGEREF Chapter1", context)).toBe("5");
  });

  it("evaluates IF fields with string comparison operators", () => {
    expect(evaluateFieldInstruction('IF "Alpha" = "Alpha" "Yes" "No"')).toBe("Yes");
    expect(evaluateFieldInstruction('IF "Alpha" = "Beta" "Yes" "No"')).toBe("No");
  });
});
