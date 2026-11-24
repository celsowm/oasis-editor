import {DOMParser, type Element as XmlElement} from "@xmldom/xmldom";
import {WORD_NS} from "@/import/docx/xmlHelpers.js";
import {escapeXml} from "@/export/docx/xmlUtils.js";

/** Bounded plain-text Word w:docVars; never executable expressions. */
const MAX_XML=1_048_576;
const MAX_COUNT=256;
const MAX_NAME=128;
const MAX_VALUE=4096;
function validName(name:string):boolean{
  return name.length>0&&name.length<=MAX_NAME&&
    /^[\p{L}][\p{L}\p{N}_ .-]*$/u.test(name);
}
function validValue(value:string):boolean{
  return value.length<=MAX_VALUE&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
}
function children(root:XmlElement,ns:string,local:string):XmlElement[]{
  const out:XmlElement[]=[];
  for(let i=0;i<root.childNodes.length;i++){
    const n=root.childNodes[i];
    if(n?.nodeType===1){
      const e=n as XmlElement;
      if(e.namespaceURI===ns&&e.localName===local)out.push(e);
    }
  }
  return out;
}
export function readDocumentVariables(xml:string|null):Record<string,string>|undefined{
  if(!xml||xml.length>MAX_XML||/<!DOCTYPE|<!ENTITY/i.test(xml))return undefined;
  try{
    const root=new DOMParser().parseFromString(xml,"application/xml").documentElement;
    if(!root||root.namespaceURI!==WORD_NS||root.localName!=="settings")return undefined;
    const groups=children(root,WORD_NS,"docVars");
    if(groups.length!==1)return undefined;
    const entries=children(groups[0]!,WORD_NS,"docVar");
    if(entries.length>MAX_COUNT)return undefined;
    const names=new Map<string,{name:string;value:string}|null>();
    for(const e of entries){
      const name=e.getAttributeNS(WORD_NS,"name");
      const value=e.getAttributeNS(WORD_NS,"val");
      if(name===null||value===null||!validName(name)||!validValue(value))continue;
      const id=name.toLowerCase();
      if(id==="__proto__"||id==="constructor"||id==="prototype")continue;
      if(names.has(id))names.set(id,null);
      else names.set(id,{name,value});
    }
    const result:Record<string,string>=Object.create(null);
    for(const entry of names.values())if(entry)result[entry.name]=entry.value;
    return Object.keys(result).length?result:undefined;
  }catch{return undefined;}
}

/** Canonical serialization rejects ambiguous case-insensitive names. */
export function serializeDocumentVariables(variables:Readonly<Record<string,string>>|undefined):string{
  if(!variables)return "";
  const entries=Object.entries(variables);
  if(entries.length>MAX_COUNT)return "";
  const seen=new Set<string>();
  const output:string[]=[];
  for(const [name,value] of entries){
    if(!validName(name)||typeof value!=="string"||!validValue(value))return "";
    const id=name.toLowerCase();
    if(seen.has(id)||id==="__proto__"||id==="prototype"||id==="constructor")return "";
    seen.add(id);
    output.push('<w:docVar w:name="'+escapeXml(name)+'" w:val="'+escapeXml(value)+'"/>');
  }
  return output.length?"<w:docVars>"+output.join("")+"</w:docVars>":"";
}

/** Case-insensitive lookup with no prototype access or shadow ambiguity. */
export function resolveDocumentVariable(variables:Readonly<Record<string,string>>|undefined,name:string):string|undefined{
  if(!variables||!validName(name))return undefined;
  const key=name.toLowerCase();
  let value:string|undefined;
  for(const [candidate,text] of Object.entries(variables)){
    if(candidate.toLowerCase()!==key)continue;
    if(value!==undefined||typeof text!=="string"||!validValue(text))return undefined;
    value=text;
  }
  return value;
}
