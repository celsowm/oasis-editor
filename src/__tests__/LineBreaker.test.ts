import { describe, it, expect, vi } from "vitest";
import { breakTextIntoLines } from "../core/composition/LineBreaker.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { TextRun } from "../core/document/BlockTypes.js";

describe("LineBreaker", () => {
  const mockMeasurer: TextMeasurer = {
    measureText: vi.fn((input) => {
      // 10px per character for standard size, more if fontSize is larger
      const multiplier = (input.fontSize || 10) / 10;
      return {
        width: input.text.length * 10 * multiplier,
        height: (input.fontSize || 10) * 1.2,
      };
    }),
  };

  const defaultFont = "Arial";
  const defaultSize = 10;

  it("should keep short text on one line", () => {
    const runs: TextRun[] = [{ id: "1", text: "Hello world", marks: {} }];
    const result = breakTextIntoLines(
      runs,
      200,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world");
    expect(result[0].width).toBe(110);
  });

  it("should break long text into multiple lines", () => {
    const runs: TextRun[] = [
      { id: "1", text: "This is a long sentence that should break", marks: {} },
    ];
    // "This is a " = 100px
    // "long " = 50px
    // "sentence " = 90px
    // "that " = 50px
    // "should " = 70px
    // "break" = 50px
    // Max width 100
    const result = breakTextIntoLines(
      runs,
      100,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result[0].text).toBe("This is a ");
    expect(result[1].text).toBe("long ");
    expect(result[2].text).toBe("sentence ");
  });

  it("should handle explicit newlines", () => {
    const runs: TextRun[] = [{ id: "1", text: "Line 1\nLine 2", marks: {} }];
    const result = breakTextIntoLines(
      runs,
      200,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Line 1\n");
    expect(result[1].text).toBe("Line 2");
  });

  it("should combine multiple runs and break correctly", () => {
    const runs: TextRun[] = [
      { id: "1", text: "Part 1 ", marks: { bold: true } },
      { id: "2", text: "Part 2 is longer", marks: {} },
    ];
    // "Part 1 " (7 chars) = 70px
    // "Part 2 " (7 chars) = 70px
    // "is " (3 chars) = 30px
    // "longer" (6 chars) = 60px
    // Max width 100
    // Expected lines:
    // 1. "Part 1 " (70px)
    // 2. "Part 2 is " (100px)
    // 3. "longer" (60px)
    const result = breakTextIntoLines(
      runs,
      100,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result[0].text).toBe("Part 1 ");
    expect(result[1].text).toBe("Part 2 is ");
    expect(result[2].text).toBe("longer");
  });

  it("should respect font size in measurements", () => {
    const runs: TextRun[] = [{ id: "1", text: "Big", marks: { fontSize: 20 } }];
    // "Big" is 3 chars. multiplier = 20/10 = 2. 3 * 10 * 2 = 60px.
    const result = breakTextIntoLines(
      runs,
      100,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result[0].width).toBe(60);
  });

  it("should handle a word longer than maxWidth by putting it on its own line", () => {
    const runs: TextRun[] = [
      { id: "1", text: "A superlongwordthatdoesnotfit", marks: {} },
    ];
    // "A " = 20px
    // "superlongwordthatdoesnotfit" = 270px
    // Max width 100
    const result = breakTextIntoLines(
      runs,
      100,
      mockMeasurer,
      defaultFont,
      defaultSize,
      false,
    );

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("A ");
    expect(result[1].text).toBe("superlongwordthatdoesnotfit");
  });
});
