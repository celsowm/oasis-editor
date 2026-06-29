import type { MergeKey } from "@/core/transactionMergeKeys.js";
import type { EditorState } from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  insertClipboardParagraphsAtSelection,
  serializeEditorSelectionToHtml,
} from "@/core/commands/clipboard.js";
import { getSelectedText as getEditorSelectedText } from "@/core/commands/selection.js";
import {
  deleteBackward,
  insertPlainTextAtSelection,
} from "@/core/commands/text.js";
import { parseEditorClipboardHtmlWithDom } from "@/app/clipboard/htmlClipboardParser.js";
import type { TranslateFn } from "@/i18n/index.js";
import type { ContextMenuItem } from "@/ui/components/ContextMenu/ContextMenu.js";
import type { EditorLogger } from "@/utils/logger.js";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface EditorContextMenuClipboardDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  t: TranslateFn;
  logger: EditorLogger;
  setContextMenu: (state: ContextMenuState) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  promptForLink: () => void;
  openFontDialog: () => void;
  openParagraphDialog: () => void;
  table?: EditorTableContextMenuActions;
}

/**
 * The table-aware actions the context menu invokes when the selection is inside
 * a table. Built by `createEditorTableContextMenuActions` from the table
 * operations and dialog openers.
 */
export interface EditorTableContextMenuActions {
  isInsideTable: () => boolean;
  canMerge: () => boolean;
  canSplit: () => boolean;
  canEditColumn: () => boolean;
  canEditRow: () => boolean;
  openProperties: () => void;
  openBordersAndShading: () => void;
  merge: () => void;
  split: () => void;
  insertColumnBefore: () => void;
  insertColumnAfter: () => void;
  deleteColumn: () => void;
  insertRowBefore: () => void;
  insertRowAfter: () => void;
  deleteRow: () => void;
}

