import JSZip from "jszip";
import {DOMParser, XMLSerializer, type Element as XmlElement} from "@xmldom/xmldom";
import type {EditorDocument,EditorOpcRelationship} from "@/core/model.js";
import {CORE_PROPERTIES_NS} from "./coreProperties.js";
import {OPC_CONTENT_TYPES_PATH,OPC_ROOT_RELATIONSHIPS_PATH,
  parseOpcRelationships,resolveOpcRelationships,serializeOpcRelationships,
  parseOpcContentTypes,serializeOpcContentTypes} from "./packageXml.js";

/** Only directly-authenticated OPC metadata parts qualify as DOCPROPERTY data. */
export interface DocumentPropertyValues {
  core?:Record<string,string>;
  custom?:Record<string,string>;
}
const DC="http://purl.org/dc/elements/1.1/";
const CORE=CORE_PROPERTIES_NS;
const CUSTOM="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";
const VT="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes";
const XMLNS="http://www.w3.org/2000/xmlns/";
const CORE_REL="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
const CUSTOM_REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties";
const CORE_TYPE="application/vnd.openxmlformats-package.core-properties+xml";
const CUSTOM_TYPE="application/vnd.openxmlformats-officedocument.custom-properties+xml";
const MAX_XML=1_048_576,MAX_PROPERTIES=256,MAX_NAME=128,MAX_VALUE=4096;
const coreNames=[
  {key:"Title",ns:DC,tag:"title",prefix:"dc"},
  {key:"Subject",ns:DC,tag:"subject",prefix:"dc"},
  {key:"Author",ns:DC,tag:"creator",prefix:"dc"},
  {key:"Keywords",ns:CORE,tag:"keywords",prefix:"cp"},
  {key:"Comments",ns:DC,tag:"description",prefix:"dc"},
  {key:"Category",ns:CORE,tag:"category",prefix:"cp"},
  {key:"LastSavedBy",ns:CORE,tag:"lastModifiedBy",prefix:"cp"},
  {key:"RevisionNumber",ns:CORE,tag:"revision",prefix:"cp"},
  {key:"ContentStatus",ns:CORE,tag:"contentStatus",prefix:"cp"},
] as const;
const goodText=(text:string):boolean=>text.length<=MAX_VALUE&&!/[\u0000-\u001f\u007f]/.test(text);
const goodName=(name:string):boolean=>name.length>0&&name.length<=MAX_NAME&&
  /^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(name)&&
  !["__proto__","constructor","prototype"].includes(name.toLowerCase());
