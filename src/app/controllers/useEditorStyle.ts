import { createSignal, createEffect } from "solid-js";
import type { EditorState, EditorTextStyle } from "../../core/model.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import { getToolbarStyleState } from "../../ui/toolbarStyleState.js";
import type { ToolbarStyleState, BooleanStyleKey } from "../../ui/toolbarStyleState.js";
import type { createEditorCommandsController } from "./EditorCommandsController.js";

type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

export interface UseEditorStyleProps {
  state: () => EditorState;
  commandsController: () => ReturnType<typeof createEditorCommandsController>;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
  logger: { info: (msg: string) => void };
}

export function createEditorStyleController(deps: UseEditorStyleProps) {
  const [pendingCaretTextStyle, setPendingCaretTextStyle] = createSignal<EditorTextStyle | undefined>(undefined);

  const clearPendingCaretTextStyle = () => {
    setPendingCaretTextStyle(undefined);
  };

  createEffect(() => {
    if (!isSelectionCollapsed(deps.state().selection)) {
      clearPendingCaretTextStyle();
    }
  });

  const updatePendingCaretTextStyleValue = <K extends ValueStyleKey>(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    setPendingCaretTextStyle((current) => {
      const next = { ...(current ?? {}) } as Record<string, unknown>;
      if (value === null || value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return Object.keys(next).length > 0 ? (next as EditorTextStyle) : undefined;
    });
  };

  const updatePendingCaretBooleanStyle = (
    key: BooleanStyleKey,
    enabled: boolean,
  ) => {
    setPendingCaretTextStyle((current) => {
      const next = { ...(current ?? {}) } as Record<string, unknown>;
      next[key] = enabled;
      if (key === "superscript" && enabled) {
        next.subscript = false;
      }
      if (key === "subscript" && enabled) {
        next.superscript = false;
      }
      return next as EditorTextStyle;
    });
  };

  const toolbarStyleState = (): ToolbarStyleState => {
    const resolved = getToolbarStyleState(deps.state());
    const pending = pendingCaretTextStyle();
    if (!isSelectionCollapsed(deps.state().selection) || !pending) {
      return resolved;
    }

    return {
      ...resolved,
      bold: pending.bold ?? resolved.bold,
      italic: pending.italic ?? resolved.italic,
      underline: pending.underline ?? resolved.underline,
      strike: pending.strike ?? resolved.strike,
      superscript: pending.superscript ?? resolved.superscript,
      subscript: pending.subscript ?? resolved.subscript,
      fontFamily: pending.fontFamily ?? resolved.fontFamily,
      fontSize:
        pending.fontSize !== undefined && pending.fontSize !== null
          ? String(pending.fontSize)
          : resolved.fontSize,
      color: pending.color ?? resolved.color,
      highlight: pending.highlight ?? resolved.highlight,
      link: pending.link ?? resolved.link,
    };
  };

  const applyToolbarValueStyleCommand = <K extends ValueStyleKey>(
    key: K,
    value: EditorTextStyle[K] | null,
  ) => {
    if (isSelectionCollapsed(deps.state().selection)) {
      deps.logger.info(`setPendingStyle:${key}=${JSON.stringify(value)}`);
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      updatePendingCaretTextStyleValue(key, value);
      deps.focusInput();
      return;
    }

    deps.commandsController().applyValueStyleCommand(key, value);
  };

  const applyToolbarBooleanStyleCommand = (key: BooleanStyleKey) => {
    if (isSelectionCollapsed(deps.state().selection)) {
      const nextValue = !toolbarStyleState()[key];
      deps.logger.info(`setPendingStyle:${key}=${JSON.stringify(nextValue)}`);
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      updatePendingCaretBooleanStyle(key, nextValue);
      deps.focusInput();
      return;
    }

    deps.commandsController().applyBooleanStyleCommand(key);
  };

  return {
    pendingCaretTextStyle,
    clearPendingCaretTextStyle,
    toolbarStyleState,
    applyToolbarValueStyleCommand,
    applyToolbarBooleanStyleCommand,
  };
}
