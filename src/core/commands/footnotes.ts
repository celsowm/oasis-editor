import type {
  EditorDocument,
  EditorFootnote,
  EditorFootnotes,
  EditorState,
  EditorTextRun,
} from "../model.js";
import {
  findParagraphLocation,
  getBlockParagraphs,
  paragraphOffsetToPosition,
} from "../model.js";
import {
  createEditorFootnote,
  createFootnoteReferenceRun,
} from "../editorState.js";
import {
  findFootnoteReference,
  getFootnoteDisplayMarker,
  iterateFootnoteReferenceRuns,
  renumberFootnotes,
} from "../footnotes.js";
import {
  createCollapsedSelection,
  isSelectionCollapsed,
} from "../selection.js";
import { setSelection } from "./selection.js";
import { cloneStateWithParagraphs } from "../document/blockReplacement.js";
import { insertRunsAtOffset } from "../document/paragraphRuns.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
} from "../selection/rangeEditing.js";
import { getParagraphs } from "../model.js";

function ensureFootnotes(
  footnotes: EditorFootnotes | undefined,
): EditorFootnotes {
  if (footnotes) return footnotes;
  return { items: {} };
}

function nextAutoMarker(document: EditorDocument): string {
  const footnotes = document.footnotes;
  const format = footnotes?.settings?.numberFormat ?? "decimal";
  const startAt = footnotes?.settings?.startAt ?? 1;
  let autoCount = startAt - 1;
  const seen = new Set<string>();
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = run.footnoteReference;
    if (!ref || ref.customMark) continue;
    if (seen.has(ref.footnoteId)) continue;
    seen.add(ref.footnoteId);
    autoCount += 1;
  }
  return getFootnoteDisplayMarker(autoCount + 1, format);
}

/**
 * Insert a footnote at the current selection. The reference marker is placed
 * inline (in the main flow) and a fresh body is created with a single empty
 * paragraph. After insertion the active zone becomes `"footnote"` so the user
 * can type the note text directly.
 */
export function insertFootnote(state: EditorState): EditorState {
  // Footnotes can only be inserted from the main body for now (MVP).
  const zone = state.activeZone ?? "main";
  if (zone !== "main") {
    return state;
  }

  const baseState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(baseState);

  // Reserve the new footnote id and marker.
  const footnote = createEditorFootnote();
  const marker = nextAutoMarker(baseState.document);
  const referenceRun = createFootnoteReferenceRun(footnote.id, marker);

  // Insert the reference run inline at the caret position.
  const updatedParagraph = insertRunsAtOffset(paragraph, offset, [
    referenceRun,
  ]);
  const paragraphs = getParagraphs(baseState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? updatedParagraph : candidate,
  );

  const caretAfterMarker = paragraphOffsetToPosition(
    updatedParagraph,
    offset + marker.length,
  );

  // Apply the paragraph change first (still in main zone), then attach footnote body.
  const stateAfterInsert = cloneStateWithParagraphs(
    baseState,
    nextParagraphs,
    createCollapsedSelection(caretAfterMarker),
  );

  const footnotes = ensureFootnotes(stateAfterInsert.document.footnotes);
  const documentWithFootnote: EditorDocument = {
    ...stateAfterInsert.document,
    footnotes: {
      ...footnotes,
      items: {
        ...footnotes.items,
        [footnote.id]: footnote,
      },
    },
  };

  // Renumber so markers stay in sync if a later note already exists.
  const documentWithRenumber = renumberFootnotes(documentWithFootnote);

  // Move selection into the footnote body's first paragraph.
  const bodyFirstParagraph = footnote.blocks
    .flatMap(getBlockParagraphs)
    .find(Boolean);

  if (!bodyFirstParagraph) {
    return {
      ...stateAfterInsert,
      document: documentWithRenumber,
    };
  }

  return {
    ...stateAfterInsert,
    document: documentWithRenumber,
    selection: createCollapsedSelection(
      paragraphOffsetToPosition(bodyFirstParagraph, 0),
    ),
    activeZone: "footnote",
    activeFootnoteId: footnote.id,
  };
}

/**
 * Remove a footnote: deletes the inline reference run and the body. Other
 * notes are renumbered.
 */
