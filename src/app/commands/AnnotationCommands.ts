import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";

export class InsertFootnoteCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.insertFootnote());
  }
}

export class InsertEndnoteCommand implements EditorCommand {
  execute(context: CommandContext): void {
    context.runtime.dispatch(Operations.insertEndnote());
  }
}

export class InsertCommentCommand implements EditorCommand {
  execute(context: CommandContext, text: string): void {
    context.runtime.dispatch(Operations.insertComment(text));
  }
}

export class InsertEquationCommand implements EditorCommand {
  execute(context: CommandContext, latex: string, display: boolean): void {
    context.runtime.dispatch(Operations.insertEquation(latex, display));
  }
}

export class InsertBookmarkCommand implements EditorCommand {
  execute(context: CommandContext, name: string): void {
    context.runtime.dispatch(Operations.insertBookmark(name));
  }
}

export class InsertFieldCommand implements EditorCommand {
  execute(context: CommandContext, type: string, instruction: string): void {
    context.runtime.dispatch(Operations.insertField({ type: type as any, instruction }));
  }
}
