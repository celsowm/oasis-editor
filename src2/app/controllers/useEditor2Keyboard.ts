import {
  deleteBackward,
  deleteForward,
  extendSelectionDown,
  extendSelectionLeft,
  extendSelectionRight,
  extendSelectionUp,
  insertPageBreakAtSelection,
  insertTextAtSelection,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  outdentParagraphList,
  setSelection,
  splitBlockAtSelection,
} from "../../core/editorCommands.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  type Editor2Document,
  type Editor2Position,
  type Editor2State,
} from "../../core/model.js";
import { isSelectionCollapsed } from "../../core/selection.js";
import { resolveWordSelection } from "../../core/wordBoundaries.js";

export interface Editor2KeyboardDeps {
  state: () => Editor2State;
  isReadOnly: () => boolean;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyState: (state: Editor2State) => void;
  applyTransactionalState: (
    transform: (state: Editor2State) => Editor2State,
  ) => void;
  applyTableAwareParagraphEdit: (
    state: Editor2State,
    edit: (state: Editor2State) => Editor2State,
  ) => Editor2State;
  applySelectionAwareParagraphCommand: (
    command: (state: Editor2State) => Editor2State,
  ) => void;
  focusInput: () => void;
  commandsController: {
    promptForImageAlt: () => void;
    promptForLink: () => void;
    applyBooleanStyleCommand: (style: "bold" | "italic" | "underline") => void;
    applyParagraphListCommand: (style: "bullet" | "ordered") => void;
    handleListEnter: () => boolean;
    handleListBoundaryBackspace: (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => boolean;
    handleListTab: (direction: "indent" | "outdent") => boolean;
  };
  selectedImageRun: () => any;
  setForcePlainTextPaste: (value: boolean) => void;
  moveSelectionByWord: (direction: "left" | "right", extend: boolean) => boolean;
  moveSelectionToDocumentBoundary: (boundary: "start" | "end", extend: boolean) => boolean;
  moveSelectionToParagraphBoundary: (boundary: "start" | "end", extend: boolean) => boolean;
  moveSelectedImageByParagraph: (direction: -1 | 1) => boolean;
  performUndo: () => void;
  performRedo: () => void;
  moveVerticalSelection: (direction: -1 | 1, extend: boolean) => boolean;
  moveVerticalByBlock: (direction: -1 | 1) => boolean;
  resolveAdjacentTableCellPosition: (
    document: Editor2Document,
    paragraphId: string,
    delta: -1 | 1,
  ) => Editor2Position | null;
  applySelectionPreservingStructure: (selection: Editor2State["selection"]) => void;
}

export function createEditor2KeyboardController(deps: Editor2KeyboardDeps) {
  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const currentState = deps.state();

    if (deps.isReadOnly()) {
      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isNavigationKey =
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "Home" ||
        key === "End" ||
        key === "PageUp" ||
        key === "PageDown";
      const isModifierOnly =
        key === "Shift" || key === "Control" || key === "Meta" || key === "Alt";
      const isCopyOrSelectAll =
        (event.ctrlKey || event.metaKey) && (lowerKey === "a" || lowerKey === "c");
      if (!isNavigationKey && !isModifierOnly && !isCopyOrSelectAll) {
        event.preventDefault();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && !event.altKey) {
      event.preventDefault();
      const paragraphs = getParagraphs(currentState);
      if (paragraphs.length === 0) {
        return;
      }

      const firstParagraph = paragraphs[0]!;
      const lastParagraph = paragraphs[paragraphs.length - 1]!;
      deps.clearPreferredColumn();
      deps.applyState(
        setSelection(currentState, {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
        }),
      );
      deps.focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "a") {
      const selectedImage = deps.selectedImageRun();
      if (selectedImage) {
        event.preventDefault();
        deps.commandsController.promptForImageAlt();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v" && !event.altKey) {
      event.preventDefault();
      deps.setForcePlainTextPaste(true);
      deps.focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (deps.moveSelectionByWord(event.key === "ArrowLeft" ? "left" : "right", event.shiftKey)) {
          deps.focusInput();
          return;
        }
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();

        if (!isSelectionCollapsed(currentState.selection)) {
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
          );
          event.currentTarget.value = "";
          deps.focusInput();
          return;
        }

        const paragraphs = getParagraphs(currentState);
        const focusParagraphIndex = paragraphs.findIndex(
          (paragraph) => paragraph.id === currentState.selection.focus.paragraphId,
        );
        const focusParagraph = paragraphs[focusParagraphIndex];
        if (!focusParagraph) {
          event.currentTarget.value = "";
          deps.focusInput();
          return;
        }

        if (event.key === "Backspace" && focusParagraph.list) {
          const focusParagraphOffset = positionToParagraphOffset(focusParagraph, currentState.selection.focus);
          if (focusParagraphOffset === 0) {
            deps.applySelectionAwareParagraphCommand((current) => outdentParagraphList(current));
            event.currentTarget.value = "";
            deps.focusInput();
            return;
          }
        }

        const focusOffset = currentState.selection.focus.offset;
        const paragraphText = getParagraphText(focusParagraph);
        const word = resolveWordSelection(paragraphText, focusOffset);

        if (event.key === "Backspace") {
          if (focusOffset === 0 || word.start === focusOffset) {
            deps.applyTransactionalState((current) =>
              deps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
            );
          } else {
            deps.applyTransactionalState((current) =>
              deps.applyTableAwareParagraphEdit(
                setSelection(current, {
                  anchor: paragraphOffsetToPosition(focusParagraph, word.start),
                  focus: paragraphOffsetToPosition(focusParagraph, focusOffset),
                }),
                (temp) => deleteBackward(temp),
              ),
            );
          }
        } else if (focusOffset >= paragraphText.length) {
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)),
          );
        } else if (word.end > focusOffset) {
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(
              setSelection(current, {
                anchor: paragraphOffsetToPosition(focusParagraph, focusOffset),
                focus: paragraphOffsetToPosition(focusParagraph, word.end),
              }),
              (temp) => deleteBackward(temp),
            ),
          );
        } else {
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)),
          );
        }

        event.currentTarget.value = "";
        deps.focusInput();
        return;
      }
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      deps.resetTransactionGrouping();
      const boundary = event.key === "Home" ? "start" : "end";
      if (event.ctrlKey || event.metaKey) {
        deps.moveSelectionToDocumentBoundary(boundary, event.shiftKey);
      } else {
        deps.moveSelectionToParagraphBoundary(boundary, event.shiftKey);
      }
      deps.focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const lowerKey = event.key.toLowerCase();
      if (lowerKey === "b" || lowerKey === "i" || lowerKey === "u") {
        event.preventDefault();
        deps.commandsController.applyBooleanStyleCommand(
          (lowerKey === "b" ? "bold" : lowerKey === "i" ? "italic" : "underline"),
        );
        return;
      }

      if (lowerKey === "k") {
        event.preventDefault();
        deps.commandsController.promptForLink();
        return;
      }

      if (event.shiftKey && (lowerKey === "7" || lowerKey === "8")) {
        event.preventDefault();
        deps.commandsController.applyParagraphListCommand(lowerKey === "7" ? "ordered" : "bullet");
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.altKey) {
      event.preventDefault();
      if (event.shiftKey) {
        deps.performRedo();
        return;
      }

      deps.performUndo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !event.altKey) {
      event.preventDefault();
      deps.performRedo();
      return;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        deps.resetTransactionGrouping();
        deps.clearPreferredColumn();
        if (deps.moveSelectedImageByParagraph(event.key === "ArrowUp" ? -1 : 1)) {
          return;
        }
      }
    }

    switch (event.key) {
      case "Enter":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          deps.clearPreferredColumn();
          deps.resetTransactionGrouping();
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(current, (temp) => insertPageBreakAtSelection(temp)),
          );
          deps.focusInput();
          return;
        }
        if (event.shiftKey) {
          event.preventDefault();
          deps.clearPreferredColumn();
          deps.resetTransactionGrouping();
          deps.applyTransactionalState((current) =>
            deps.applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, "\n")),
          );
          deps.focusInput();
          return;
        }
        if (deps.commandsController.handleListEnter()) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState((current) =>
          deps.applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp)),
        );
        deps.focusInput();
        return;
      case "Backspace":
        if (deps.commandsController.handleListBoundaryBackspace(event)) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState((current) =>
          deps.applyTableAwareParagraphEdit(current, (temp) => deleteBackward(temp)),
        );
        event.currentTarget.value = "";
        deps.focusInput();
        return;
      case "Delete":
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState((current) => deps.applyTableAwareParagraphEdit(current, (temp) => deleteForward(temp)));
        event.currentTarget.value = "";
        deps.focusInput();
        return;
      case "Tab": {
        if (deps.commandsController.handleListTab(event.shiftKey ? "outdent" : "indent")) {
          event.preventDefault();
          return;
        }
        const nextPosition = deps.resolveAdjacentTableCellPosition(
          currentState.document,
          currentState.selection.focus.paragraphId,
          event.shiftKey ? -1 : 1,
        );
        if (nextPosition) {
          event.preventDefault();
          deps.clearPreferredColumn();
          deps.resetTransactionGrouping();
          deps.applySelectionPreservingStructure({
            anchor: nextPosition,
            focus: nextPosition,
          });
          deps.focusInput();
          return;
        }
        break;
      }
      case "ArrowLeft":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          deps.clearPreferredColumn();
          deps.applyState(extendSelectionLeft(currentState));
        } else {
          deps.clearPreferredColumn();
          deps.applyState(moveSelectionLeft(currentState));
        }
        deps.focusInput();
        return;
      case "ArrowRight":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          deps.clearPreferredColumn();
          deps.applyState(extendSelectionRight(currentState));
        } else {
          deps.clearPreferredColumn();
          deps.applyState(moveSelectionRight(currentState));
        }
        deps.focusInput();
        return;
      case "ArrowUp":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          if (!deps.moveVerticalSelection(-1, true)) {
            deps.applyState(extendSelectionUp(currentState));
            deps.focusInput();
          }
        } else if (!deps.moveVerticalByBlock(-1)) {
          deps.applyState(moveSelectionUp(currentState));
          deps.focusInput();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          if (!deps.moveVerticalSelection(1, true)) {
            deps.applyState(extendSelectionDown(currentState));
            deps.focusInput();
          }
        } else if (!deps.moveVerticalByBlock(1)) {
          deps.applyState(moveSelectionDown(currentState));
          deps.focusInput();
        }
        return;
      default:
        return;
    }
  };

  return {
    handleKeyDown,
  };
}