import { describe, expect, it } from "vitest";
import type { EditorNamedStyle, EditorPageSettings } from "../../core/model.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  resetEditorIds,
} from "../../core/editorState.js";
import {
  detectWordLayoutParitySupport,
  verifyWordLayoutParity,
} from "../../testing/wordLayoutParity.js";

const support = detectWordLayoutParitySupport();
const describeWordParity =
  support.supported && process.env.OASIS_ENABLE_WORD_PARITY === "1" ? describe : describe.skip;

const A4_PAGE_SETTINGS: EditorPageSettings = {
  width: 794,
  height: 1123,
  orientation: "portrait",
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

const WORD_BASELINE_STYLES: Record<string, EditorNamedStyle> = {
  normal: {
    id: "normal",
    name: "Normal",
    type: "paragraph",
    paragraphStyle: {
      spacingAfter: 8,
      lineHeight: 1.15,
    },
    textStyle: {
      fontFamily: "Calibri",
      fontSize: 15,
    },
  },
};

function buildCanonicalWordParityDocument() {
  resetEditorIds();

  const paragraphs = [
    createEditorParagraphFromRuns([{ text: "texto muito colado ne?" }]),
    createEditorParagraphFromRuns([{ text: "dei enter" }]),
    createEditorParagraphFromRuns([{ text: "dei enter" }]),
    createEditorParagraphFromRuns([{ text: "dei enter" }]),
  ];

  const repeatedSentence =
    "Este paragrafo longo existe para validar quebra de linha, altura de linha e quebra de pagina entre o editor e o Word desktop. ";

  for (let index = 0; index < 18; index += 1) {
    paragraphs.push(
      createEditorParagraphFromRuns([
        {
          text: `${index + 1}. ${repeatedSentence.repeat(4)}fim ${index + 1}.`,
        },
      ]),
    );
  }

  paragraphs.push(
    createEditorParagraphFromRuns([
      {
        text:
          "Paragrafo final de borda para verificar se a ultima pagina mantem exatamente as mesmas linhas no Word.",
      },
    ]),
  );

  return createEditorDocument(paragraphs, A4_PAGE_SETTINGS, undefined, WORD_BASELINE_STYLES);
}

describeWordParity("Word layout parity", () => {
  it("matches Word page and line breaks for the canonical A4 document", async () => {
    const document = buildCanonicalWordParityDocument();

    const parity = await verifyWordLayoutParity(document);

    expect(parity.mismatches).toEqual([]);
  }, 180000);
});
