import {describe,expect,it} from "vitest";
import {compileFieldInstruction,evaluateFieldInstruction} from "@/core/document/fieldEvaluation.js";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
const seq=(raw:string,text="cached"):EditorParagraphNode=>({id:"if-p",type:"paragraph",runs:[
  {id:"b",text:"",kind:"fieldChar",fieldChar:{kind:"begin"}},
  {id:"i",text:"",kind:"fieldInstruction",fieldInstruction:raw},
  {id:"s",text:"",kind:"fieldChar",fieldChar:{kind:"separate"}},
  {id:"r",text,kind:"text"},
  {id:"e",text:"",kind:"fieldChar",fieldChar:{kind:"end"}},
]});
describe("F1 bounded literal IF",()=>{
 it.each([
  ['IF 2 > 1 "yes" "no"',"yes"],
  ['IF 2 <> 2 "yes" "no"',"no"],
  ['IF 1.5 <= 2 "ok" "bad"',"ok"],
  ['IF "PAGE" = "PAGE" "text" "other"',"text"],
  ['IF "PAGE" = 1 "yes" "no"',"no"],
  ['IF "Alpha" <> "Beta" "different" "same"',"different"],
  ['IF 2 = 2 "" "fallback"',""] ,
 ])("evaluates literal condition %s", (raw,expected)=>{
  expect(evaluateFieldInstruction(raw,{},"cached")).toMatchObject({status:"resolved",text:expected,dependencies:[{kind:"literal-condition"}]});
 });
 it.each([
  'IF PAGE = 1 "yes" "no"',
  'IF { PAGE } = 1 "yes" "no"',
  'IF 1 > 0 PAGE "no"',
  'IF "A" > "B" "yes" "no"',
  'IF 1 = 1 "yes" "no" \\* MERGEFORMAT',
  'IF 1 = 1 "yes"',
  'IF 1 = 1 "line\nbreak" "no"',
  'IF 1 = 1 "yes" "no" extra',
  'IF 1 = 1 "yes" "unterminated',
 ])("preserves unsupported or malformed %s",(raw)=>{
  expect(compileFieldInstruction(raw)).toBeUndefined();
  expect(evaluateFieldInstruction(raw,{},"cached").text).toBe("cached");
 });
 it("refreshes an unlocked complex scalar while retaining controls and locks",()=>{
  const p=seq('IF 3 >= 2 "active" "inactive"');
  const doc=createEditorDocument([p]);
  const original=createEditorStateFromDocument(doc);
  const changed=refreshBodyFieldCaches(original);
  expect(changed.status).toBe("updated");
  const after=getDocumentSections(changed.state.document)[0]!.blocks[0] as EditorParagraphNode;
  expect(after.runs.map(r=>r.text).join("")).toBe("active");
  expect(after.runs.filter(r=>r.kind!=="text")).toEqual(p.runs.filter(r=>r.kind!=="text"));
  expect(refreshBodyFieldCaches(changed.state).status).toBe("unchanged");
  const locked=seq('IF 3 >= 2 "active" "inactive"');
  locked.runs[0]={...locked.runs[0]!,fieldChar:{kind:"begin",fieldLock:true},kind:"fieldChar",text:""};
  expect(refreshBodyFieldCaches(createEditorStateFromDocument(createEditorDocument([locked]))).status).toBe("unchanged");
 });
});
