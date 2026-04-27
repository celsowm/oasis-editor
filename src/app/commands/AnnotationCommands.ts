import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";

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

export interface InsertEquationArgs {
  latex: string;
  display: boolean;
}

export class InsertEquationCommand implements EditorCommand<InsertEquationArgs> {
  execute(context: CommandContext, args: InsertEquationArgs): void {
    context.runtime.dispatch(Operations.insertEquation(args.latex, args.display));
  }
}

export class InsertBookmarkCommand implements EditorCommand<string> {
  execute(context: CommandContext, name: string): void {
    context.runtime.dispatch(Operations.insertBookmark(name));
  }
}

export interface InsertFieldArgs {
  type: string;
  instruction: string;
}

export class InsertFieldCommand implements EditorCommand<InsertFieldArgs> {
  execute(context: CommandContext, args: InsertFieldArgs): void {
    context.runtime.dispatch(Operations.insertField({ type: args.type as any, instruction: args.instruction }));
  }
}
