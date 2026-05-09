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

async function expectNoWordLayoutMismatches(
  name: string,
  verify: () => Promise<{ mismatches: string[] }>,
): Promise<void> {
  const result = await verify();
  expect(result.mismatches, `${name} mismatches:\n${result.mismatches.join("\n")}`).toEqual([]);
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
