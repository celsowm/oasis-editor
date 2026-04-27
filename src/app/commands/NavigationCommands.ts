import { EditorCommand, CommandContext } from "./EditorCommand.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { isTextBlock } from "../../core/document/BlockTypes.js";

export class EscapeCommand implements EditorCommand {
  execute(context: CommandContext): void {
    const state = context.runtime.getState();
    
    if (state.editingMode === "footnote" && state.editingFootnoteId) {
      // Exit footnote mode, return cursor to the footnote reference in body
      context.runtime.dispatch(Operations.setEditingMode("main"));
      const fnId = state.editingFootnoteId;
      
      for (const section of state.document.sections) {
        for (const block of section.children) {
          if (!isTextBlock(block)) continue;
          for (const run of block.children) {
            if (run.footnoteId === fnId) {
              const pos = {
                sectionId: section.id,
                blockId: block.id,
                inlineId: run.id,
                offset: 0,
              };
              context.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
              return;
            }
          }
        }
      }
    }

    if (state.editingMode !== "main") {
      context.runtime.dispatch(Operations.setEditingMode("main"));
      const section = state.document.sections[0];
      const firstBlock = section?.children[0];
      if (firstBlock && isTextBlock(firstBlock)) {
        const pos = {
          sectionId: section.id,
          blockId: firstBlock.id,
          inlineId: firstBlock.children[0]?.id || "",
          offset: 0,
        };
        context.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
      }
    }
  }
}

export class MoveCaretCommand implements EditorCommand {
  execute(context: CommandContext, key: string): void {
    context.runtime.dispatch(Operations.moveSelection(key));
  }
}
