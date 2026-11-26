import type {EditorDocument,EditorLayoutDocument} from "@/core/model.js";
import {parseFieldInstruction} from "@/ooxml/word/fieldInstruction.js";
import {createDocumentFieldContext} from "./fieldDocumentContext.js";
import {collectXeOccurrences,resolveXePointPage,type XePage} from "./xeEntries.js";

export interface IndexSettings {
  identifier?:string;
  locale?:string;
  entrySeparator:string;
  pageSeparator:string;
  crossReferenceSeparator:string;
}
export interface IndexPageReference extends XePage {
  bold:boolean;
  italic:boolean;
}
export interface IndexEntryPlan {
  path:readonly string[];
  pages:IndexPageReference[];
  crossReferences:string[];
}
export interface IndexPlan {
  settings:IndexSettings;
  locale:string;
  /** Preorder: parents precede descendants, even without own references. */
  entries:IndexEntryPlan[];
}
const languageIds:Readonly<Record<string,string>>={
  "1033":"en-US","2057":"en-GB","1046":"pt-BR","2070":"pt-PT",
  "1034":"es-ES","1036":"fr-FR","1031":"de-DE",
};
function supportedLocale(value:string):string|undefined{
  if(!/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/.test(value))return undefined;
  try{
    const locale=Intl.getCanonicalLocales(value)[0];
    return locale&&Intl.Collator.supportedLocalesOf([locale]).length?locale:undefined;
  }catch{return undefined;}
}
/** Flat indented, one-column INDEX subset. Preserve unsupported instructions.
 * Word-specific default identifier selection differs from ISO/IEC 29500.
 * A locale must be explicit in the field or supplied by a qualified caller.
 */
export function parseIndexInstruction(raw:string):IndexSettings|undefined{
  const parsed=parseFieldInstruction(raw);
  if(parsed.error||parsed.command!=="INDEX")return undefined;
  const settings:IndexSettings={entrySeparator:", ",pageSeparator:", ",crossReferenceSeparator:". "};
  const args=parsed.tokens.slice(1),seen=new Set<string>();
  for(let i=0;i<args.length;i++){
    const token=args[i]!;
    if(token.kind!=="switch")return undefined;
    const sw=token.value.toLowerCase();
    if(seen.has(sw))return undefined;
    seen.add(sw);
    const arg=args[++i];
    if(!arg||arg.kind==="switch")return undefined;
    if(sw==="f"){
      if(!/^[A-Za-z]$/.test(arg.value))return undefined;
      settings.identifier=arg.value;
    }else if(sw==="z"){
      const locale=supportedLocale(languageIds[arg.value]??arg.value);
      if(!locale)return undefined;
      settings.locale=locale;
    }else if(sw==="c"){
      if(arg.value!=="1")return undefined;
    }else if(sw==="e"||sw==="l"||sw==="k"){
      if(arg.kind!=="quoted"||arg.value.length>15||/[\u0000-\u001f\u007f]/.test(arg.value))return undefined;
      if(sw==="e")settings.entrySeparator=arg.value;
      else if(sw==="l")settings.pageSeparator=arg.value;
      else settings.crossReferenceSeparator=arg.value;
    }else return undefined;
  }
  return settings;
}
interface MutableNode {
  label:string;
  path:string[];
  children:Map<string,MutableNode>;
  pages:Map<number,IndexPageReference>;
  crossReferences:Set<string>;
}

/** Read-only INDEX plan. Exact authored paths are grouped; ambiguous
 * case/canonical-equivalent sibling labels fail closed. Distinct physical
 * pages must never be deduplicated just because printed labels repeat.
 */
export function buildIndexPlan(document:EditorDocument,layout:EditorLayoutDocument,raw:string,documentLocale?:string):IndexPlan|undefined{
  const settings=parseIndexInstruction(raw);
  if(!settings)return undefined;
  const locale=settings.locale??(documentLocale?supportedLocale(documentLocale):undefined);
  if(!locale)return undefined;
  const occurrences=collectXeOccurrences(document);
  if(!occurrences)return undefined;
  const context=createDocumentFieldContext(document,layout);
  const collator=new Intl.Collator(locale,{usage:"sort",sensitivity:"accent",numeric:false,ignorePunctuation:false});
  const roots=new Map<string,MutableNode>();
  let nodeCount=0;
  for(const entry of occurrences){
    if(entry.identifier!==settings.identifier){
      // Do not silently guess case semantics for explicit identifiers.
      if(entry.identifier!==undefined&&settings.identifier!==undefined&&
        entry.identifier.toUpperCase()===settings.identifier.toUpperCase())return undefined;
      continue;
    }
    // Semicolon introduces custom sort text in Word; not plain display text.
    if(entry.path.some(p=>p.includes(";")||p!==p.trim()))return undefined;
    if(entry.reference.kind==="bookmarkRange")return undefined;
    let children=roots,node:MutableNode|undefined;
    const path:string[]=[];
    for(const label of entry.path){
      path.push(label);
      node=children.get(label);
      if(!node){
        if(++nodeCount>8192)return undefined;
        node={label,path:[...path],children:new Map(),pages:new Map(),crossReferences:new Set()};
        children.set(label,node);
      }
      children=node.children;
    }
    if(!node)return undefined;
    if(entry.reference.kind==="crossReference"){
      node.crossReferences.add(entry.reference.text);
      continue;
    }
    const page=resolveXePointPage(document,layout,entry,context);
    if(!page)return undefined;
    const reference={...page,bold:entry.boldPage,italic:entry.italicPage};
    const prior=node.pages.get(page.physicalPageIndex);
    if(prior&&(prior.label!==reference.label||prior.bold!==reference.bold||prior.italic!==reference.italic))
      return undefined;
    node.pages.set(page.physicalPageIndex,reference);
  }
  const entries:IndexEntryPlan[]=[];
  function visit(nodes:Map<string,MutableNode>):boolean{
    const ordered=[...nodes.values()].sort((a,b)=>collator.compare(a.label,b.label));
    for(let i=1;i<ordered.length;i++)if(collator.compare(ordered[i-1]!.label,ordered[i]!.label)===0)return false;
    for(const node of ordered){
      // Combining page lists and cross-reference text on one line, or several
      // distinct cross references, needs an actual Word oracle before refresh.
      if(node.crossReferences.size>1||(node.crossReferences.size&&node.pages.size))return false;
      entries.push({path:node.path,pages:[...node.pages.values()].sort((a,b)=>a.physicalPageIndex-b.physicalPageIndex),
        crossReferences:[...node.crossReferences]});
      if(!visit(node.children))return false;
    }
    return true;
  }
  return visit(roots)?{settings,locale,entries}:undefined;
}
