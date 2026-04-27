import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";

export class ToggleBoldCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleMark("bold"));
  }
}

export class ToggleItalicCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleMark("italic"));
  }
}

export class ToggleUnderlineCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleMark("underline"));
  }
}

export class InsertTextCommand implements EditorCommand<string> {
  execute(context: CommandContext, text: string): void {
    context.runtime.dispatch(Operations.insertText(text));
  }
}

export class UndoCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.undo();
  }
}

export class RedoCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.redo();
  }
}

export class SetAlignmentCommand implements EditorCommand<"left" | "center" | "right" | "justify"> {
  execute(context: CommandContext, align: "left" | "center" | "right" | "justify"): void {
    context.runtime.dispatch(Operations.setAlignment(align));
  }
}

export class SetStyleCommand implements EditorCommand<string> {
  execute(context: CommandContext, styleId: string): void {
    context.runtime.dispatch(Operations.setStyle(styleId));
  }
}

export class ToggleBulletsCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleUnorderedList());
  }
}

export class ToggleNumberedListCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleOrderedList());
  }
}

export class IndentCommand implements EditorCommand<"increase" | "decrease"> {
  execute(context: CommandContext, direction: "increase" | "decrease"): void {
    if (direction === "increase") {
      context.runtime.dispatch(Operations.increaseIndent());
    } else {
      context.runtime.dispatch(Operations.decreaseIndent());
    }
  }
}
