import type {
  EditorDocument,
  EditorPageSettings,
} from "../../../core/model.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
} from "../../../core/editorState.js";

export const A4_PAGE_SETTINGS: EditorPageSettings = {
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

export const CALIBRI_11PX = 14.6667;

export const LOREM_PARAGRAPH =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. " +
  "Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. " +
  "Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.";

function applyWordLikeBodyStyle(
  paragraph: ReturnType<typeof createEditorParagraph>,
): void {
  paragraph.style = {
    spacingAfter: 8,
    lineHeight: 1.15,
  };
  paragraph.runs[0]!.styles = {
    fontFamily: "Calibri",
    fontSize: CALIBRI_11PX,
  };
}

export function createA4CalibriLoremSinglePageDocument(): EditorDocument {
  const paragraph = createEditorParagraph(LOREM_PARAGRAPH);
  applyWordLikeBodyStyle(paragraph);
  return createEditorDocument([paragraph], A4_PAGE_SETTINGS);
}

export function createA4CalibriLoremMultipageDocument(): EditorDocument {
  const blocks = Array.from({ length: 44 }, () => {
    const paragraph = createEditorParagraph(LOREM_PARAGRAPH);
    applyWordLikeBodyStyle(paragraph);
    return paragraph;
  });
  return createEditorDocument(blocks, A4_PAGE_SETTINGS);
}

export function createA4LoremHeaderFooterDocument(): EditorDocument {
  const body = Array.from({ length: 36 }, () => {
    const paragraph = createEditorParagraph(LOREM_PARAGRAPH);
    applyWordLikeBodyStyle(paragraph);
    return paragraph;
  });
  const header = createEditorParagraphFromRuns([
    {
      text: "Oasis Word parity header",
      styles: { fontFamily: "Calibri", fontSize: CALIBRI_11PX },
    },
  ]);
  header.style = { styleId: "header", spacingAfter: 0, lineHeight: 1.15 };

  const footer = createEditorParagraphFromRuns([
    {
      text: "Oasis Word parity footer",
      styles: { fontFamily: "Calibri", fontSize: CALIBRI_11PX },
    },
  ]);
  footer.style = { styleId: "footer", spacingAfter: 0, lineHeight: 1.15 };

  return createEditorDocument([], A4_PAGE_SETTINGS, [
    {
      id: "section:word-parity",
      blocks: body,
      pageSettings: A4_PAGE_SETTINGS,
      header: [header],
      footer: [footer],
    },
  ]);
}
