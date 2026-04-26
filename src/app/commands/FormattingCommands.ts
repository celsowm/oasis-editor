import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";

export class ToggleBoldCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.toggleMark("bold"));
  }
}

export class ToggleItalicCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.toggleMark("italic"));
  }
}

export class ToggleUnderlineCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.toggleMark("underline"));
  }
}

export class InsertTextCommand implements EditorCommand {
  execute(context: CommandContext, text: string): void {
    context.runtime.dispatch(Operations.insertText(text));
  }
}

export class UndoCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.undo());
  }
}

export class RedoCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.redo());
  }
}

export class SetAlignmentCommand implements EditorCommand {
  execute(context: CommandContext, align: "left" | "center" | "right" | "justify"): void {
    context.runtime.dispatch(Operations.setAlignment(align));
  }
}

export class SetStyleCommand implements EditorCommand {
  execute(context: CommandContext, styleId: string): void {
    context.runtime.dispatch(Operations.setStyle(styleId));
  }
}

export class ToggleBulletsCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.toggleUnorderedList());
  }
}

export class ToggleNumberedListCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.toggleOrderedList());
  }
}

export class IndentCommand implements EditorCommand {
  execute(context: CommandContext, direction: "increase" | "decrease"): void {
    if (direction === "increase") {
      context.runtime.dispatch(Operations.increaseIndent());
    } else {
      context.runtime.dispatch(Operations.decreaseIndent());
    }
  }
}
