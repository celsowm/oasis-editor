import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import {
  paragraphOffsetToPosition,
  type EditorLayoutDocument,
  type EditorState,
} from "@/core/model.js";
import { createEditorNavigation } from "@/app/controllers/useEditorNavigation.js";
import type { CanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";

describe("nested table vertical navigation", () => {
  it("moves to the next row of the innermost table", () => {
    const topLeft = createEditorParagraph("top-left");
    const topRight = createEditorParagraph("top-right");
    const bottomLeft = createEditorParagraph("bottom-left");
    const bottomRight = createEditorParagraph("bottom-right");
    const inner = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([topLeft]),
        createEditorTableCell([topRight]),
      ]),
      createEditorTableRow([
        createEditorTableCell([bottomLeft]),
        createEditorTableCell([bottomRight]),
      ]),
    ]);
    const outer = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([
          createEditorParagraph("before"),
          inner,
          createEditorParagraph("after"),
        ]),
      ]),
    ]);
    const base = createEditorStateFromDocument(createEditorDocument([outer]));
    const position = paragraphOffsetToPosition(topLeft, 0);
    let current: EditorState = {
      ...base,
      activeSectionIndex: 0,
      activeZone: "main",
      selection: { anchor: position, focus: position },
    };

    const navigation = createEditorNavigation({
      state: () => current,
      applyState: (next) => {
        current = next;
      },
      applyTransactionalState: (producer) => {
        current = producer(current);
      },
      surfaceRef: () => null,
      caretBox: () => ({ left: 0, top: 0, height: 20, visible: true }),
      preferredColumnX: () => null,
      setPreferredColumnX: () => undefined,
      clearPreferredColumn: () => undefined,
      resetTransactionGrouping: () => undefined,
      focusInput: () => undefined,
      documentLayout: () => ({}) as EditorLayoutDocument,
      canvasSnapshotProvider: {} as CanvasLayoutSnapshotProvider,
    });

    expect(navigation.moveVerticalSelection(1, false)).toBe(true);
    expect(current.selection.focus.paragraphId).toBe(bottomLeft.id);
    expect(current.selection.anchor.paragraphId).toBe(bottomLeft.id);
  });
});