export function deleteFootnote(
  state: EditorState,
  footnoteId: string,
): EditorState {
  const ref = findFootnoteReference(state.document, footnoteId);
  if (!ref) {
    // No inline reference — just drop the body from the registry.
    return removeFootnoteFromRegistry(state, footnoteId);
  }

  // Remove the reference run by rebuilding the owning paragraph.
  const location = findParagraphLocation(state.document, ref.paragraph.id);
  if (!location || location.zone === "footnote") {
    // Pathological: reference inside another footnote body. Skip the inline
    // removal and just drop the body.
    return removeFootnoteFromRegistry(state, footnoteId);
  }

  const targetParagraphId = ref.paragraph.id;
  const filteredRuns: EditorTextRun[] = ref.paragraph.runs.filter(
    (run) =>
      !(
        run.footnoteReference && run.footnoteReference.footnoteId === footnoteId
      ),
  );
  const fallbackRuns: EditorTextRun[] =
    filteredRuns.length > 0
      ? filteredRuns
      : [{ id: ref.paragraph.runs[0]?.id ?? "run:0", text: "" }];

  const updatedParagraph = { ...ref.paragraph, runs: fallbackRuns };

  // Build a new state with the owning paragraph rebuilt. We use a focused
  // section-level rewrite via cloneStateWithParagraphs on the matching zone.
  const savedZone = state.activeZone ?? "main";
  const savedFootnoteId = state.activeFootnoteId;
  const navState: EditorState = {
    ...state,
    activeZone: location.zone,
    activeSectionIndex: location.sectionIndex,
    activeFootnoteId: undefined,
  };

  const zoneParagraphs = getParagraphs(navState);
  const nextZoneParagraphs = zoneParagraphs.map((p) =>
    p.id === targetParagraphId ? updatedParagraph : p,
  );

  const intermediate = cloneStateWithParagraphs(
    navState,
    nextZoneParagraphs,
    state.selection,
  );

  const removedRegistry = removeFootnoteFromRegistry(intermediate, footnoteId);
  return {
    ...removedRegistry,
    document: renumberFootnotes(removedRegistry.document),
    activeZone:
      savedZone === "footnote" && savedFootnoteId === footnoteId
        ? "main"
        : savedZone,
    activeFootnoteId:
      savedZone === "footnote" && savedFootnoteId === footnoteId
        ? undefined
        : savedFootnoteId,
  };
}

function removeFootnoteFromRegistry(
  state: EditorState,
  footnoteId: string,
): EditorState {
  const footnotes = state.document.footnotes;
  if (!footnotes || !footnotes.items[footnoteId]) {
    return state;
  }
  const { [footnoteId]: _removed, ...rest } = footnotes.items;
  void _removed;
  return {
    ...state,
    document: {
      ...state.document,
      footnotes: { ...footnotes, items: rest },
    },
    activeFootnoteId:
      state.activeFootnoteId === footnoteId
        ? undefined
        : state.activeFootnoteId,
    activeZone:
      state.activeZone === "footnote" && state.activeFootnoteId === footnoteId
        ? "main"
        : state.activeZone,
  };
}

/**
 * Move the selection into the body of the given footnote, switching the
 * active zone. Does nothing if the footnote does not exist or has no body.
 */
export function goToFootnoteBody(
  state: EditorState,
  footnoteId: string,
): EditorState {
  const footnote = state.document.footnotes?.items?.[footnoteId];
  if (!footnote) return state;
  const firstParagraph = footnote.blocks
    .flatMap(getBlockParagraphs)
    .find(Boolean);
  if (!firstParagraph) return state;
  return setSelection(
    {
      ...state,
      activeZone: "footnote",
      activeFootnoteId: footnoteId,
    },
    createCollapsedSelection(paragraphOffsetToPosition(firstParagraph, 0)),
  );
}

/**
 * Move the selection back to the inline reference of the given footnote.
 */
export function goToFootnoteReference(
  state: EditorState,
  footnoteId: string,
): EditorState {
  const ref = findFootnoteReference(state.document, footnoteId);
  if (!ref) return state;
  const location = findParagraphLocation(state.document, ref.paragraph.id);
  if (!location) return state;

  // Position the caret at the start of the reference marker.
  let offset = 0;
  for (const run of ref.paragraph.runs) {
    if (run.id === ref.run.id) break;
    offset += run.text.length;
  }

  return setSelection(
    {
      ...state,
      activeZone: location.zone,
      activeSectionIndex: location.sectionIndex,
      activeFootnoteId: undefined,
    },
    createCollapsedSelection(paragraphOffsetToPosition(ref.paragraph, offset)),
  );
}

/**
 * Re-export helpers expected by callers.
 */
export type { EditorFootnote };
