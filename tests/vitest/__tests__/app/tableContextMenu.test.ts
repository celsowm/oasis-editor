import { describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "../../../../src/core/editorState.js";
import { createEditorContextMenuClipboard } from "../../../../src/ui/app/useEditorContextMenuClipboard.js";

function createContextMenuHarness(insideTable: boolean) {
  const paragraph = createEditorParagraph("Body");
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  const tableAction = vi.fn();
  const menu = createEditorContextMenuClipboard({
    state: () => state,
    isReadOnly: () => false,
    logger: { warn: vi.fn() } as any,
    setContextMenu: vi.fn(),
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    applyTransactionalState: vi.fn(),
    applyTableAwareParagraphEdit: (_state, edit) => edit(_state),
    focusInput: vi.fn(),
    promptForLink: vi.fn(),
    openFontDialog: vi.fn(),
    openParagraphDialog: vi.fn(),
    table: {
      isInsideTable: () => insideTable,
      canMerge: () => false,
      canSplit: () => false,
      canEditColumn: () => true,
      canEditRow: () => true,
      openProperties: tableAction,
      openBordersAndShading: tableAction,
      merge: tableAction,
      split: tableAction,
      insertColumnBefore: tableAction,
      insertColumnAfter: tableAction,
      deleteColumn: tableAction,
      insertRowBefore: tableAction,
      insertRowAfter: tableAction,
      deleteRow: tableAction,
    },
  });
  return menu.buildContextMenuItems();
}

describe("editor context menu table items", () => {
  it("adds table actions only while inside a table", () => {
    const outside = createContextMenuHarness(false);
    const inside = createContextMenuHarness(true);

    expect(
      outside.some((item) => item.id === "table-properties"),
    ).toBe(false);
    expect(inside.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "table-properties",
        "table-insert-row-above",
        "table-insert-row-below",
        "table-insert-column-left",
        "table-insert-column-right",
        "table-delete-row",
        "table-delete-column",
        "table-merge",
        "table-split",
        "table-borders-shading",
      ]),
    );
  });
});