const children=(root:XmlElement,ns:string,tag:string):XmlElement[]=>{
  const result:XmlElement[]=[];
  for(let i=0;i<root.childNodes.length;i++){
    const node=root.childNodes[i];
    if(node?.nodeType===1){
      const el=node as XmlElement;
      if(el.namespaceURI===ns&&el.localName===tag)result.push(el);
    }
  }
  return result;
};
const safeRoot=(xml:string,ns:string,tag:string)=>{
  if(xml.length>MAX_XML||/<!DOCTYPE|<!ENTITY/i.test(xml))return undefined;
  try{
    const doc=new DOMParser().parseFromString(xml,"application/xml");
    const root=doc.documentElement;
    return root?.namespaceURI===ns&&root.localName===tag?{doc,root}:undefined;
  }catch{return undefined;}
};
const simpleValue=(e:XmlElement):string|undefined=>{
  for(let i=0;i<e.childNodes.length;i++)if(e.childNodes[i]?.nodeType===1)return undefined;
  const text=e.textContent??"";
  return goodText(text)?text:undefined;
};
const validTypedValue=(node:XmlElement):string|undefined=>{
  if(node.namespaceURI!==VT)return undefined;
  const value=simpleValue(node);
  if(value===undefined)return undefined;
  switch(node.localName){
    case "lpwstr":case "lpstr":return value;
    case "bool":return /^(true|1)$/i.test(value)?"true":/^(false|0)$/i.test(value)?"false":undefined;
    case "i4":case "int":case "i8":case "ui4":case "ui8":
      return /^-?(0|[1-9]\d{0,15})$/.test(value)&&Number.isSafeInteger(Number(value))?value:undefined;
    case "r8":case "r4":
      return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d{1,3})?$/.test(value)&&Number.isFinite(Number(value))?value:undefined;
    default:return undefined;
  }
};
export function parseCoreDocumentProperties(xml:string):Record<string,string>|undefined{
  const root=safeRoot(xml,CORE,"coreProperties")?.root;
  if(!root)return undefined;
  const values:Record<string,string>=Object.create(null);
  for(const item of coreNames){
    const nodes=children(root,item.ns,item.tag);
    if(nodes.length!==1)continue;
    const text=simpleValue(nodes[0]!);
    if(text!==undefined)values[item.key]=text;
  }
  return Object.keys(values).length?values:undefined;
}
export function parseCustomDocumentProperties(xml:string):Record<string,string>|undefined{
  const root=safeRoot(xml,CUSTOM,"Properties")?.root;
  if(!root)return undefined;
  const entries=children(root,CUSTOM,"property");
  if(entries.length>MAX_PROPERTIES)return undefined;
  const values=new Map<string,{name:string;value:string}|null>();
  const seenPid=new Set<string>();
  for(const e of entries){
    const name=e.getAttribute("name");
    const pid=e.getAttribute("pid");
    if(!name||!goodName(name)||!pid||!/^\d{1,9}$/.test(pid)||Number(pid)<2||seenPid.has(pid))continue;
    seenPid.add(pid);
    const candidates:Array<XmlElement>=[];
    for(let i=0;i<e.childNodes.length;i++)if(e.childNodes[i]?.nodeType===1)candidates.push(e.childNodes[i] as XmlElement);
    const value=candidates.length===1?validTypedValue(candidates[0]!):undefined;
    const key=name.toLowerCase();
    if(values.has(key))values.set(key,null);
    else values.set(key,value===undefined?null:{name,value});
  }
  const result:Record<string,string>=Object.create(null);
  for(const value of values.values())if(value)result[value.name]=value.value;
  return Object.keys(result).length?result:undefined;
}
function getPart(rels:EditorOpcRelationship[],type:string):string|undefined{
  const matched=rels.filter(r=>r.type===type);
  return matched.length===1&&matched[0]?.targetMode!=="External"?matched[0]?.resolvedTarget:undefined;
}
async function rootRelationships(zip:JSZip):Promise<EditorOpcRelationship[]>{
  return resolveOpcRelationships(null,parseOpcRelationships(await zip.file(OPC_ROOT_RELATIONSHIPS_PATH)?.async("string")));
}
export async function readPackageDocumentProperties(zip:JSZip):Promise<DocumentPropertyValues|undefined>{
  const rels=await rootRelationships(zip);
  const corePath=getPart(rels,CORE_REL),customPath=getPart(rels,CUSTOM_REL);
  const [coreXml,customXml]=await Promise.all([
    corePath?zip.file(corePath)?.async("string"):undefined,
    customPath?zip.file(customPath)?.async("string"):undefined,
  ]);
  const core=coreXml?parseCoreDocumentProperties(coreXml):undefined;
  const custom=customXml?parseCustomDocumentProperties(customXml):undefined;
  return core||custom?{...(core?{core}:{}),...(custom?{custom}:{})}:undefined;
}
/** Reject shadowed or ambiguous keys across built-in and custom spaces. */
export function resolveDocumentProperty(snapshot:DocumentPropertyValues|undefined,name:string):string|undefined{
  if(!snapshot||!goodName(name))return undefined;
  const normalized=name.toLowerCase();
  let found:string|undefined;
  let matches=0;
  for(const values of [snapshot.core,snapshot.custom]){
    for(const [key,value] of Object.entries(values??{})){
      if(key.toLowerCase()!==normalized)continue;
      matches++;
      if(typeof value!=="string"||!goodText(value))return undefined;
      found=value;
    }
  }
  return matches===1?found:undefined;
}
function validateValues(values:Record<string,string>|undefined,kind:"core"|"custom"):boolean{
  if(!values)return true;
  const entries=Object.entries(values),seen=new Set<string>();
  if(entries.length>MAX_PROPERTIES)return false;
  for(const [name,value] of entries){
    const normalized=name.toLowerCase();
    if(!goodName(name)||seen.has(normalized)||typeof value!=="string"||!goodText(value))return false;
    if(kind==="core"&&!coreNames.some(x=>x.key.toLowerCase()===normalized))return false;
    seen.add(normalized);
  }
  return true;
}
function writeCore(zip:JSZip,rels:EditorOpcRelationship[],core:Record<string,string>|undefined):boolean{
  // This function is synchronous only for newly-created canonical parts.
  if(!core||!Object.keys(core).length)return false;
  const path=getPart(rels,CORE_REL);
  if(path||rels.some(x=>x.type===CORE_REL)||zip.file("docProps/core.xml"))return false;
  const doc=new DOMParser().parseFromString('<cp:coreProperties xmlns:cp="'+CORE+'" xmlns:dc="'+DC+'"/>',"application/xml");
  const root=doc.documentElement;
  if(!root)return false;
  for(const item of coreNames){
    const value=Object.entries(core).find(([name])=>name.toLowerCase()===item.key.toLowerCase())?.[1];
    if(value===undefined)continue;
    const el=doc.createElementNS(item.ns,item.prefix+":"+item.tag);
    el.setAttributeNS(XMLNS,"xmlns:"+item.prefix,item.ns);
    el.textContent=value;
    root.appendChild(el);
  }
  zip.file("docProps/core.xml",new XMLSerializer().serializeToString(doc));
  return true;
}
function writeCustom(zip:JSZip,rels:EditorOpcRelationship[],custom:Record<string,string>|undefined):boolean{
  if(!custom||!Object.keys(custom).length)return false;
  if(getPart(rels,CUSTOM_REL)||rels.some(x=>x.type===CUSTOM_REL)||zip.file("docProps/custom.xml"))return false;
  const doc=new DOMParser().parseFromString('<Properties xmlns="'+CUSTOM+'" xmlns:vt="'+VT+'"/>',"application/xml");
  const root=doc.documentElement;
  if(!root)return false;
  let pid=2;
  for(const [name,value] of Object.entries(custom)){
    const entry=doc.createElementNS(CUSTOM,"property");
    entry.setAttribute("name",name);
    entry.setAttribute("pid",String(pid++));
    entry.setAttribute("fmtid","{D5CDD505-2E9C-101B-9397-08002B2CF9AE}");
    const text=doc.createElementNS(VT,"vt:lpwstr");
    text.textContent=value;
    entry.appendChild(text);
    root.appendChild(entry);
  }
  zip.file("docProps/custom.xml",new XMLSerializer().serializeToString(doc));
  return true;
}
/** Canonical writer only: never patches an imported OPC source in place.
 * Existing unknown or ambiguous property parts are preserved untouched. */