export function createEditorContextMenuClipboard(
  deps: EditorContextMenuClipboardDeps,
): ReturnType<typeof createEditorContextMenuClipboardImpl> {
  return createEditorContextMenuClipboardImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorContextMenuClipboardImpl(
  deps: EditorContextMenuClipboardDeps,
) {
  const t = deps.t;
  const programmaticCopy = async (): Promise<void> => {
    const state = deps.state();
    const text = getEditorSelectedText(state);
    if (!text) return;
    const html = serializeEditorSelectionToHtml(state);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      deps.logger.warn("contextMenu:copy:failed", { error: String(err) });
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
  };

  const programmaticCut = async (): Promise<void> => {
    if (deps.isReadOnly()) return;
    const text = getEditorSelectedText(deps.state());
    if (!text) return;
    await programmaticCopy();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState(
      (current): EditorState =>
        deps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState => deleteBackward(temp),
        ),
    );
    deps.focusInput();
  };

  const programmaticPaste = async (): Promise<void> => {
    if (deps.isReadOnly()) return;
    let html = "";
    let text = "";
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            html = await blob.text();
          }
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            text = await blob.text();
          }
        }
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch (err) {
      deps.logger.warn("contextMenu:paste:failed", { error: String(err) });
      try {
        text = await navigator.clipboard.readText();
      } catch {
        return;
      }
    }

    const paragraphs = parseEditorClipboardHtmlWithDom(html);
    if (paragraphs.length > 0) {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState(
        (current): EditorState =>
          deps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState =>
              insertClipboardParagraphsAtSelection(temp, paragraphs),
          ),
      );
      deps.focusInput();
      return;
    }

    if (text) {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState(
        (current): EditorState =>
          deps.applyTableAwareParagraphEdit(
            current,
            (temp): EditorState => insertPlainTextAtSelection(temp, text),
          ),
      );
      deps.focusInput();
    }
  };

  const buildContextMenuItems = (): ContextMenuItem[] => {
    const hasSelection = !isSelectionCollapsed(deps.state().selection);
    const readOnly = deps.isReadOnly();
    const items: ContextMenuItem[] = [
      {
        id: "cut",
        label: t("contextmenu.cut"),
        icon: "scissors",
        shortcut: "Ctrl+X",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-cut",
        onSelect: (): void => {
          void programmaticCut();
        },
      },
      {
        id: "copy",
        label: t("contextmenu.copy"),
        icon: "copy",
        shortcut: "Ctrl+C",
        disabled: !hasSelection,
        testId: "editor-context-menu-copy",
        onSelect: (): void => {
          void programmaticCopy();
        },
      },
      {
        id: "paste",
        label: t("contextmenu.paste"),
        icon: "clipboard",
        shortcut: "Ctrl+V",
        disabled: readOnly,
        testId: "editor-context-menu-paste",
        onSelect: (): void => {
          void programmaticPaste();
        },
      },
      { id: "sep1", type: "separator" },
      {
        id: "link",
        label: t("contextmenu.link"),
        icon: "link",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-link",
        onSelect: deps.promptForLink,
      },
      {
        id: "font",
        label: t("contextmenu.font"),
        icon: "type",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-font",
        onSelect: deps.openFontDialog,
      },
      {
        id: "paragraph",
        label: t("contextmenu.paragraph"),
        icon: "pilcrow",
        disabled: readOnly,
        testId: "editor-context-menu-paragraph",
        onSelect: deps.openParagraphDialog,
      },
    ];
    const table = deps.table;
    if (table?.isInsideTable()) {
      items.push(
        { id: "sep-table", type: "separator" },
        {
          id: "table-properties",
          label: t("contextmenu.tableProperties"),
          icon: "table-properties",
          disabled: readOnly,
          testId: "editor-context-menu-table-properties",
          onSelect: table.openProperties,
        },
        {
          id: "table-insert-row-above",
          label: t("table.insertRowAbove"),
          icon: "rows-3",
          disabled: readOnly || !table.canEditRow(),
          testId: "editor-context-menu-table-insert-row-above",
          onSelect: table.insertRowBefore,
        },
        {
          id: "table-insert-row-below",
          label: t("table.insertRowBelow"),
          icon: "rows-3",
          disabled: readOnly || !table.canEditRow(),
          testId: "editor-context-menu-table-insert-row-below",
          onSelect: table.insertRowAfter,
        },
        {
          id: "table-insert-column-left",
          label: t("table.insertColumnLeft"),
          icon: "columns-3",
          disabled: readOnly || !table.canEditColumn(),
          testId: "editor-context-menu-table-insert-column-left",
          onSelect: table.insertColumnBefore,
        },
        {
          id: "table-insert-column-right",
          label: t("table.insertColumnRight"),
          icon: "columns-3",
          disabled: readOnly || !table.canEditColumn(),
          testId: "editor-context-menu-table-insert-column-right",
          onSelect: table.insertColumnAfter,
        },
        {
          id: "table-delete-row",
          label: t("table.deleteRow"),
          icon: "trash-2",
          disabled: readOnly || !table.canEditRow(),
          testId: "editor-context-menu-table-delete-row",
          onSelect: table.deleteRow,
        },
        {
          id: "table-delete-column",
          label: t("table.deleteColumn"),
          icon: "trash-2",
          disabled: readOnly || !table.canEditColumn(),
          testId: "editor-context-menu-table-delete-column",
          onSelect: table.deleteColumn,
        },
        {
          id: "table-merge",
          label: t("table.mergeTooltip"),
          icon: "combine",
          disabled: readOnly || !table.canMerge(),
          testId: "editor-context-menu-table-merge",
          onSelect: table.merge,
        },
        {
          id: "table-split",
          label: t("table.splitTooltip"),
          icon: "split",
          disabled: readOnly || !table.canSplit(),
          testId: "editor-context-menu-table-split",
          onSelect: table.split,
        },
        {
          id: "table-borders-shading",
          label: t("contextmenu.bordersAndShading"),
          icon: "frame",
          disabled: readOnly,
          testId: "editor-context-menu-table-borders-shading",
          onSelect: table.openBordersAndShading,
        },
      );
    }
    return items;
  };

  const handleEditorContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    deps.setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = (): void => {
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  return {
    buildContextMenuItems,
    closeContextMenu,
    handleEditorContextMenu,
    programmaticCopy,
    programmaticCut,
    programmaticPaste,
  };
}
