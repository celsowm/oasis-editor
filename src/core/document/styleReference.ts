import type {EditorDocument,EditorLayoutDocument,EditorParagraphNode} from "@/core/model.js";
import {buildListLabels,getDocumentSections,getParagraphLength} from "@/core/model.js";
import {semanticBuiltinStyle} from "@/core/model/builtinStyles.js";

export type StyleRefOutput="text"|"number"|"position";
export interface StyleRefOptions {
  output?:StyleRefOutput;
  offset?:number;
  zone?:"header"|"footer";
  locale?:"en-US"|"pt-BR";
}
type Entry={paragraphId:string;ordinal:number;start:number;pageIndex:number;style:string;text:string;number?:string};
const numbered=(raw:string|undefined):string|undefined=>{
  if(!raw)return undefined;
  const label=raw.replace(/[.)]+$/,"");
  return /^[0-9A-Za-z]+(?:[.\-][0-9A-Za-z]+)*$/.test(label)?label:undefined;
};
const relative=(direction:"above"|"below",locale?:StyleRefOptions["locale"]):string=>
  locale==="pt-BR"?(direction==="above"?"acima":"abaixo"):direction;
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
    if(style.type==="table")continue;
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
  const labels=buildListLabels(document);
  const entries:Entry[]=[];
  const unqualified=new Set<string>();
  for(const [ordinal,p] of paragraphs.entries()){
    const pageIndex=located.get(p.id);
    const sound=!unsupported&&pageIndex!==undefined&&pageIndex>=0;
    const number=p.list?.kind==="ordered"?numbered(labels.get(p.id)):undefined;
    const emit=(style:string,start:number,text:string|undefined):void=>{
      if(!sound||!text||text.length>65536||/[\r\n\t]/.test(text)){
        unqualified.add(style);return;
      }
      entries.push({paragraphId:p.id,ordinal,start,pageIndex:pageIndex!,style,text,number});
    };
    const styleId=p.style?.styleId;
    if(styleId){
      const style=styles[styleId]??Object.values(styles).find(s=>s.id===styleId);
      if(!style||style.type==="paragraph")emit(identity(styleId),0,cleanText(p));
    }
    // Consecutive text runs with one character style form one source phrase.
    // A field result elsewhere in the paragraph cannot become part of it.
    let offset=0;
    for(let i=0;i<p.runs.length;){
      const run=p.runs[i]!;
      const styleId=run.styles?.styleId;
      const definition=styleId?(styles[styleId]??Object.values(styles).find(s=>s.id===styleId)):undefined;
      if(definition?.type!=="character"){offset+=run.text.length;i++;continue;}
      const key=identity(definition.id),start=offset;
      let phrase="",valid=true;
      while(i<p.runs.length){
        const next=p.runs[i]!,other=next.styles?.styleId;
        const named=other?(styles[other]??Object.values(styles).find(s=>s.id===other)):undefined;
        if(named?.type!=="character"||identity(named.id)!==key)break;
        phrase+=next.text;
        if(next.kind!=="text"||next.revision||next.revisionRangeMarker||next.sdtWrappers?.length||
          next.styles?.hidden||next.styles?.rtl)valid=false;
        offset+=next.text.length;i++;
      }
      emit(key,start,valid?phrase.trim():undefined);
    }
  }
  entries.sort((a,b)=>a.ordinal-b.ordinal||a.start-b.start);
  const target=(name:string):string|undefined=>{
    const result=aliases.get(normalize(name));
    return result===null?undefined:result;
  };
  const render=(entry:Entry|undefined,opts:StyleRefOptions,side:"above"|"below"):string|undefined=>{
    if(!entry)return undefined;
    if(opts.output==="number")return entry.number;
    if(opts.output==="position")return relative(side,opts.locale);
    return entry.text;
  };
  const forBody=(paragraphId:string,name:string,lastOnPage=false,opts:StyleRefOptions={}):string|undefined=>{
    if(unsupported)return undefined;
    const requested=target(name),ordinal=indexed.get(paragraphId),pageIndex=located.get(paragraphId);
    if(!requested||unqualified.has(requested)||ordinal===undefined||
      pageIndex===undefined||pageIndex<0)return undefined;
    const offset=opts.offset??0;
    if(!Number.isInteger(offset)||offset<0)return undefined;
    const matching=entries.filter(e=>e.style===requested);
    if(lastOnPage){
      const onPage=matching.filter(e=>e.pageIndex===pageIndex);
      if(onPage.length){
        const entry=onPage.at(-1)!;
        const earlier=entry.ordinal<ordinal||(entry.ordinal===ordinal&&entry.start<offset);
        return render(entry,opts,earlier?"above":"below");
      }
    }
    const earlier=matching.filter(e=>e.ordinal<ordinal||(e.ordinal===ordinal&&e.start<offset)).at(-1);
    if(earlier)return render(earlier,opts,"above");
    const later=matching.find(e=>e.ordinal>ordinal||(e.ordinal===ordinal&&e.start>=offset));
    return render(later,opts,"below");
  };
  const forPage=(pageIndex:number,name:string,lastOnPage=false,opts:StyleRefOptions={}):string|undefined=>{
    if(unsupported||!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=pages.length)return undefined;
    const requested=target(name);
    if(!requested||unqualified.has(requested))return undefined;
    const matching=entries.filter(e=>e.style===requested);
    const onPage=matching.filter(e=>e.pageIndex===pageIndex);
    const entry=onPage.length?(lastOnPage?onPage.at(-1):onPage[0]):
      matching.filter(e=>e.pageIndex<pageIndex).at(-1);
    return render(entry,opts,opts.zone==="footer"?"above":"below");
  };
  return {forBody,forPage};
}
