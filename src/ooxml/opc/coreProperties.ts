import JSZip from "jszip";
import { DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocument, EditorOpcRelationship } from "@/core/model.js";
import { parseOpcRelationships, resolveOpcRelationships, serializeOpcRelationships,
  parseOpcContentTypes, serializeOpcContentTypes, OPC_ROOT_RELATIONSHIPS_PATH, OPC_CONTENT_TYPES_PATH } from "./packageXml.js";

export const CORE_PROPERTIES_NS="http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
const TERMS_NS="http://purl.org/dc/terms/";
const XSI_NS="http://www.w3.org/2001/XMLSchema-instance";
const XMLNS_NS="http://www.w3.org/2000/xmlns/";
const REL_TYPE="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
const CONTENT_TYPE="application/vnd.openxmlformats-package.core-properties+xml";
const DEFAULT_PATH="docProps/core.xml";
type Timestamps=NonNullable<EditorDocument["coreTimestamps"]>;
const elements=[
  {key:"created",ns:TERMS_NS,name:"created",prefix:"dcterms"},
  {key:"saved",ns:TERMS_NS,name:"modified",prefix:"dcterms"},
  {key:"printed",ns:CORE_PROPERTIES_NS,name:"lastPrinted",prefix:"cp"},
] as const;

/** Accept only timezone-qualified, valid W3CDTF date-time values. */
export function parseCoreTimestamp(raw:string):number|undefined{
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(raw.trim());
  if(!m)return undefined;
  const [,y,mo,d,h,mi,s,z]=m;
  const year=Number(y),month=Number(mo),day=Number(d);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const max=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
  if(year<1||!max||day<1||day>max||Number(h)>23||Number(mi)>59||Number(s)>59)return undefined;
  if(z!=="Z"&&(Number(z!.slice(1,3))>14||Number(z!.slice(4))>59||
     Number(z!.slice(1,3))===14&&Number(z!.slice(4))!==0))return undefined;
  const value=Date.parse(raw.trim());
  return Number.isFinite(value)?value:undefined;
}
function parseRoot(xml:string){
  if(xml.length>1_048_576||/<!DOCTYPE|<!ENTITY/i.test(xml))return undefined;
  try{
    const doc=new DOMParser().parseFromString(xml,"application/xml");
    const root=doc.documentElement;
    return root?.namespaceURI===CORE_PROPERTIES_NS&&root.localName==="coreProperties"?{doc,root}:undefined;
  }catch{return undefined;}
}
function children(root:XmlElement,ns:string,name:string):XmlElement[]{
  const found:XmlElement[]=[];
  for(let i=0;i<root.childNodes.length;i++){
    const child=root.childNodes[i];
    if(child?.nodeType===1){
      const e=child as XmlElement;
      if(e.namespaceURI===ns&&e.localName===name)found.push(e);
    }
  }
  return found;
}
export function parseCoreTimestamps(xml:string):Timestamps|undefined{
  const parsed=parseRoot(xml);
  if(!parsed)return undefined;
  const result:Timestamps={};
  for(const {key,ns,name} of elements){
    const found=children(parsed.root,ns,name);
    if(found.length!==1)continue;
    const node=found[0]!;
    if(Array.from({length:node.childNodes.length},(_,i)=>node.childNodes[i]).some(n=>n?.nodeType===1))continue;
    const value=parseCoreTimestamp(node.textContent??"");
    if(value!==undefined)result[key]=value;
  }
  return Object.keys(result).length?result:undefined;
}
async function relationships(zip:JSZip):Promise<EditorOpcRelationship[]>{
  return resolveOpcRelationships(null,parseOpcRelationships(await zip.file(OPC_ROOT_RELATIONSHIPS_PATH)?.async("string")));
}
function corePath(rels:EditorOpcRelationship[]):string|undefined{
  const core=rels.filter(r=>r.type===REL_TYPE);
  if(core.length!==1||core[0]!.targetMode==="External")return undefined;
  return core[0]!.resolvedTarget;
}
export async function readPackageCoreTimestamps(zip:JSZip):Promise<Timestamps|undefined>{
  const path=corePath(await relationships(zip));
  if(!path)return undefined;
  const xml=await zip.file(path)?.async("string");
  return xml?parseCoreTimestamps(xml):undefined;
}
function iso(value:number|undefined):string|undefined{
  if(value===undefined||!Number.isSafeInteger(value))return undefined;
  try{
    const text=new Date(value).toISOString();
    return parseCoreTimestamp(text)===value?text:undefined;
  }catch{return undefined;}
}

