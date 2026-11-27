import {describe,expect,it,vi} from "vitest";
import {createEditorDocument,createEditorParagraph,createEditorStateFromDocument} from "@/core/editorState.js";
import {paragraphOffsetToPosition,type EditorState} from "@/core/model.js";
import {buildEssentialsFields} from "@/ui/app/essentials/fields.js";
import type {CreateEditorEssentialsPluginOptions} from "@/ui/app/essentials/types.js";
import {buildFieldsCommands} from "@/plugins/internal/essentialsCommandGroups/fields.js";
import {createActionCommandBuilder} from "@/plugins/internal/essentialsCommandBuilders.js";
import {CommandRegistry} from "@/core/commands/CommandRegistry.js";

describe("F4B4B INDEX public command bridge",()=>{
  it("dispatches typed commands, one transaction each, and respects read-only",()=>{
    const p=createEditorParagraph("Contratos");
    let state=createEditorStateFromDocument(createEditorDocument([p]));
    const pos=paragraphOffsetToPosition(p,9);
    state={...state,selection:{anchor:pos,focus:pos}};
    let readOnly=false;
    const history:EditorState[]=[];
    const reset=vi.fn(),focus=vi.fn();
    const options={
      state:()=>state,isReadOnly:()=>readOnly,
      resetTransactionGrouping:reset,clearPreferredColumn:vi.fn(),focusInput:focus,
      applyTransactionalState:(producer:(s:EditorState)=>EditorState)=>{
        const next=producer(state);
        if(next!==state){history.push(state);state=next;}
      },
    } as unknown as CreateEditorEssentialsPluginOptions;
    const fields=buildEssentialsFields(options);
    const registry=new CommandRegistry();
    const commands=buildFieldsCommands({fields,actionCommand:createActionCommandBuilder(()=>!readOnly)});
    for(const name of ["markIndexEntry","insertIndex","updateIndex"])registry.register(name,commands[name]!);
    expect(registry.canExecute("markIndexEntry")).toBe(true);
    expect(registry.canExecute("insertIndex")).toBe(false);
    expect(registry.execute("markIndexEntry",{path:[1]})).toBe(false);
    expect(history).toHaveLength(0);
    expect(registry.execute("markIndexEntry",{path:["Contratos"]})).toBe(true);
    expect(history).toHaveLength(1);
    expect(registry.canExecute("insertIndex")).toBe(true);
    expect(registry.execute("insertIndex",{locale:"pt-BR"})).toBe(true);
    expect(history).toHaveLength(2);
    expect(registry.canExecute("updateIndex")).toBe(true);
    expect(registry.execute("updateIndex")).toBe(false);
    expect(history).toHaveLength(2);
    expect(focus).toHaveBeenCalledTimes(2);
    readOnly=true;
    expect(registry.canExecute("updateIndex")).toBe(false);
    expect(()=>registry.execute("updateIndex")).toThrow("Command disabled");
    expect(history).toHaveLength(2);
  });
});
