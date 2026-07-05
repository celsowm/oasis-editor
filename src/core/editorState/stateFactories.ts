import type {
  EditorDocument,
  EditorEditingZone,
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorTextStyle,
  EditorImageRunData,
} from "../model.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  findParagraphLocation,
  getBlockParagraphs,
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
  getParagraphLength,
  paragraphOffsetToPosition,
} from "../model.js";
import { createCollapsedSelection } from "../selection.js";
import {
  createEditorParagraph,
  createEditorParagraphFromRuns,
} from "./nodeFactories.js";
import { createEditorDocument } from "./documentFactories.js";

export function createEditorStateFromDocument(
  document: EditorDocument,
  selection?: { paragraphIndex?: number; offset?: number },
): EditorState {
  let normalizedDocument: EditorDocument = {
    ...document,
    sections:
      document.sections && document.sections.length > 0
        ? document.sections
        : [
            {
              id: "section:default",
              blocks: [createEditorParagraph("")],
              pageSettings:
                getDocumentSectionsCanonical(document)[0]?.pageSettings ??
                DEFAULT_EDITOR_PAGE_SETTINGS,
            },
          ],
  };

  let allParagraphs = getDocumentParagraphsCanonical(normalizedDocument);
  if (allParagraphs.length === 0) {
    const fallbackParagraph = createEditorParagraph("");
    const sections = getDocumentSectionsCanonical(normalizedDocument);
    const firstSection = sections[0];
    if (firstSection) {
      const nextSections = [...sections];
      nextSections[0] = {
        ...firstSection,
        blocks: [fallbackParagraph, ...firstSection.blocks],
      };
      normalizedDocument = {
        ...normalizedDocument,
        sections: nextSections,
      };
    }
    allParagraphs = getDocumentParagraphsCanonical(normalizedDocument);
  }

  const hasExplicitSelection = selection !== undefined;
  let targetParagraph = allParagraphs[0]!;
  let activeSectionIndex = 0;
  let activeZone: EditorEditingZone = "main";

  if (hasExplicitSelection) {
    const paragraphIndex = Math.max(
      0,
      Math.min(selection?.paragraphIndex ?? 0, allParagraphs.length - 1),
    );
    targetParagraph = allParagraphs[paragraphIndex]!;
    const location = findParagraphLocation(
      normalizedDocument,
      targetParagraph.id,
    );
    if (location) {
      activeSectionIndex = location.sectionIndex;
      activeZone = location.zone;
    }
  } else {
    const sections = getDocumentSectionsCanonical(normalizedDocument);
    const firstSection = sections[0];
    const mainParagraphs =
      firstSection?.blocks.flatMap(getBlockParagraphs) ?? [];
    if (mainParagraphs.length > 0) {
      targetParagraph = mainParagraphs[0]!;
      activeZone = "main";
      activeSectionIndex = 0;
    } else {
      const headerParagraphs =
        firstSection?.header?.flatMap(getBlockParagraphs) ?? [];
      const footerParagraphs =
        firstSection?.footer?.flatMap(getBlockParagraphs) ?? [];
      if (headerParagraphs.length > 0) {
        targetParagraph = headerParagraphs[0]!;
        activeZone = "header";
      } else if (footerParagraphs.length > 0) {
        targetParagraph = footerParagraphs[0]!;
        activeZone = "footer";
      }
      activeSectionIndex = 0;
    }
  }

  const position: EditorPosition = paragraphOffsetToPosition(
    targetParagraph,
    Math.max(
      0,
      Math.min(selection?.offset ?? 0, getParagraphLength(targetParagraph)),
    ),
  );

  const result = {
    document: normalizedDocument,
    selection: createCollapsedSelection(position),
    activeSectionIndex,
    activeZone,
  };

  return result;
}

export function createInitialEditorState(): EditorState {
  const paragraph = createEditorParagraph("");
  const run = paragraph.runs[0]!;
  return {
    document: createEditorDocument([paragraph]),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}

type SelectionSpec = {
  anchor?: { blockIndex: number; offset: number };
  focus?: { blockIndex: number; offset: number };
  blockIndex?: number;
  offset?: number;
};

/** Clamps `value` to the closed interval [0, max]. */
function clampTo(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

function resolveSelectionIndexes(
  selection: SelectionSpec | undefined,
  paragraphCount: number,
): { anchorIndex: number; focusIndex: number } {
  const defaultIndex =
    selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = clampTo(
    selection?.anchor?.blockIndex ?? defaultIndex,
    paragraphCount - 1,
  );
  const focusIndex = clampTo(
    selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex,
    paragraphCount - 1,
  );
  return { anchorIndex, focusIndex };
}

export function createEditorStateFromTexts(
  texts: string[],
  selection?: SelectionSpec,
): EditorState {
  const paragraphs =
    texts.length > 0
      ? texts.map((text): EditorParagraphNode => createEditorParagraph(text))
      : [createEditorParagraph("")];
  const { anchorIndex, focusIndex } = resolveSelectionIndexes(
    selection,
    paragraphs.length,
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorRun = anchorParagraph.runs[0];
  const focusRun = focusParagraph.runs[0];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset =
    selection?.focus?.offset ?? selection?.offset ?? anchorOffset;

  return {
    document: createEditorDocument(paragraphs),
    selection: {
      anchor: {
        paragraphId: anchorParagraph.id,
        runId: anchorRun.id,
        offset: clampTo(anchorOffset, anchorRun.text.length),
      },
      focus: {
        paragraphId: focusParagraph.id,
        runId: focusRun.id,
        offset: clampTo(focusOffset, focusRun.text.length),
      },
    },
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}

export function createEditorStateFromParagraphRuns(
  paragraphsSpec: Array<
    Array<{
      text: string;
      styles?: EditorTextStyle;
      image?: EditorImageRunData;
    }>
  >,
  selection?: SelectionSpec,
): EditorState {
  const paragraphs =
    paragraphsSpec.length > 0
      ? paragraphsSpec.map(
          (runs): EditorParagraphNode => createEditorParagraphFromRuns(runs),
        )
      : [createEditorParagraph("")];

  const { anchorIndex, focusIndex } = resolveSelectionIndexes(
    selection,
    paragraphs.length,
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset =
    selection?.focus?.offset ?? selection?.offset ?? anchorOffset;
  const anchorLength = anchorParagraph.runs.reduce(
    (sum, run): number => sum + run.text.length,
    0,
  );
  const focusLength = focusParagraph.runs.reduce(
    (sum, run): number => sum + run.text.length,
    0,
  );
  const anchorPosition = paragraphOffsetToPosition(
    anchorParagraph,
    clampTo(anchorOffset, anchorLength),
  );
  const focusPosition = paragraphOffsetToPosition(
    focusParagraph,
    clampTo(focusOffset, focusLength),
  );

  return {
    document: createEditorDocument(paragraphs),
    selection: {
      anchor: anchorPosition,
      focus: focusPosition,
    },
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}