/** Merge ONLY explicit valid timestamps. Do not rewrite equal values, remove
 * other properties, follow external relations, or replace malformed parts. */
export async function writePackageCoreTimestamps(zip:JSZip,timestamps:Timestamps|undefined):Promise<boolean>{
  if(!timestamps||!elements.some(e=>iso(timestamps[e.key])!==undefined))return false;
  const rels=await relationships(zip);
  const related=rels.filter(r=>r.type===REL_TYPE);
  let path=corePath(rels);
  const creating=!related.length;
  if(creating){
    // An orphan part is not authority and must not be overwritten.
    if(zip.file(DEFAULT_PATH))return false;
    path=DEFAULT_PATH;
  }
  if(!path||(!creating&&!zip.file(path)))return false;
  const original=creating?undefined:await zip.file(path)?.async("string");
  const parsed=parseRoot(original??'<cp:coreProperties xmlns:cp="'+CORE_PROPERTIES_NS+'" xmlns:dcterms="'+TERMS_NS+'" xmlns:xsi="'+XSI_NS+'"/>');
  if(!parsed)return false;
  const {doc,root}=parsed;
  // An ambiguous property must not be overwritten.
  let changed=false;
  for(const {key,ns,name,prefix} of elements){
    const value=iso(timestamps[key]);
    if(!value)continue;
    const found=children(root,ns,name);
    if(found.length>1)continue;
    const prior=found[0];
    if(prior&&parseCoreTimestamp(prior.textContent??"")===timestamps[key])continue;
    if(prior&&Array.from({length:prior.childNodes.length},(_,i)=>prior.childNodes[i]).some(n=>n?.nodeType===1))continue;
    const node=prior??doc.createElementNS(ns,prefix+":"+name);
    if(!prior){
      node.setAttributeNS(XMLNS_NS,"xmlns:"+prefix,ns);
      root.appendChild(node);
    }
    node.textContent=value;
    if(ns===TERMS_NS){
      node.setAttributeNS(XMLNS_NS,"xmlns:dcterms",TERMS_NS);
      node.setAttributeNS(XMLNS_NS,"xmlns:xsi",XSI_NS);
      node.setAttributeNS(XSI_NS,"xsi:type","dcterms:W3CDTF");
    }
    changed=true;
  }
  if(!changed)return false;
  zip.file(path,new XMLSerializer().serializeToString(doc));
  if(creating){
    const ids=new Set(rels.map(r=>r.id));
    let id="rIdCoreProperties",i=1;
    while(ids.has(id))id="rIdCoreProperties"+i++;
    zip.file(OPC_ROOT_RELATIONSHIPS_PATH,serializeOpcRelationships([...rels,{id,type:REL_TYPE,target:path}]));
    const types=parseOpcContentTypes(await zip.file(OPC_CONTENT_TYPES_PATH)?.async("string"));
    types.overrides[path]=CONTENT_TYPE;
    zip.file(OPC_CONTENT_TYPES_PATH,serializeOpcContentTypes(types));
  }
  return true;
}

export async function applyPackageCoreTimestamps(buffer:ArrayBuffer,document:EditorDocument):Promise<ArrayBuffer>{
  if(!document.coreTimestamps)return buffer;
  const zip=await JSZip.loadAsync(buffer);
  return await writePackageCoreTimestamps(zip,document.coreTimestamps)?zip.generateAsync({type:"arraybuffer"}):buffer;
}
