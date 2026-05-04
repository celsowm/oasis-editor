import { setSelection, insertPageBreakAtSelection, insertTextAtSelection, splitBlockAtSelection } from "../../core/editorCommands.js";
import { getParagraphs, getParagraphText, paragraphOffsetToPosition } from "../../core/model.js";
import type { Editor2KeyboardDeps } from "./useEditor2Keyboard.js";

export interface Editor2KeyBinding {
  id: string;
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  execute: (deps: Editor2KeyboardDeps, event: KeyboardEvent) => boolean | void;
}

export class Editor2CommandRegistry {
  private bindings: Map<string, Editor2KeyBinding> = new Map();

  register(binding: Editor2KeyBinding) {
    this.bindings.set(binding.id, binding);
  }

  unregister(id: string) {
    this.bindings.delete(id);
  }

  getBindings(): Editor2KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  execute(event: KeyboardEvent, deps: Editor2KeyboardDeps): boolean {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const lowerKey = event.key.toLowerCase();

    for (const binding of this.bindings.values()) {
      if (
        binding.key.toLowerCase() === lowerKey &&
        Boolean(binding.ctrlOrMeta) === isCtrlOrMeta &&
        Boolean(binding.shift) === event.shiftKey &&
        Boolean(binding.alt) === event.altKey
      ) {
        const handled = binding.execute(deps, event);
        if (handled !== false) {
          event.preventDefault();
          return true;
        }
      }
    }
    return false;
  }
}

export const defaultEditor2KeyBindings: Editor2KeyBinding[] = [
  {
    id: "selectAll",
    key: "a",
    ctrlOrMeta: true,
    execute: (deps) => {
      const currentState = deps.state();
      const paragraphs = getParagraphs(currentState);
      if (paragraphs.length === 0) return false;
      const firstParagraph = paragraphs[0]!;
      const lastParagraph = paragraphs[paragraphs.length - 1]!;
      deps.clearPreferredColumn();
      deps.applyState(
        setSelection(currentState, {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
        })
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "editImageAlt",
    key: "a",
    ctrlOrMeta: true,
    alt: true,
    execute: (deps) => {
      const selectedImage = deps.selectedImageRun();
      if (selectedImage) {
        deps.commandsController.promptForImageAlt();
        return true;
      }
      return false;
    },
  },
  {
    id: "pastePlainText",
    key: "v",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps) => {
      deps.setForcePlainTextPaste(true);
      deps.focusInput();
      return true;
    },
  },
  {
    id: "bold",
    key: "b",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.commandsController.applyBooleanStyleCommand("bold");
      return true;
    },
  },
  {
    id: "italic",
    key: "i",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.commandsController.applyBooleanStyleCommand("italic");
      return true;
    },
  },
  {
    id: "underline",
    key: "u",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.commandsController.applyBooleanStyleCommand("underline");
      return true;
    },
  },
  {
    id: "link",
    key: "k",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.commandsController.promptForLink();
      return true;
    },
  },
  {
    id: "orderedList",
    key: "7",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps) => {
      deps.commandsController.applyParagraphListCommand("ordered");
      return true;
    },
  },
  {
    id: "bulletList",
    key: "8",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps) => {
      deps.commandsController.applyParagraphListCommand("bullet");
      return true;
    },
  },
  {
    id: "find",
    key: "f",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.toggleFindReplace(true);
      return true;
    },
  },
  {
    id: "replace",
    key: "h",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.toggleReplace(true);
      return true;
    },
  },
  {
    id: "undo",
    key: "z",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.performUndo();
      return true;
    },
  },
  {
    id: "redo",
    key: "z",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps) => {
      deps.performRedo();
      return true;
    },
  },
  {
    id: "redoAlternative",
    key: "y",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.performRedo();
      return true;
    },
  },
  {
    id: "pageBreak",
    key: "Enter",
    ctrlOrMeta: true,
    execute: (deps) => {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) => insertPageBreakAtSelection(temp))
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "lineBreak",
    key: "Enter",
    shift: true,
    execute: (deps) => {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) => insertTextAtSelection(temp, "\n"))
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "splitBlock",
    key: "Enter",
    execute: (deps) => {
      if (deps.commandsController.handleListEnter()) {
        return true;
      }
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) => splitBlockAtSelection(temp))
      );
      deps.focusInput();
      return true;
    },
  },
];