import type {
  Editor2Document,
  Editor2ParagraphNode,
  Editor2Position,
  Editor2State,
  Editor2TextRun,
  Editor2TextStyle,
} from "./model.js";
import { getParagraphLength, paragraphOffsetToPosition } from "./model.js";
import { createCollapsedSelection } from "./selection.js";

let nextDocumentId = 1;
let nextParagraphId = 1;
let nextRunId = 1;

export function resetEditor2Ids(): void {
  nextDocumentId = 1;
  nextParagraphId = 1;
  nextRunId = 1;
}

export function createEditor2Run(text = ""): Editor2TextRun {
  const run: Editor2TextRun = {
    id: `run:${nextRunId}`,
    text,
  };
  nextRunId += 1;
  return run;
}

export function createEditor2StyledRun(text = "", styles?: Editor2TextStyle): Editor2TextRun {
  const run = createEditor2Run(text);
  if (styles) {
    run.styles = { ...styles };
  }
  return run;
}

export function createEditor2Paragraph(text = ""): Editor2ParagraphNode {
  const paragraph: Editor2ParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: [createEditor2Run(text)],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditor2ParagraphFromRuns(
  runs: Array<{ text: string; styles?: Editor2TextStyle }>,
): Editor2ParagraphNode {
  const paragraph: Editor2ParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: runs.length > 0 ? runs.map((run) => createEditor2StyledRun(run.text, run.styles)) : [createEditor2Run("")],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditor2Document(paragraphs: Editor2ParagraphNode[]): Editor2Document {
  const document: Editor2Document = {
    id: `document:${nextDocumentId}`,
    blocks: paragraphs,
  };
  nextDocumentId += 1;
  return document;
}

export function createEditor2StateFromDocument(
  document: Editor2Document,
  selection?: { paragraphIndex?: number; offset?: number },
): Editor2State {
  const paragraphs =
    document.blocks.length > 0 ? document.blocks : [createEditor2Paragraph("")];
  const paragraphIndex = Math.max(
    0,
    Math.min(selection?.paragraphIndex ?? 0, paragraphs.length - 1),
  );
  const paragraph = paragraphs[paragraphIndex]!;
  const position: Editor2Position = paragraphOffsetToPosition(
    paragraph,
    Math.max(0, Math.min(selection?.offset ?? 0, getParagraphLength(paragraph))),
  );

  return {
    document: {
      ...document,
      blocks: paragraphs,
    },
    selection: createCollapsedSelection(position),
  };
}

export function createInitialEditor2State(): Editor2State {
  const paragraph = createEditor2Paragraph("");
  const run = paragraph.runs[0];
  return {
    document: createEditor2Document([paragraph]),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
  };
}

export function createEditor2StateFromTexts(
  texts: string[],
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): Editor2State {
  const paragraphs =
    texts.length > 0 ? texts.map((text) => createEditor2Paragraph(text)) : [createEditor2Paragraph("")];
  const defaultIndex = selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = Math.max(
    0,
    Math.min(selection?.anchor?.blockIndex ?? defaultIndex, paragraphs.length - 1),
  );
  const focusIndex = Math.max(
    0,
    Math.min(selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex, paragraphs.length - 1),
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorRun = anchorParagraph.runs[0];
  const focusRun = focusParagraph.runs[0];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset = selection?.focus?.offset ?? selection?.offset ?? anchorOffset;

  return {
    document: createEditor2Document(paragraphs),
    selection: {
      anchor: {
        paragraphId: anchorParagraph.id,
        runId: anchorRun.id,
        offset: Math.max(0, Math.min(anchorOffset, anchorRun.text.length)),
      },
      focus: {
        paragraphId: focusParagraph.id,
        runId: focusRun.id,
        offset: Math.max(0, Math.min(focusOffset, focusRun.text.length)),
      },
    },
  };
}

export function createEditor2StateFromParagraphRuns(
  paragraphsSpec: Array<Array<{ text: string; styles?: Editor2TextStyle }>>,
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): Editor2State {
  const paragraphs =
    paragraphsSpec.length > 0
      ? paragraphsSpec.map((runs) => createEditor2ParagraphFromRuns(runs))
      : [createEditor2Paragraph("")];

  const defaultIndex = selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = Math.max(
    0,
    Math.min(selection?.anchor?.blockIndex ?? defaultIndex, paragraphs.length - 1),
  );
  const focusIndex = Math.max(
    0,
    Math.min(selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex, paragraphs.length - 1),
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset = selection?.focus?.offset ?? selection?.offset ?? anchorOffset;
  const anchorPosition = paragraphOffsetToPosition(
    anchorParagraph,
    Math.max(0, Math.min(anchorOffset, anchorParagraph.runs.reduce((sum, run) => sum + run.text.length, 0))),
  );
  const focusPosition = paragraphOffsetToPosition(
    focusParagraph,
    Math.max(0, Math.min(focusOffset, focusParagraph.runs.reduce((sum, run) => sum + run.text.length, 0))),
  );

  return {
    document: createEditor2Document(paragraphs),
    selection: {
      anchor: anchorPosition,
      focus: focusPosition,
    },
  };
}
