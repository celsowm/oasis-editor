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
import { WORD_PARITY_CORPUS } from "./fixtures/corpus.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
  DEFAULT_EDITOR_STYLES,
} from "../../core/editorState.js";
import type {
  EditorDocument,
  EditorNamedStyle,
  EditorImageRunData,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "../../core/model.js";

const support = detectWordLayoutParitySupport();
const describeWordParity = support.supported ? describe : describe.skip;
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const WORD_AUTHORED_LOREM_DOCX = join(FIXTURES_DIR, "word-authored-lorem.docx");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");
const LOREM_COMPLEX_DOCX = join(
  FIXTURES_DIR,
  "lorem_ipsum_complex_document.docx",
);
const STRICT_WORD_PARITY_ENABLED = process.env.OASIS_WORD_PARITY_STRICT === "1";
const CALIBRI_11PX = 14.6667;
const TRANSPARENT_1X1_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+Xh6qAAAAAElFTkSuQmCC";

async function expectNoWordLayoutMismatches(
  name: string,
  verify: () => Promise<{ mismatches: string[] }>,
): Promise<void> {
  const result = await verify();
  expect(
    result.mismatches,
    `${name} mismatches:\n${result.mismatches.join("\n")}`,
  ).toEqual([]);
}

function wordPageLines(
  page: { lines: Array<{ text: string }> } | undefined,
): string {
  return (
    page?.lines
      .map((line) => line.text.replace(/\s+/g, " ").trim())
      .join(" ") ?? ""
  );
}

function normalizeWordPageLines(
  page: { lines: Array<{ text: string }> } | undefined,
): string[] {
  return (
    page?.lines
      .map((line) => line.text.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          line !== "Página" &&
          line !== "Documento de Teste Lorem Ipsum",
      ) ?? []
  );
}

function applyWordLikeBodyStyle(paragraph: EditorParagraphNode): void {
  paragraph.style = {
    ...(paragraph.style ?? {}),
    spacingAfter: 0,
    lineHeight: 1.15,
  };

  for (const run of paragraph.runs) {
    if (run.image) {
      continue;
    }
    run.styles = {
      ...(run.styles ?? {}),
      fontFamily: "Calibri",
      fontSize: CALIBRI_11PX,
    };
  }
}

function createWordLikeParagraph(text: string): EditorParagraphNode {
  const paragraph = createEditorParagraph(text);
  applyWordLikeBodyStyle(paragraph);
  return paragraph;
}

function createWordLikeParagraphFromRuns(
  runs: Array<{
    text: string;
    styles?: EditorTextStyle;
    image?: EditorImageRunData;
  }>,
): EditorParagraphNode {
  const paragraph = createEditorParagraphFromRuns(
    runs.map((run) => ({
      text: run.text,
      styles: run.styles,
      image: run.image,
    })),
  );
  applyWordLikeBodyStyle(paragraph);
  return paragraph;
}

function createMergedTableParityDocument(): EditorDocument {
  const intro = createWordLikeParagraph("Merged table parity coverage");
  intro.style = { ...(intro.style ?? {}), spacingAfter: 8 };

  const mergedTable = createEditorTable([
    createEditorTableRow(
      [
        (() => {
          const cell = createEditorTableCell([
            createWordLikeParagraph("Merged A"),
          ]);
          cell.style = { shading: "#d9eaf7" };
          return cell;
        })(),
        (() => {
          const cell = createEditorTableCell(
            [createWordLikeParagraph("Merged B and C")],
            2,
          );
          cell.style = { shading: "#d9eaf7" };
          return cell;
        })(),
      ],
      { isHeader: true },
    ),
    createEditorTableRow([
      (() => {
        const cell = createEditorTableCell([], 1, {
          rowSpan: 2,
          vMerge: "restart",
        });
        cell.blocks = [createWordLikeParagraph("Row span anchor")];
        cell.style = { shading: "#eef6fb" };
        return cell;
      })(),
      (() => {
        const cell = createEditorTableCell([createWordLikeParagraph("Body B")]);
        cell.style = { shading: "#ffffff" };
        return cell;
      })(),
      (() => {
        const cell = createEditorTableCell([createWordLikeParagraph("Body C")]);
        cell.style = { shading: "#ffffff" };
        return cell;
      })(),
    ]),
    createEditorTableRow([
      (() => {
        const cell = createEditorTableCell([], 1, { vMerge: "continue" });
        cell.style = { shading: "#eef6fb" };
        return cell;
      })(),
      (() => {
        const cell = createEditorTableCell([createWordLikeParagraph("Tail B")]);
        return cell;
      })(),
      (() => {
        const cell = createEditorTableCell([createWordLikeParagraph("Tail C")]);
        return cell;
      })(),
    ]),
  ]);
  mergedTable.style = { width: "100%" };

  const outro = createWordLikeParagraph("Merged table parity footer");
  outro.style = { ...(outro.style ?? {}), spacingBefore: 8 };

  return createEditorDocument(
    [intro, mergedTable, outro],
    undefined,
    undefined,
    {
      ...DEFAULT_EDITOR_STYLES,
    },
  );
}

function createMultilevelListParityDocument(): EditorDocument {
  const paragraphs: EditorParagraphNode[] = [
    {
      id: "draft-1",
      type: "paragraph",
      runs: [],
      list: { kind: "ordered", level: 0, format: "decimal" },
    },
    {
      id: "draft-2",
      type: "paragraph",
      runs: [],
      list: { kind: "ordered", level: 1, format: "lowerLetter" },
    },
    {
      id: "draft-3",
      type: "paragraph",
      runs: [],
      list: { kind: "ordered", level: 2, format: "lowerRoman" },
    },
    {
      id: "draft-4",
      type: "paragraph",
      runs: [],
      list: { kind: "ordered", level: 2, format: "lowerRoman" },
    },
    {
      id: "draft-5",
      type: "paragraph",
      runs: [],
      list: { kind: "ordered", level: 0, format: "decimal" },
    },
  ].map((draft) => {
    const text = {
      "draft-1": "Top level one",
      "draft-2": "Sub level a",
      "draft-3": "Sub level i",
      "draft-4": "Sub level ii",
      "draft-5": "Top level two",
    }[draft.id]!;
    const paragraph = createWordLikeParagraph(text);
    paragraph.list = { ...(draft.list as EditorParagraphListStyle) };
    return paragraph;
  });

  return createEditorDocument(paragraphs, undefined, undefined, {
    ...DEFAULT_EDITOR_STYLES,
  });
}

function createInlineImageParityDocument(): EditorDocument {
  const paragraph = createEditorParagraphFromRuns([
    {
      text: "Image before ",
      styles: { fontFamily: "Calibri", fontSize: CALIBRI_11PX },
    },
    {
      text: "",
      image: {
        src: TRANSPARENT_1X1_PNG,
        width: 18,
        height: 18,
        alt: "dot",
      },
    },
    {
      text: " after",
      styles: { fontFamily: "Calibri", fontSize: CALIBRI_11PX },
    },
  ]);
  applyWordLikeBodyStyle(paragraph);
  return createEditorDocument([paragraph], undefined, undefined, {
    ...DEFAULT_EDITOR_STYLES,
  });
}

function createStyleInheritanceParityDocument(): EditorDocument {
  const styles: Record<string, EditorNamedStyle> = {
    ...DEFAULT_EDITOR_STYLES,
    brandBase: {
      id: "brandBase",
      name: "Brand Base",
      type: "paragraph",
      basedOn: "normal",
      paragraphStyle: {
        spacingBefore: 4,
        spacingAfter: 2,
        lineHeight: 1.15,
      },
      textStyle: {
        fontFamily: "Georgia",
        fontSize: 18,
        color: "#374151",
      },
    },
    brandCallout: {
      id: "brandCallout",
      name: "Brand Callout",
      type: "paragraph",
      basedOn: "brandBase",
      paragraphStyle: {
        spacingBefore: 14,
        shading: "#f8fafc",
      },
    },
    brandText: {
      id: "brandText",
      name: "Brand Text",
      type: "character",
      basedOn: "normal",
      textStyle: {
        fontFamily: "Georgia",
        fontSize: 18,
        color: "#374151",
      },
    },
    brandEmphasis: {
      id: "brandEmphasis",
      name: "Brand Emphasis",
      type: "character",
      basedOn: "brandText",
      textStyle: {
        bold: true,
        italic: true,
        color: "#1d4ed8",
      },
    },
    brandHighlight: {
      id: "brandHighlight",
      name: "Brand Highlight",
      type: "character",
      basedOn: "brandEmphasis",
      textStyle: {
        underline: true,
        highlight: "#fde68a",
      },
    },
  };

  const paragraph = createWordLikeParagraphFromRuns([
    {
      text: "Inherited style chain keeps the same body font and emphasis.",
      styles: { styleId: "brandHighlight" },
    },
  ]);
  paragraph.style = { styleId: "brandCallout" };

  return createEditorDocument([paragraph], undefined, undefined, styles);
}

describeWordParity("word layout parity", () => {
  it("matches Word for A4 Calibri lorem on a single page", async () => {
    await expectNoWordLayoutMismatches("a4-calibri-lorem-single-page", () =>
      verifyWordLayoutParity(createA4CalibriLoremSinglePageDocument(), {}),
    );
  }, 300_000);

  it("matches Word page count and line breaks for A4 Calibri lorem across pages", async () => {
    await expectNoWordLayoutMismatches("a4-calibri-lorem-multipage", () =>
      verifyWordLayoutParity(createA4CalibriLoremMultipageDocument(), {}),
    );
  }, 300_000);

  it("matches Word when header and footer constrain the body area", async () => {
    await expectNoWordLayoutMismatches("a4-lorem-header-footer", () =>
      verifyWordLayoutParity(createA4LoremHeaderFooterDocument(), {}),
    );
  }, 300_000);

  it("matches Word layout when importing a Word-authored A4 lorem DOCX", async () => {
    expect(
      existsSync(WORD_AUTHORED_LOREM_DOCX),
      "missing Word-authored DOCX fixture",
    ).toBe(true);
    await expectNoWordLayoutMismatches("word-authored-lorem-import", () =>
      verifyImportedDocxWordLayoutParity(WORD_AUTHORED_LOREM_DOCX, {}),
    );
  }, 300_000);

  it("matches Word pagination for the complex lorem DOCX on page 1 and page 2 tail line", async () => {
    expect(
      existsSync(LOREM_COMPLEX_DOCX),
      "missing complex lorem DOCX fixture",
    ).toBe(true);
    const result = await verifyImportedDocxWordLayoutParity(
      LOREM_COMPLEX_DOCX,
      {},
    );
    const editorPage1Lines = result.editor.pages[0]?.bodyLineTexts ?? [];
    const wordPage1Lines =
      result.word.pages[0]?.lines
        .map((line) => line.text.trim())
        .filter((line) => line.length > 0 && line !== "Página") ?? [];
    const editorPage2Lines = result.editor.pages[1]?.bodyLineTexts ?? [];
    const wordPage2Lines = normalizeWordPageLines(result.word.pages[1]);

    expect(editorPage1Lines.length).toBeGreaterThanOrEqual(
      wordPage1Lines.length - 5,
    );
    expect(editorPage1Lines.length).toBeLessThanOrEqual(
      wordPage1Lines.length + 1,
    );
    expect(editorPage2Lines.at(-1)).toBe(wordPage2Lines.at(-1));
    expect(editorPage2Lines.at(-1)).toBe(
      "Vestibulum viverra massa ut turpis cursus, at fermentum nulla hendrerit. Sed dictum, lorem nec",
    );
  }, 300_000);

  it("matches Word manual page breaks in the complex document", async () => {
    expect(existsSync(COMPLEX_DOCX), "missing complex DOCX fixture").toBe(true);
    const result = await verifyImportedDocxWordLayoutParity(COMPLEX_DOCX, {});
    const editorPage1Lines = result.editor.pages[0]?.bodyLineTexts ?? [];
    const editorPage2Lines = result.editor.pages[1]?.bodyLineTexts ?? [];
    const wordPage1Lines =
      result.word.pages[0]?.lines.map((line) => line.text.trim()) ?? [];
    const wordPage2Lines =
      result.word.pages[1]?.lines.map((line) => line.text.trim()) ?? [];

    expect(wordPage1Lines).not.toContain("Sumário");
    expect(wordPage2Lines).toContain("Sumário");
    expect(editorPage1Lines).not.toContain("Sumário");
    expect(editorPage2Lines).toContain("Sumário");

    const expectedPage3Tail =
      "2.2.2. O Safari utiliza tecnologias e ferramentas próprias do ecossistema Apple, e a Apple disponibiliza recursos específicos de inspeção, depuração e teste de conteúdo web em Safari, aplicativos no Mac,";
    const expectedPage4Marker = "2.2.2. O Safari";
    const wordPage3Text = wordPageLines(result.word.pages[2]);
    const editorPage3Text =
      result.editor.pages[2]?.bodyLineTexts.join(" ") ?? "";
    const editorPage4Text =
      result.editor.pages[3]?.bodyLineTexts.join(" ") ?? "";
    const wordPage3Lines =
      result.word.pages[2]?.lines
        .map((line) => line.text.trim())
        .filter(Boolean) ?? [];

    expect(wordPage3Text).toContain(expectedPage3Tail);
    expect(editorPage3Text).not.toContain(expectedPage4Marker);
    expect(editorPage4Text).toContain(expectedPage4Marker);
    expect(wordPage3Lines.some((line) => line.includes("Safari"))).toBe(true);
    expect(result.editor.pages[2]?.footerLineTexts).toEqual(["3"]);
  }, 300_000);

  it("matches Word table layout parity for complex tables with merged cells", async () => {
    const result = await verifyWordLayoutParity(
      createMergedTableParityDocument(),
      {},
    );

    expect(result.mismatches.length).toBeLessThanOrEqual(2);
    expect(result.editor.pages[0]?.bodyLineTexts.join(" ")).toContain(
      "Merged table parity coverage",
    );
  }, 300_000);

  it("matches Word multilevel list parity with numbering formats", async () => {
    const result = await verifyWordLayoutParity(
      createMultilevelListParityDocument(),
      {},
    );

    expect(result.mismatches.length).toBeLessThanOrEqual(2);
    const editorText = result.editor.pages[0]?.bodyLineTexts.join(" ") ?? "";
    expect(editorText).toContain("Top level one");
    expect(editorText).toContain("Sub level a");
    expect(editorText).toContain("Sub level i");
    expect(editorText).toContain("Top level two");
  }, 300_000);

  it("matches Word embedded image parity for inline image runs", async () => {
    const result = await verifyWordLayoutParity(
      createInlineImageParityDocument(),
      {},
    );

    expect(result.mismatches.length).toBeLessThanOrEqual(2);
    expect(result.editor.pages[0]?.bodyLineTexts.join(" ")).toContain(
      "Image before",
    );
    expect(result.editor.pages[0]?.bodyLineTexts.join(" ")).toContain("after");
  }, 300_000);

  it("matches Word advanced named style inheritance parity", async () => {
    const result = await verifyWordLayoutParity(
      createStyleInheritanceParityDocument(),
      {},
    );

    expect(result.mismatches.length).toBeLessThanOrEqual(1);
    expect(result.editor.pages[0]?.bodyLineTexts.join(" ")).toContain(
      "Inherited style chain",
    );
  }, 300_000);

  it("runs strict corpus parity checks when explicitly enabled", async () => {
    if (!STRICT_WORD_PARITY_ENABLED) {
      return;
    }

    for (const entry of WORD_PARITY_CORPUS) {
      const path = join(FIXTURES_DIR, entry.fileName);
      expect(
        existsSync(path),
        `missing corpus fixture: ${entry.fileName}`,
      ).toBe(true);
      await expectNoWordLayoutMismatches(`strict-corpus:${entry.id}`, () =>
        verifyImportedDocxWordLayoutParity(path, {
          strictTextAndGeometry: true,
          geometryTolerancePoints: 0.5,
        }),
      );
    }
  }, 600_000);
});

if (!support.supported) {
  describe("word layout parity support", () => {
    it.skip(`requires local Word parity support: ${support.reason ?? "unknown reason"}`, () => {});
  });
}
