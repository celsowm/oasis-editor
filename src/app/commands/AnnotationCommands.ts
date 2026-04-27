import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";

export class InsertFieldCommand implements EditorCommand<{type: string, instruction?: string}> {
  execute(context: CommandContext, args: {type: string, instruction?: string}): void {
    context.runtime.dispatch(Operations.insertField({ 
      type: args.type as any, 
      instruction: args.instruction || "" 
    }));
  }
}

export class InsertEquationCommand implements EditorCommand<{latex: string, display: boolean}> {
  execute(context: CommandContext, args: {latex: string, display: boolean}): void {
    context.runtime.dispatch(Operations.insertEquation(args.latex, args.display));
  }
}

export class InsertBookmarkCommand implements EditorCommand<string> {
  execute(context: CommandContext, name: string): void {
    context.runtime.dispatch(Operations.insertBookmark(name));
  }
}

export class InsertFootnoteCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.insertFootnote());
  }
}

export class InsertEndnoteCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.insertEndnote());
  }
}

export class InsertCommentCommand implements EditorCommand<string> {
  execute(context: CommandContext, text: string): void {
    context.runtime.dispatch(Operations.insertComment(text));
  }
}
