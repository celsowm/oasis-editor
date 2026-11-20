import { describe,expect,it } from "vitest";
import { evaluateFieldInstruction } from "@/core/document/fieldEvaluation.js";
import { createEditorDocument,createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections,type EditorParagraphNode } from "@/core/model.js";
import { refreshBodyFieldCaches } from "@/layoutProjection/bodyFieldCacheRefresh.js";

describe("temporal OOXML fields",()=>{
  const now=Date.UTC(2026,10,9,1,5,7);
  const temporal={now,created:Date.UTC(2020,0,2),saved:Date.UTC(2025,5,6),timeZone:"America/Sao_Paulo",locale:"pt-BR" as const};
  it("uses explicit zone, Gregorian calendar, localized names and quoted literals",()=>{
    const context={temporal};
    expect(evaluateFieldInstruction('DATE \\@ "dd/MM/yyyy"',context,"old").text).toBe("08/11/2026");
    expect(evaluateFieldInstruction('TIME \\@ "HH:mm:ss"',context,"old").text).toBe("22:05:07");
    expect(evaluateFieldInstruction('DATE \\@ "d \'de\' MMMM \'de\' yyyy"',context,"old").text).toBe("8 de novembro de 2026");
    expect(evaluateFieldInstruction('TIME \\@ "h:mm AM/PM"',context,"old").text).toBe("10:05 PM");
  });
  it("distinguishes document timestamps from current time and preserves absent ones",()=>{
    const context={temporal:{...temporal,timeZone:"UTC"}};
    expect(evaluateFieldInstruction("CREATEDATE",context,"old")).toMatchObject({text:"02/01/2020",dependencies:[{kind:"created"}]});
    expect(evaluateFieldInstruction("SAVEDATE",context,"old").text).toBe("06/06/2025");
    expect(evaluateFieldInstruction("PRINTDATE",context,"old")).toMatchObject({status:"preserved",reason:"unresolved",text:"old"});
    expect(evaluateFieldInstruction("DATE",{},"old").text).toBe("old");
    expect(evaluateFieldInstruction("DATE",context,"old",true).text).toBe("old");
    expect(evaluateFieldInstruction("TIME",{temporal:{now:NaN}},"old").text).toBe("old");
    expect(evaluateFieldInstruction("TIME",{temporal:{now,timeZone:"Not/AZone"}},"old").text).toBe("old");
    for(const raw of ['DATE \\@ "yyyyy"', 'TIME \\@ "HH:mm q"', 'DATE \\@ "d \'bad"', 'DATE \\* MERGEFORMAT']){
      expect(evaluateFieldInstruction(raw,context,"old")).toMatchObject({status:"preserved",text:"old"});
    }
  });
  it("uses one instant for explicit refresh and preserves locked and absent metadata",()=>{
    const p:EditorParagraphNode={id:"p",type:"paragraph",runs:[{id:"date",kind:"field",field:{type:"DATE",dateFormat:"dd/MM/yyyy"},text:"1"}]};
    function complex(id:string,instruction:string,locked=false):EditorParagraphNode{
      return {id,type:"paragraph",runs:[
        {id:id+":b",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked}},
        {id:id+":i",kind:"fieldInstruction",text:"",fieldInstruction:instruction},
        {id:id+":s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
        {id:id+":r",kind:"text",text:"old"},
        {id:id+":e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
      ]};
    }
    const doc=createEditorDocument([p,complex("time",'TIME \\@ "HH:mm"'),complex("locked","DATE",true),complex("print","PRINTDATE")]);
    const original=createEditorStateFromDocument(doc);
    const result=refreshBodyFieldCaches(original,undefined,"all",temporal);
    expect(result.status).toBe("updated");
    expect(result.updatedFields).toBe(2);
    const ps=getDocumentSections(result.state.document)[0]!.blocks as EditorParagraphNode[];
    expect(ps.map(p=>p.runs.map(r=>r.text).join(""))).toEqual(["08/11/2026","22:05","old","old"]);
    expect(refreshBodyFieldCaches(result.state,undefined,"all",temporal).status).toBe("unchanged");
  });
});
