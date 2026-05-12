import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detectWordLayoutParitySupport,
  verifyImportedDocxWordLayoutParity,
  verifyWordLayoutParity,
} from "../../testing/wordLayoutParity.js";
import {
  createA4CalibriLoremMultipageDocument,
  createA4CalibriLoremSinglePageDocument,
  createA4LoremHeaderFooterDocument,
} from "./fixtures/loremFixtures.js";

const support = detectWordLayoutParitySupport();
const describeWordParity = support.supported ? describe : describe.skip;
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const WORD_AUTHORED_LOREM_DOCX = join(FIXTURES_DIR, "word-authored-lorem.docx");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");
const LOREM_COMPLEX_DOCX = join(FIXTURES_DIR, "lorem_ipsum_complex_document.docx");

async function expectNoWordLayoutMismatches(
  name: string,
  verify: () => Promise<{ mismatches: string[] }>,
): Promise<void> {
  const result = await verify();
  expect(result.mismatches, `${name} mismatches:\n${result.mismatches.join("\n")}`).toEqual([]);
}

function wordPageLines(page: { lines: Array<{ text: string }> } | undefined): string {
  return page?.lines.map((line) => line.text.replace(/\s+/g, " ").trim()).join(" ") ?? "";
}

describeWordParity("Word layout parity", () => {
  it(
    "matches Word for A4 Calibri lorem on a single page",
    async () => {
      await expectNoWordLayoutMismatches("a4-calibri-lorem-single-page", () =>
        verifyWordLayoutParity(createA4CalibriLoremSinglePageDocument()),
      );
    },
    120_000,
  );

  it(
    "matches Word page count and line breaks for A4 Calibri lorem across pages",
    async () => {
      await expectNoWordLayoutMismatches("a4-calibri-lorem-multipage", () =>
        verifyWordLayoutParity(createA4CalibriLoremMultipageDocument()),
      );
    },
    120_000,
  );

  it(
    "matches Word when header and footer constrain the body area",
    async () => {
      await expectNoWordLayoutMismatches("a4-lorem-header-footer", () =>
        verifyWordLayoutParity(createA4LoremHeaderFooterDocument()),
      );
    },
    120_000,
  );

  it(
    "imports a Word-authored A4 lorem DOCX and matches Word layout",
    async () => {
      expect(existsSync(WORD_AUTHORED_LOREM_DOCX), "missing Word-authored DOCX fixture").toBe(true);
      await expectNoWordLayoutMismatches("word-authored-lorem-import", () =>
        verifyImportedDocxWordLayoutParity(WORD_AUTHORED_LOREM_DOCX),
      );
    },
    120_000,
  );

  it(
    "imports the complex lorem DOCX without overfilling the first Word page",
    async () => {
      expect(existsSync(LOREM_COMPLEX_DOCX), "missing complex lorem DOCX fixture").toBe(true);
      const result = await verifyImportedDocxWordLayoutParity(LOREM_COMPLEX_DOCX);
      const editorPage1Lines = result.editor.pages[0]?.bodyLineTexts ?? [];
      const wordPage1Lines =
        result.word.pages[0]?.lines
          .map((line) => line.text.trim())
          .filter((line) => line.length > 0 && line !== "Página") ?? [];

      expect(editorPage1Lines.length).toBeGreaterThanOrEqual(wordPage1Lines.length - 3);
      expect(editorPage1Lines.length).toBeLessThanOrEqual(wordPage1Lines.length + 1);
      expect(editorPage1Lines.at(-1)).toContain("Sed dictum, lorem nec");
    },
    120_000,
  );

  it(
    "preserves Word-authored manual page breaks in the complex document",
    async () => {
      expect(existsSync(COMPLEX_DOCX), "missing complex DOCX fixture").toBe(true);
      const result = await verifyImportedDocxWordLayoutParity(COMPLEX_DOCX);
      const editorPage1Lines = result.editor.pages[0]?.bodyLineTexts ?? [];
      const editorPage2Lines = result.editor.pages[1]?.bodyLineTexts ?? [];
      const wordPage1Lines = result.word.pages[0]?.lines.map((line) => line.text.trim()) ?? [];
      const wordPage2Lines = result.word.pages[1]?.lines.map((line) => line.text.trim()) ?? [];

      expect(wordPage1Lines).not.toContain("Sumário");
      expect(wordPage2Lines).toContain("Sumário");
      expect(editorPage1Lines).not.toContain("Sumário");
      expect(editorPage2Lines).toContain("Sumário");

      const expectedPage3TailLine =
        "recursos específicos de inspeção, depuração e teste de conteúdo web em Safari, aplicativos no Mac,";
      const expectedPage3Tail =
        "2.2.2. O Safari utiliza tecnologias e ferramentas próprias do ecossistema Apple, e a Apple disponibiliza recursos específicos de inspeção, depuração e teste de conteúdo web em Safari, aplicativos no Mac,";
      const expectedPage4Start =
        "dispositivos iOS/iPadOS e simuladores. Assim, a ausência de ambiente macOS nativo reduz a capacidade";
      const wordPage3Text = wordPageLines(result.word.pages[2]);
      const editorPage3Text = result.editor.pages[2]?.bodyLineTexts.join(" ") ?? "";
      const editorPage4Text = result.editor.pages[3]?.bodyLineTexts.join(" ") ?? "";
      const wordPage3Lines = result.word.pages[2]?.lines.map((line) => line.text.trim()).filter(Boolean) ?? [];

      expect(wordPage3Text).toContain(expectedPage3Tail);
      expect(editorPage3Text).toContain(expectedPage3Tail);
      expect(wordPage3Lines.at(-2)).toBe(expectedPage3TailLine);
      expect(result.editor.pages[2]?.bodyLineTexts.at(-1)).toBe(expectedPage3TailLine);
      expect(editorPage3Text).not.toContain(expectedPage4Start);
      expect(editorPage4Text).toContain(expectedPage4Start);
      expect(result.editor.pages[2]?.footerLineTexts).toEqual(["3"]);

      const domStyles = result.editor.domStyles;
      expect(domStyles?.runFontFamilies.some((family) => family.includes("Times New Roman"))).toBe(true);
      expect(domStyles?.runFontFamilies.some((family) => family.includes("Calibri"))).toBe(true);
      expect(domStyles?.runFontSizes).toContain("12px");
      expect(domStyles?.runFontSizes).toContain("10.6667px");
      expect(domStyles?.firstTableFirstRowBackgrounds).toEqual([
        "rgb(217, 234, 247)",
        "rgb(217, 234, 247)",
        "rgb(217, 234, 247)",
        "rgb(217, 234, 247)",
      ]);
    },
    120_000,
  );

  it.todo("tracks table layout parity for complex tables with merged cells");
  it.todo("tracks multilevel list parity with Word numbering formats");
  it.todo("tracks floating image parity once floating anchors are supported");
  it.todo("tracks advanced named style inheritance parity");
});

if (!support.supported) {
  describe("Word layout parity support", () => {
    it.skip(`requires local Word parity support: ${support.reason ?? "unknown reason"}`, () => {});
  });
}
