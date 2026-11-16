import { insertTextAtSelection } from "@/core/commands/text.js";
import { stepTabParagraphIndent } from "@/core/commands/paragraphTabIndent.js";
import {
  findParagraphLocation,
  findParagraphTablePathLocation,
  getParagraphs,
  getParagraphText,
  type EditorState,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export type TabAction =
  | "passThrough"
  | "insertLiteralTab"
  | "navigateCell"
  | "changeParagraphIndent";

export interface TabContext {
  inTable: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  wholeParagraphs: boolean;
  atListStart: boolean;
}

/** Pure routing policy: table context and host modifiers take precedence. */
export function resolveTabAction(context: TabContext): TabAction {
  if (context.alt || context.ctrl || context.meta) {
    return context.inTable && context.ctrl && !context.alt && !context.meta && !context.shift
      ? "insertLiteralTab"
      : "passThrough";
  }
  if (context.inTable) return "navigateCell";
  if (context.shift || context.wholeParagraphs || context.atListStart) {
    return "changeParagraphIndent";
  }
  return "insertLiteralTab";
}

export function handleDocumentTab(
  deps: EditorKeyboardDeps,
  state: EditorState,
  event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
): void {
  const paragraphId = state.selection.focus.paragraphId;
  const location = findParagraphLocation(state.document, paragraphId);
  const inTable = location
    ? Boolean(findParagraphTablePathLocation(state.document, paragraphId, location.sectionIndex))
    : false;
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return;
  const range = normalizeSelection(state, paragraphs);
  const paragraph = paragraphs[range.startIndex];
  if (!paragraph) return;
  const wholeParagraphs = !range.isCollapsed &&
    (range.startIndex !== range.endIndex ||
      (range.startParagraphOffset === 0 &&
        range.endParagraphOffset === getParagraphText(paragraph).length));
  const action = resolveTabAction({
    inTable,
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
    wholeParagraphs,
    atListStart: Boolean(paragraph.list) && range.isCollapsed && range.startParagraphOffset === 0,
  });
  if (action === "passThrough") return;

  event.preventDefault();
  deps.clearPreferredColumn();
  deps.resetTransactionGrouping();
  switch (action) {
    case "insertLiteralTab": {
      const style = cloneStyle(deps.pendingCaretTextStyle?.());
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          insertTextAtSelection(temp, "\t", style),
        ),
      );
      break;
    }
    case "navigateCell": {
      const direction = event.shiftKey ? -1 : 1;
      const target = deps.resolveTableTabTarget?.(state.document, paragraphId, direction);
      if (target?.kind === "adjacent") {
        deps.applySelectionPreservingStructure(target.selection);
      } else if (target?.kind === "afterLast" && direction === 1 &&
                 deps.appendTableRowForTab && deps.canExecuteCommand?.("tableInsertRowAfter") !== false) {
        deps.applyTransactionalState(deps.appendTableRowForTab);
      } else if (!target) {
        const next = deps.resolveAdjacentTableCellPosition(state.document, paragraphId, direction);
        if (next) deps.applySelectionPreservingStructure({ anchor: next, focus: next });
      }
      break;
    }
    case "changeParagraphIndent": {
      const command = event.shiftKey ? "outdent" : "indent";
      if (deps.canExecuteCommand?.(command) === false) break;
      deps.applySelectionAwareParagraphCommand((current): EditorState =>
        stepTabParagraphIndent(current, event.shiftKey ? -1 : 1),
      );
      break;
    }
  }
  event.currentTarget.value = "";
  deps.focusInput();
}
