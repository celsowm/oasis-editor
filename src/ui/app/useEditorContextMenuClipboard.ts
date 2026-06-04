import type { EditorState } from "../../core/model.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import {
  deleteBackward,
  getSelectedText as getEditorSelectedText,
  insertClipboardParagraphsAtSelection,
  insertPlainTextAtSelection,
  serializeEditorSelectionToHtml,
} from "../../core/editorCommands.js";
import { parseEditorClipboardHtmlWithDom } from "../../app/clipboard/htmlClipboardParser.js";
import { t } from "../../i18n/index.js";
import type { ContextMenuItem } from "../components/ContextMenu/ContextMenu.js";
import type { EditorLogger } from "../../utils/logger.js";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface EditorContextMenuClipboardDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  logger: EditorLogger;
  setContextMenu: (state: ContextMenuState) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  promptForLink: () => void;
  openFontDialog: () => void;
  openParagraphDialog: () => void;
}

export function createEditorContextMenuClipboard(
  deps: EditorContextMenuClipboardDeps,
) {
  const programmaticCopy = async () => {
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

  const programmaticCut = async () => {
    if (deps.isReadOnly()) return;
    const text = getEditorSelectedText(deps.state());
    if (!text) return;
    await programmaticCopy();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current) =>
      deps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
    );
    deps.focusInput();
  };

  const programmaticPaste = async () => {
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
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertClipboardParagraphsAtSelection(temp, paragraphs),
        ),
      );
      deps.focusInput();
      return;
    }

    if (text) {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertPlainTextAtSelection(temp, text),
        ),
      );
      deps.focusInput();
    }
  };

  const buildContextMenuItems = (): ContextMenuItem[] => {
    const hasSelection = !isSelectionCollapsed(deps.state().selection);
    const readOnly = deps.isReadOnly();
    return [
      {
        id: "cut",
        label: t("contextmenu.cut"),
        icon: "scissors",
        shortcut: "Ctrl+X",
        disabled: readOnly || !hasSelection,
        testId: "editor-context-menu-cut",
        onSelect: () => {
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
        onSelect: () => {
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
        onSelect: () => {
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
  };

  const handleEditorContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    deps.setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => {
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
