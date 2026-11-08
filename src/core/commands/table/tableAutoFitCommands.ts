import type {
  EditorState,
  EditorTableNode,
  EditorTableStyle,
} from "@/core/model.js";
import {
  patchStyleValue,
  createTableRevisionMetadata,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
} from "./tableCommandUtils.js";

/** The sizing modes WordCraft's "AutoFit" command accepts. */
export type TableAutoFitMode = "contents" | "window" | "fixed";

/**
 * True when the caret sits inside a table that can be auto-fit.
 */
export function canSetActiveTableAutoFit(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Word's "AutoFit" command, matching WordCraft's `table.autofit` mode payload:
 * - `contents`: size the table to fit its contents (`autofit` layout).
 * - `window`: size the table to span the page (`autofit` layout, 100% width).
 * - `fixed`: keep the current column widths (`fixed` layout).
 *
 * A no-op when the caret is outside a table.
 */
export function setActiveTableAutoFit(
  state: EditorState,
  mode: TableAutoFitMode,
): EditorState {
  const nextLayout: "fixed" | "autofit" =
    mode === "fixed" ? "fixed" : "autofit";

  return updateActiveTableBlocks(state, (table): EditorTableNode => {
    let style = table.style;
    if (state.trackChangesEnabled && !style?.revision) {
      style = {
        ...(style ?? {}),
        revision: {
          ...createTableRevisionMetadata(),
          type: "property",
          previous: { ...(style ?? {}) },
        },
      };
    }
    let nextStyle = patchStyleValue(style, "layout", nextLayout);
    if (mode === "window") {
      nextStyle = patchStyleValue(nextStyle, "width", "100%");
    } else if (mode === "contents") {
      // Auto-size to contents clears any explicit width.
      nextStyle = patchStyleValue(nextStyle, "width", null);
    }
    return { ...table, style: nextStyle as EditorTableStyle | undefined };
  });
}
