import { describe, expect, it, vi } from "vitest";
import { createEditorDocument, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorState } from "@/core/model.js";
import { buildEssentialsFields } from "@/ui/app/essentials/fields.js";
import type { CreateEditorEssentialsPluginOptions } from "@/ui/app/essentials/types.js";
import { buildFieldsCommands } from "@/plugins/internal/essentialsCommandGroups/fields.js";
import { createActionCommandBuilder } from "@/plugins/internal/essentialsCommandBuilders.js";
import { createEmptyEditorHistoryState, applyEditorHistoryTransaction, takeEditorUndoStep, takeEditorRedoStep } from "@/ui/editorHistory.js";

describe("updateBodyFields command bridge",()=>{
  it("updates caches through exactly one transaction and restores them through history",()=>{
    const p:EditorParagraphNode={id:"page",type:"paragraph",runs:[
      {id:"field",kind:"field",field:{type:"PAGE"},text:"1"},
    ]};
    const base=createEditorDocument([p]);
    const section=getDocumentSections(base)[0]!;
    const initial=createEditorStateFromDocument({...base,sections:[{...section,pageNumbering:{start:10}}]});
    let state:EditorState=initial, history=createEmptyEditorHistoryState(), readOnly=false;
    const applyTransactionalState=vi.fn((producer:(current:EditorState)=>EditorState)=>{
      const next=producer(state);
      if(next===state)return;
      history=applyEditorHistoryTransaction(history,state,next);
      state=next;
    });
    const options={
      state:()=>state,isReadOnly:()=>readOnly,applyTransactionalState,
      resetTransactionGrouping:vi.fn(),clearPreferredColumn:vi.fn(),focusInput:vi.fn(),
    } as unknown as CreateEditorEssentialsPluginOptions;
    const fields=buildEssentialsFields(options);
    const commands=buildFieldsCommands({fields,actionCommand:createActionCommandBuilder(()=>!readOnly)});
    const command=commands.updateBodyFields!;
    expect(command.refresh?.(undefined,undefined)?.isEnabled).toBe(true);
    command.execute(undefined,undefined);
    const updated=state;
    expect((getDocumentSections(updated.document)[0]!.blocks[0] as EditorParagraphNode).runs[0]!.text).toBe("10");
    expect(applyTransactionalState).toHaveBeenCalledTimes(1);
    expect(history.undoStack).toEqual([initial]);
    const undo=takeEditorUndoStep(history,state)!;
    expect(undo.nextState).toBe(initial);
    const redo=takeEditorRedoStep(undo.history,undo.nextState)!;
    expect(redo.nextState).toBe(updated);
    command.execute(undefined,undefined);
    expect(history.undoStack).toHaveLength(1);
    readOnly=true;
    expect(command.refresh?.(undefined,undefined)?.isEnabled).toBe(false);
    fields.updateBodyFields?.();
    expect(applyTransactionalState).toHaveBeenCalledTimes(2);
  });
});
