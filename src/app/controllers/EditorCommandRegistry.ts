import {
  insertPageBreakAtSelection,
  splitBlockAtSelection,
} from "@/core/commands/block.js";
import { setSelection } from "@/core/commands/selection.js";
import { insertTextAtSelection } from "@/core/commands/text.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition, EditorState } from "@/core/model.js";
import type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export interface EditorCommandExecutor {
  executeCommand: (commandName: string, payload?: unknown) => unknown;
  canExecuteCommand?: (
    commandName: string,
    payload?: unknown,
  ) => boolean | undefined;
}

export interface EditorKeyBinding {
  id: string;
  command?: string;
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  execute: (deps: EditorKeyboardDeps, event: KeyboardEvent) => boolean | void;
}

export class EditorCommandRegistry {
  private bindings: Map<string, EditorKeyBinding> = new Map();

  register(binding: EditorKeyBinding): void {
    this.bindings.set(binding.id, binding);
  }

  unregister(id: string): void {
    this.bindings.delete(id);
  }

  getBindings(): EditorKeyBinding[] {
    return Array.from(this.bindings.values());
  }

  execute(
    event: KeyboardEvent,
    deps: EditorKeyboardDeps,
    commandExecutor?: EditorCommandExecutor,
  ): boolean {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const lowerKey = event.key.toLowerCase();

    for (const binding of this.bindings.values()) {
      if (
        binding.key.toLowerCase() === lowerKey &&
        Boolean(binding.ctrlOrMeta) === isCtrlOrMeta &&
        Boolean(binding.shift) === event.shiftKey &&
        Boolean(binding.alt) === event.altKey
      ) {
        if (binding.command && commandExecutor) {
          const canExecute =
            commandExecutor.canExecuteCommand?.(binding.command) ?? true;
          if (canExecute) {
            commandExecutor.executeCommand(binding.command);
            event.preventDefault();
            return true;
          }
        }
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

export const defaultEditorKeyBindings: EditorKeyBinding[] = [
  {
    id: "selectAll",
    command: "selectAll",
    key: "a",
    ctrlOrMeta: true,
    execute: (deps): boolean => {
      const currentState = deps.state();
      const paragraphs = getParagraphs(currentState);
      if (paragraphs.length === 0) return false;
      const firstParagraph = paragraphs[0]!;
      const lastParagraph = paragraphs[paragraphs.length - 1]!;
      deps.clearPreferredColumn();
      deps.applyState(
        setSelection(currentState, {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(
            lastParagraph,
            getParagraphText(lastParagraph).length,
          ),
        }),
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "editImageAlt",
    command: "editImageAlt",
    key: "a",
    ctrlOrMeta: true,
    alt: true,
    execute: (deps): boolean => {
      const selectedImage = deps.selectedImageRun();
      if (selectedImage) {
        deps.commandsController.promptForImageAlt();
        return true;
      }
      return false;
    },
  },
  {
    id: "insertFootnote",
    command: "insertFootnote",
    key: "f",
    ctrlOrMeta: true,
    alt: true,
    execute: (deps): true => {
      deps.commandsController.applyInsertFootnoteCommand();
      return true;
    },
  },
  {
    id: "pastePlainText",
    command: "pastePlainText",
    key: "v",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps): true => {
      deps.setForcePlainTextPaste(true);
      deps.focusInput();
      return true;
    },
  },
  {
    id: "bold",
    command: "bold",
    key: "b",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.commandsController.applyBooleanStyleCommand("bold");
      return true;
    },
  },
  {
    id: "italic",
    command: "italic",
    key: "i",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.commandsController.applyBooleanStyleCommand("italic");
      return true;
    },
  },
  {
    id: "underline",
    command: "underline",
    key: "u",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.commandsController.applyBooleanStyleCommand("underline");
      return true;
    },
  },
  {
    id: "link",
    command: "link",
    key: "k",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.commandsController.promptForLink();
      return true;
    },
  },
  {
    id: "orderedList",
    command: "orderedList",
    key: "7",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps): true => {
      deps.commandsController.applyParagraphListCommand("ordered");
      return true;
    },
  },
  {
    id: "bulletList",
    command: "bulletList",
    key: "8",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps): true => {
      deps.commandsController.applyParagraphListCommand("bullet");
      return true;
    },
  },
  {
    id: "find",
    command: "find",
    key: "f",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.toggleFindReplace(true);
      return true;
    },
  },
  {
    id: "replace",
    command: "replace",
    key: "h",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.toggleReplace(true);
      return true;
    },
  },
  {
    id: "undo",
    command: "undo",
    key: "z",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.performUndo();
      return true;
    },
  },
  {
    id: "redo",
    command: "redo",
    key: "z",
    ctrlOrMeta: true,
    shift: true,
    execute: (deps): true => {
      deps.performRedo();
      return true;
    },
  },
  {
    id: "redoAlternative",
    command: "redo",
    key: "y",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.performRedo();
      return true;
    },
  },
  {
    id: "pageBreak",
    command: "pageBreak",
    key: "Enter",
    ctrlOrMeta: true,
    execute: (deps): true => {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          insertPageBreakAtSelection(temp),
        ),
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "lineBreak",
    command: "lineBreak",
    key: "Enter",
    shift: true,
    execute: (deps): true => {
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          insertTextAtSelection(temp, "\n"),
        ),
      );
      deps.focusInput();
      return true;
    },
  },
  {
    id: "splitBlock",
    command: "splitBlock",
    key: "Enter",
    execute: (deps): true => {
      if (deps.commandsController.handleListEnter()) {
        return true;
      }
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          splitBlockAtSelection(temp),
        ),
      );
      deps.focusInput();
      return true;
    },
  },
];