export async function applyCanonicalDocumentProperties(buffer:ArrayBuffer,document:EditorDocument):Promise<ArrayBuffer>{
  const values=document.documentProperties;
  if(!values||(!values.core&&!values.custom)||!validateValues(values.core,"core")||!validateValues(values.custom,"custom"))return buffer;
  const zip=await JSZip.loadAsync(buffer);
  const rels=await rootRelationships(zip);
  const core=writeCore(zip,rels,values.core);
  const custom=writeCustom(zip,rels,values.custom);
  if(!core&&!custom)return buffer;
  const existingIds=new Set(rels.map(r=>r.id));
  const nextId=(label:string):string=>{
    let candidate="rId"+label,i=0;
    while(existingIds.has(candidate))candidate="rId"+label+(++i);
    existingIds.add(candidate);
    return candidate;
  };
  if(core)rels.push({id:nextId("CoreProps"),type:CORE_REL,target:"docProps/core.xml"});
  if(custom)rels.push({id:nextId("CustomProps"),type:CUSTOM_REL,target:"docProps/custom.xml"});
  zip.file(OPC_ROOT_RELATIONSHIPS_PATH,serializeOpcRelationships(rels));
  const types=parseOpcContentTypes(await zip.file(OPC_CONTENT_TYPES_PATH)?.async("string"));
  if(core)types.overrides["docProps/core.xml"]=CORE_TYPE;
  if(custom)types.overrides["docProps/custom.xml"]=CUSTOM_TYPE;
  zip.file(OPC_CONTENT_TYPES_PATH,serializeOpcContentTypes(types));
  return zip.generateAsync({type:"arraybuffer"});
}
