import { describe, expect, it } from "vitest";
import { createEditorParagraph } from "@/core/editorState.js";
import type {
  EditorLayoutFragment,
  EditorLayoutFragmentChar,
  EditorParagraphNode,
} from "@/core/model.js";
import type { HyphenationLayoutOptions } from "@/core/engine.js";
import { composeMeasuredParagraphLines } from "@/ui/textMeasurement.js";
import {
  findHyphenationPoints,
  resolveHyphenationLanguage,
  shouldHyphenateWord,
} from "@/ui/textMeasurement/hyphenation.js";

function createFragments(
  paragraph: EditorParagraphNode,
): EditorLayoutFragment[] {
  let paragraphOffset = 0;
  return paragraph.runs.map((run) => {
    const chars: EditorLayoutFragmentChar[] = Array.from(run.text).map(
      (char, index) => ({
        char,
        paragraphOffset: paragraphOffset + index,
        runOffset: index,
      }),
    );
    const fragment: EditorLayoutFragment = {
      paragraphId: paragraph.id,
      runId: run.id,
      startOffset: paragraphOffset,
      endOffset: paragraphOffset + run.text.length,
      text: run.text,
      styles: run.styles ? { ...run.styles } : undefined,
      chars,
    };
    paragraphOffset += run.text.length;
    return fragment;
  });
}

function measure(
  paragraph: EditorParagraphNode,
  contentWidth: number,
  hyphenation?: HyphenationLayoutOptions,
) {
  return composeMeasuredParagraphLines({
    paragraph,
    fragments: createFragments(paragraph),
    contentWidth,
    hyphenation,
  });
}

describe("hyphenation engine", () => {
  it("finds Portuguese syllable break points", () => {
    // "parágrafo" -> pa·rá·grafo
    expect(findHyphenationPoints("parágrafo", "pt")).toEqual([2, 4]);
  });

  it("finds English break points", () => {
    expect(findHyphenationPoints("hyphenation", "en-us").length).toBeGreaterThan(
      0,
    );
  });

  it("ignores leading/trailing punctuation when finding points", () => {
    expect(findHyphenationPoints("parágrafo,", "pt")).toEqual([2, 4]);
  });

  it("defaults unknown languages to Portuguese, English to en-us", () => {
    expect(resolveHyphenationLanguage(undefined)).toBe("pt");
    expect(resolveHyphenationLanguage("pt-BR")).toBe("pt");
    expect(resolveHyphenationLanguage("en-US")).toBe("en-us");
    expect(resolveHyphenationLanguage("fr-FR")).toBe("pt");
  });

  it("skips words that should not be auto-hyphenated", () => {
    expect(shouldHyphenateWord("de")).toBe(false); // too short
    expect(shouldHyphenateWord("e-mail")).toBe(false); // already hyphenated
    expect(shouldHyphenateWord("ABNT123")).toBe(false); // alphanumeric
    expect(shouldHyphenateWord("SIGLA", { doNotHyphenateCaps: true })).toBe(
      false,
    );
    expect(shouldHyphenateWord("SIGLA", { doNotHyphenateCaps: false })).toBe(
      true,
    );
    expect(shouldHyphenateWord("parágrafo")).toBe(true);
  });
});

describe("composeMeasuredParagraphLines hyphenation", () => {
  const enabled: HyphenationLayoutOptions = { enabled: true };

  it("breaks a long word with a trailing hyphen when enabled", () => {
    const paragraph = createEditorParagraph(
      "casa extraordinário casa extraordinário casa",
    );
    const lines = measure(paragraph, 110, enabled);
    expect(lines.some((line) => line.trailingHyphen)).toBe(true);
    const hyphenated = lines.find((line) => line.trailingHyphen)!;
    expect(hyphenated.trailingHyphenWidth).toBeGreaterThan(0);
  });

  it("does not hyphenate when disabled", () => {
    const paragraph = createEditorParagraph(
      "casa extraordinário casa extraordinário casa",
    );
    const lines = measure(paragraph, 110);
    expect(lines.some((line) => line.trailingHyphen)).toBe(false);
  });

  it("preserves the full character offset range across hyphenation", () => {
    const paragraph = createEditorParagraph(
      "casa extraordinário casa extraordinário casa",
    );
    const text = paragraph.runs.map((run) => run.text).join("");
    const lines = measure(paragraph, 110, enabled);
    expect(lines[0]!.startOffset).toBe(0);
    expect(lines[lines.length - 1]!.endOffset).toBe(text.length);
  });

  it("respects the hyphenation zone (no hyphen when the trailing gap is small)", () => {
    const paragraph = createEditorParagraph(
      "casa extraordinário casa extraordinário casa",
    );
    // A very large zone means the trailing gap is never 'too big', so the word
    // wraps whole instead of hyphenating.
    const lines = measure(paragraph, 110, { enabled: true, zone: 1000 });
    expect(lines.some((line) => line.trailingHyphen)).toBe(false);
  });
});
