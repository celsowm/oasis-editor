import { createEditor2Document, createEditor2ParagraphFromRuns } from "../../core/editorState.js";
import type { Editor2Document } from "../../core/model.js";

export interface DocxRoundTripFixture {
  name: string;
  document: Editor2Document;
}

function buildMixedFormattingFixture(): Editor2Document {
  const first = createEditor2ParagraphFromRuns([
    { text: "Alpha", styles: { bold: true, color: "#112233" } },
    { text: " beta", styles: { italic: true, underline: true, fontFamily: "Georgia", fontSize: 18 } },
    { text: "\nline", styles: { strike: true } },
  ]);
  first.style = {
    align: "justify",
    spacingBefore: 10,
    spacingAfter: 5,
    lineHeight: 1.4,
    indentLeft: 18,
    indentRight: 6,
    indentFirstLine: 12,
    pageBreakBefore: true,
    keepWithNext: true,
  };

  const second = createEditor2ParagraphFromRuns([
    { text: "Tab\tinside", styles: { subscript: true, highlight: "yellow" } },
  ]);

  return createEditor2Document([first, second]);
}

function buildListsFixture(): Editor2Document {
  const first = createEditor2ParagraphFromRuns([{ text: "One" }]);
  first.list = { kind: "bullet", level: 0 };

  const second = createEditor2ParagraphFromRuns([
    { text: "Two", styles: { superscript: true, highlight: "yellow" } },
  ]);
  second.list = { kind: "ordered", level: 1 };

  const third = createEditor2ParagraphFromRuns([{ text: "Three" }]);
  third.list = { kind: "ordered", level: 2 };

  return createEditor2Document([first, second, third]);
}

function buildWhitespaceFixture(): Editor2Document {
  const paragraph = createEditor2ParagraphFromRuns([
    { text: "  lead" },
    { text: "  middle  ", styles: { color: "#ff0000" } },
    { text: "tail\t\nnext", styles: { highlight: "yellow" } },
  ]);

  return createEditor2Document([paragraph]);
}

export function createDocxRoundTripFixtures(): DocxRoundTripFixture[] {
  return [
    { name: "mixed formatting and paragraph properties", document: buildMixedFormattingFixture() },
    { name: "list variants and levels", document: buildListsFixture() },
    { name: "whitespace, tabs and line breaks", document: buildWhitespaceFixture() },
  ];
}
