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

export class ToggleStrikethroughCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleMark("strike"));
  }
}

export class ToggleSuperscriptCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.setMark("vertAlign", "superscript"));
  }
}

export class ToggleSubscriptCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.setMark("vertAlign", "subscript"));
  }
}

export class SetColorCommand implements EditorCommand<string> {
  execute(context: CommandContext, color: string): void {
    context.runtime.dispatch(Operations.setMark("color", color));
  }
}

export class SetHighlightCommand implements EditorCommand<string> {
  execute(context: CommandContext, color: string): void {
    context.runtime.dispatch(Operations.setMark("highlight", color));
  }
}

export class SetFontFamilyCommand implements EditorCommand<string> {
  execute(context: CommandContext, fontFamily: string): void {
    context.runtime.dispatch(Operations.setMark("fontFamily", fontFamily));
  }
}

export class InsertTextCommand implements EditorCommand<string> {
  execute(context: CommandContext, text: string): void {
    context.runtime.dispatch(Operations.insertText(text));
  }
}

export class DeleteTextCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.deleteText());
  }
}

export class InsertParagraphCommand implements EditorCommand<boolean | void> {
  execute(context: CommandContext, isShift?: boolean | void): void {
    // Note: in many editors Shift+Enter is soft break, Enter is hard break
    context.runtime.dispatch(Operations.insertParagraph());
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

export class IncreaseIndentCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.increaseIndent());
  }
}

export class DecreaseIndentCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.decreaseIndent());
  }
}

export class SetTemplateCommand implements EditorCommand<string> {
  execute(context: CommandContext, templateId: string): void {
    // Find current section and set template
    const state = context.runtime.getState();
    const sectionId = state.document.sections[0].id; // Simple approach for now
    context.runtime.dispatch(Operations.setSectionTemplate(sectionId, templateId));
  }
}

export class ToggleTrackChangesCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.toggleTrackChanges());
  }
}

export class InsertImageCommand implements EditorCommand<{src: string, nw: number, nh: number, dw: number}> {
  execute(context: CommandContext, args: {src: string, nw: number, nh: number, dw: number}): void {
    context.runtime.dispatch(Operations.insertImage(args.src, args.nw, args.nh, args.dw));
  }
}

export class ResizeImageCommand implements EditorCommand<{id: string, w: number, h: number}> {
  execute(context: CommandContext, args: {id: string, w: number, h: number}): void {
    context.runtime.dispatch(Operations.resizeImage(args.id, args.w, args.h));
  }
}

export class InsertTableCommand implements EditorCommand<{r: number, c: number}> {
  execute(context: CommandContext, args: {r: number, c: number}): void {
    context.runtime.dispatch(Operations.insertTable(args.r, args.c));
  }
}

export class TableActionCommand implements EditorCommand<{action: string, id?: string}> {
  execute(context: CommandContext, args: {action: string, id?: string}): void {
    context.runtime.dispatch(Operations.handleTableAction(args.action, args.id));
  }
}

export class InsertLinkCommand implements EditorCommand<string> {
  execute(context: CommandContext, url: string): void {
    context.runtime.dispatch(Operations.insertLink(url));
  }
}

export class RemoveLinkCommand implements EditorCommand<void> {
  execute(context: CommandContext, _args: void): void {
    context.runtime.dispatch(Operations.removeLink());
  }
}
