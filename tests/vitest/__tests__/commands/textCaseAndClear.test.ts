import { describe, it, expect } from "vitest";
import {
  createEditorStateFromParagraphRuns,
} from "@/core/editorState.js";
import {
  changeSelectedTextCase,
  clearSelectedTextFormatting,
} from "@/core/commands/text.js";
import { getParagraphs } from "@/core/model.js";

const fullSelection = (text: string) => ({
  anchor: { blockIndex: 0, offset: 0 },
  focus: { blockIndex: 0, offset: text.length },
});

describe("changeSelectedTextCase", () => {
  it("uppercases the selection", () => {
    const text = "hello world";
    const state = createEditorStateFromParagraphRuns(
      [[{ text }]],
      fullSelection(text),
    );
    const next = changeSelectedTextCase(state, "upper");
    expect(
      getParagraphs(next)[0]
        .runs.map((r) => r.text)
        .join(""),
    ).toBe("HELLO WORLD");
  });

  it("lowercases the selection", () => {
    const text = "HELLO World";
    const state = createEditorStateFromParagraphRuns(
      [[{ text }]],
      fullSelection(text),
    );
    const next = changeSelectedTextCase(state, "lower");
    expect(
      getParagraphs(next)[0]
        .runs.map((r) => r.text)
        .join(""),
    ).toBe("hello world");
  });

  it("capitalizes each word", () => {
    const text = "the quick brown FOX";
    const state = createEditorStateFromParagraphRuns(
      [[{ text }]],
      fullSelection(text),
    );
    const next = changeSelectedTextCase(state, "capitalize");
    expect(
      getParagraphs(next)[0]
        .runs.map((r) => r.text)
        .join(""),
    ).toBe("The Quick Brown FOX");
  });

  it("toggles case", () => {
    const text = "Hello World";
    const state = createEditorStateFromParagraphRuns(
      [[{ text }]],
      fullSelection(text),
    );
    const next = changeSelectedTextCase(state, "toggle");
    expect(
      getParagraphs(next)[0]
        .runs.map((r) => r.text)
        .join(""),
    ).toBe("hELLO wORLD");
  });

  it("applies sentence case across terminators", () => {
    const text = "hello world. how are you? fine! ok";
    const state = createEditorStateFromParagraphRuns(
      [[{ text }]],
      fullSelection(text),
    );
    const next = changeSelectedTextCase(state, "sentence");
    expect(
      getParagraphs(next)[0]
        .runs.map((r) => r.text)
        .join(""),
    ).toBe("Hello world. How are you? Fine! Ok");
  });

  it("preserves run boundaries and styles across runs", () => {
    const state = createEditorStateFromParagraphRuns(
      [
        [
          { text: "hello ", styles: { bold: true } },
          { text: "world", styles: { italic: true } },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 11 },
      },
    );
    const next = changeSelectedTextCase(state, "upper");
    const runs = getParagraphs(next)[0].runs;
    expect(runs.map((r) => r.text)).toEqual(["HELLO ", "WORLD"]);
    expect(runs[0].styles?.bold).toBe(true);
    expect(runs[1].styles?.italic).toBe(true);
  });

  it("is a no-op on a collapsed selection", () => {
    const state = createEditorStateFromParagraphRuns([[{ text: "hello" }]], {
      offset: 2,
    });
    expect(changeSelectedTextCase(state, "upper")).toBe(state);
  });
});

describe("clearSelectedTextFormatting", () => {
  it("removes inline styles but keeps text and links", () => {
    const state = createEditorStateFromParagraphRuns(
      [
        [
          { text: "bold ", styles: { bold: true, color: "#ff0000" } },
          {
            text: "linked",
            styles: { italic: true, link: "https://example.com" },
          },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 0, offset: 11 },
      },
    );
    const next = clearSelectedTextFormatting(state);
    const runs = getParagraphs(next)[0].runs;
    expect(runs.map((r) => r.text).join("")).toBe("bold linked");
    expect(runs[0].styles?.bold).toBeUndefined();
    expect(runs[0].styles?.color).toBeUndefined();
    const linkRun = runs.find((r) => r.text.includes("linked"));
    expect(linkRun?.styles?.italic).toBeUndefined();
    expect(linkRun?.styles?.link).toBe("https://example.com");
  });

  it("is a no-op on a collapsed selection", () => {
    const state = createEditorStateFromParagraphRuns(
      [[{ text: "hello", styles: { bold: true } }]],
      { offset: 2 },
    );
    expect(clearSelectedTextFormatting(state)).toBe(state);
  });
});
