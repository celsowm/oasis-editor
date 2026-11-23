import type {EditorDocument,EditorLayoutDocument,EditorParagraphNode,EditorNamedStyle} from "@/core/model.js";
import {getDocumentSections,getParagraphLength} from "@/core/model.js";
import {BUILTIN_STYLES,semanticBuiltinStyle} from "@/core/model/builtinStyles.js";

type Entry={paragraphId:string;ordinal:number;pageIndex:number;style:string;text:string};
const normalize=(value:string)=>value.trim().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().replace(/[\s_-]+/g,"");
const cleanText=(p:EditorParagraphNode):string|undefined=>{
  if(p.sdtWrappers?.length||p.numberingRevision||p.dropCap||
    p.runs.some(r=>r.kind!=="text"||!!r.revision||!!r.revisionRangeMarker||
      !!r.sdtWrappers?.length||!!r.styles?.hidden||!!r.styles?.rtl))return undefined;
  const text=p.runs.map(r=>r.text).join("").trim();
  return text&&text.length<=65536&&!/[\r\n\t]/.test(text)?text:undefined;
};
const builtin=(id:string):string|undefined=>{
  const match=/^(?:heading|titulo)\s*([1-9])$/i.exec(normalize(id));
  return match?"heading"+match[1]:undefined;
};

/** Read-only lookup of paragraph styles and source-certified paginated text.
 * No DOM, layout mutations, speculative style inheritance, or evaluation of
 * a nested field's cached output. Duplicate style names remain ambiguous. */
export function createStyleRefIndex(document:EditorDocument,layout?:EditorLayoutDocument){
  const styles=document.styles??{};
  const aliases=new Map<string,string|null>();
  const add=(alias:string,identity:string)=>{
    const key=normalize(alias);
    if(!key)return;
    const previous=aliases.get(key);
    if(previous===undefined)aliases.set(key,identity);
    else if(previous!==identity)aliases.set(key,null);
  };
  for(let level=1;level<=9;level++){
    const identity="builtin:heading"+level;
    add("Heading "+level,identity);
    add("Título "+level,identity);
    add("heading"+level,identity);
    add(String(level),identity);
  }
  const identity=(id:string)=>{
    const definition=styles[id]??Object.values(styles).find(s=>s.id===id);
    const builtinId=definition&&semanticBuiltinStyle(definition);
    const heading=builtinId??(!definition||definition.customStyle!==true?builtin(id):undefined);
    return heading?"builtin:"+heading:"id:"+id;
  };
  for(const style of Object.values(styles)){
    if(style.type!=="paragraph")continue;
    const id=identity(style.id);
    add(style.id,id);add(style.name,id);
    if(semanticBuiltinStyle(style)==="heading1")add("Heading 1",id);
  }
  const paragraphs:EditorParagraphNode[]=[];
  let unsupported=false;
  for(const section of getDocumentSections(document)){
    for(const block of section.blocks){
      if(block.type!=="paragraph"){unsupported=true;continue;}
      paragraphs.push(block);
    }
  }
  const indexed=new Map<string,number>();
  paragraphs.forEach((p,i)=>{
    if(indexed.has(p.id))unsupported=true;
    indexed.set(p.id,i);
    if(p.style?.styleId&&!styles[p.style.styleId])add(p.style.styleId,identity(p.style.styleId));
  });
  const pages=layout?.pages??[];
  if(!layout||!pages.every((p,i)=>p.index===i))unsupported=true;
  const located=new Map<string,number>();
  for(const page of pages){
    for(const block of page.blocks){
      const paragraph=block.sourceBlock;
      if(paragraph.type!=="paragraph"||!indexed.has(paragraph.id)||!block.layout)continue;
      const text=paragraph.runs.map(r=>r.text).join("");
      const start=block.layout.startOffset??0;
      const end=block.layout.endOffset??(start+block.layout.text.length);
      if(start!==0||end!==getParagraphLength(paragraph)||block.layout.text!==text){
        located.set(paragraph.id,-1);
        continue;
      }
      if(located.has(paragraph.id))located.set(paragraph.id,-1);
      else located.set(paragraph.id,page.index);
    }
  }
  const entries:Entry[]=[];
  const unqualified=new Set<string>();
  for(const [ordinal,p] of paragraphs.entries()){
    const styleId=p.style?.styleId;
    if(!styleId)continue;
    const key=identity(styleId);
    const value=cleanText(p);
    const pageIndex=located.get(p.id);
    if(unsupported||!value||pageIndex===undefined||pageIndex<0){
      unqualified.add(key);continue;
    }
    entries.push({paragraphId:p.id,ordinal,pageIndex,style:key,text:value});
  }
  const target=(name:string):string|undefined=>{
    const result=aliases.get(normalize(name));
    return result===null?undefined:result;
  };
  const forBody=(paragraphId:string,name:string,_lastOnPage=false):string|undefined=>{
    if(unsupported)return undefined;
    const requested=target(name),ordinal=indexed.get(paragraphId);
    if(!requested||unqualified.has(requested)||ordinal===undefined||!located.has(paragraphId))return undefined;
    return entries.filter(e=>e.style===requested&&e.ordinal<ordinal)
      .at(-1)?.text;
  };
  const forPage=(pageIndex:number,name:string,lastOnPage=false):string|undefined=>{
    if(unsupported||!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=pages.length)return undefined;
    const requested=target(name);
    if(!requested||unqualified.has(requested))return undefined;
    const matching=entries.filter(e=>e.style===requested);
    const current=matching.filter(e=>e.pageIndex===pageIndex);
    if(current.length)return (lastOnPage?current.at(-1):current[0])!.text;
    // The most recent earlier heading is the conservative running header.
    // Do not manufacture a result from a later page or another story.
    return matching.filter(e=>e.pageIndex<pageIndex).at(-1)?.text;
  };
  return {forBody,forPage};
}
