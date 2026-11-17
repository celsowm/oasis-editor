import type { EditorOpaqueRunData } from "@/core/model/types/nodes.js";
import { DOMParser, XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDocxDiagnostic, EditorDocxOpaqueObject, EditorDocxSourcePackage } from "@/core/model/types/docxSourcePackage.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A="http://schemas.openxmlformats.org/drawingml/2006/main";
const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const STRICT_R="http://purl.oclc.org/ooxml/officeDocument/relationships";
const MC="http://schemas.openxmlformats.org/markup-compatibility/2006";
const XMLNS="http://www.w3.org/2000/xmlns/";
const OFFICE="urn:schemas-microsoft-com:office:office";
const VML="urn:schemas-microsoft-com:vml";
const PICTURE="http://schemas.openxmlformats.org/drawingml/2006/picture";
const WPS="http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
const CHART="http://schemas.openxmlformats.org/drawingml/2006/chart";
const DIAGRAM="http://schemas.openxmlformats.org/drawingml/2006/diagram";

const children=(e: XmlElement): XmlElement[]=>Array.from(e.childNodes).filter((n):n is XmlElement=>n.nodeType===1);
const descendants=(e:XmlElement,ns:string,name:string):XmlElement[]=>Array.from(e.getElementsByTagNameNS(ns,name));
const is=(e:XmlElement,ns:string,name:string)=>e.namespaceURI===ns&&e.localName===name;
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const unique=(xs:string[])=>[...new Set(xs)].sort(compare);
const own=(o:Record<string,unknown>,k:string)=>Object.hasOwn(o,k);
function kindOf(e:XmlElement):EditorDocxOpaqueObject["kind"]|undefined {
  if(is(e,W,"object"))return "embedded";
  if(is(e,W,"pict")){
    if(descendants(e,OFFICE,"OLEObject").length)return "embedded";
    return descendants(e,VML,"imagedata").length?undefined:"vml";
  }
  if(!is(e,W,"drawing"))return undefined;
  const data=descendants(e,A,"graphicData");
  if(!data.length)return "drawing";
  for(const g of data){
    const uri=g.getAttribute("uri");
    if(uri===CHART||descendants(g,CHART,"chart").length)return "chart";
    if(uri===DIAGRAM||descendants(g,DIAGRAM,"relIds").length)return "diagram";
    if(uri&&/ink/i.test(uri))return "ink";
    // Native picture and simple WordprocessingShape are the supported
    // projection paths. Groups, other graphicData URIs and future payloads
    // are opaque even when they contain a picture or text-box descendant.
    if(uri!==PICTURE&&uri!==WPS)return "drawing";
  }
  return undefined;
}
function relationshipIds(root:XmlElement):string[]{
  const ids:string[]=[],stack=[root];
  while(stack.length){
    const e=stack.pop()!;
    for(const a of Array.from(e.attributes)){
      if((a.namespaceURI===R||a.namespaceURI===STRICT_R||a.namespaceURI===OFFICE&&a.localName==="relid")&&a.value)ids.push(a.value);
    }
    stack.push(...children(e));
  }
  return unique(ids);
}
function namespaceAt(e:XmlElement,prefix:string):string{
  const name=prefix?"xmlns:"+prefix:"xmlns";
  for(let p:XmlElement|null=e;p;p=p.parentNode?.nodeType===1?p.parentNode as XmlElement:null){
    if(p.hasAttribute(name))return p.getAttribute(name)??"";
  }
  return prefix==="xml"?"http://www.w3.org/XML/1998/namespace":"";
}
function signature(e:XmlElement):unknown{
  const attrs=Array.from(e.attributes).filter(a=>a.namespaceURI!==XMLNS&&a.name!=="xmlns"&&a.prefix!=="xmlns").map(a=>{
    // MC lexical QName values depend on namespace bindings. Preserve that
    // identity as well as the value; harmless prefix changes may still fail
    // this deliberately conservative check.
    const mc=a.namespaceURI===MC||is(e,MC,"Choice")&&a.localName==="Requires";
    const bindings=mc?a.value.trim().split(/\s+/).filter(Boolean).map(v=>[v,namespaceAt(e,v.split(":")[0]!)]):undefined;
    return [a.namespaceURI??"",a.localName??a.name,a.value,bindings];
  }).sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b)));
  return [e.namespaceURI??"",e.localName,attrs,Array.from(e.childNodes).map(n=>n.nodeType===1?signature(n as XmlElement):[n.nodeType,n.nodeValue])];
}
function standalone(e:XmlElement):string{
  const copy=e.cloneNode(true) as XmlElement;
  const bindings=new Map<string,string>();
  for(let p:XmlElement|null=e;p;p=p.parentNode?.nodeType===1?p.parentNode as XmlElement:null){
    for(const a of Array.from(p.attributes)){
      if(a.namespaceURI===XMLNS||a.name==="xmlns"||a.prefix==="xmlns"){
        if(!bindings.has(a.name))bindings.set(a.name,a.value);
      }
    }
  }
  for(const [name,value] of bindings)if(!copy.hasAttribute(name))copy.setAttributeNS(XMLNS,name,value);
  return new XMLSerializer().serializeToString(copy);
}
function geometry(e:XmlElement):EditorDocxOpaqueObject["geometry"]{
  const box=descendants(e,WP,"anchor")[0]??descendants(e,WP,"inline")[0];
  if(!box)return undefined;
  const extent=children(box).find(c=>is(c,WP,"extent"));
  const positive=(name:string)=>{
    const raw=extent?.getAttribute(name);
    const v=raw?Number(raw):NaN;
    return Number.isSafeInteger(v)&&v>0?v:undefined;
  };
  const wrap=children(box).find(c=>c.namespaceURI===WP&&c.localName?.startsWith("wrap"))?.localName;
  return {placement:box.localName==="anchor"?"anchor":"inline",widthEmu:positive("cx"),heightEmu:positive("cy"),wrap:wrap??undefined,relativeHeight:box.getAttribute("relativeHeight")||undefined};
}

export function resolveOpaqueClosure(source:EditorDocxSourcePackage,ownerPath:string,ids:string[]){
  const edges:EditorDocxOpaqueObject["edges"]=[],issues:EditorDocxDiagnostic[]=[],parts=new Set<string>(),visited=new Set<string>();
  const queue=ids.map(id=>({ownerPath,id}));
  const issue=(code:string,message:string,partPath:string,relationshipId:string)=>issues.push({level:"error",code,message,partPath,relationshipId});
  for(let index=0;index<queue.length;index++){
    const item=queue[index]!,key=JSON.stringify([item.ownerPath,item.id]);
    if(visited.has(key))continue;visited.add(key);
    const owner=own(source.parts,item.ownerPath)?source.parts[item.ownerPath]:undefined;
    const matches=(owner?.relationships??[]).filter(r=>r.id===item.id);
    if(matches.length!==1){issue(matches.length?"opaque-relationship-ambiguous":"opaque-relationship-missing","Cannot resolve unique opaque object relationship.",item.ownerPath,item.id);continue;}
    const r=matches[0]!;
    const targetMode=r.targetMode??"Internal";
    edges.push({ownerPath:item.ownerPath,relationshipId:r.id,type:r.type,target:r.target,targetMode,resolvedTarget:r.resolvedTarget});
    if(targetMode==="External")continue; // No network, decoding or activation.
    if(!r.resolvedTarget||!own(source.parts,r.resolvedTarget)){
      issue("opaque-target-missing","Opaque object internal target is absent or unsafe.",item.ownerPath,item.id);continue;
    }
    const target=r.resolvedTarget;
    if(parts.has(target))continue;parts.add(target);
    for(const next of source.parts[target]!.relationships??[])queue.push({ownerPath:target,id:next.id});
  }
  return {edges:edges.sort((a,b)=>compare(JSON.stringify([a.ownerPath,a.relationshipId]),JSON.stringify([b.ownerPath,b.relationshipId]))),partPaths:[...parts].sort(compare),issues};
}
function storyPart(source:EditorDocxSourcePackage,path:string):boolean{
  if(path===source.mainDocumentPart)return true;
  const type=source.parts[path]?.contentType??"";
  return /wordprocessingml\.(?:header|footer|footnotes|endnotes|comments|document\.glossary)\+xml$/.test(type);
}

function classifyOpaqueElement(el: XmlElement): EditorDocxOpaqueObject["kind"] | undefined {
  if (is(el,MC,"AlternateContent")) {
    return ["drawing","pict","object"].flatMap(name=>descendants(el,W,name)).map(kindOf).find(k=>k!==undefined);
  }
  return kindOf(el);
}

/** One object replacement character. Keep all original MC branches. */
export function projectOpaqueRunElement(el: XmlElement): EditorOpaqueRunData | undefined {
  const kind=classifyOpaqueElement(el);
  if(!kind)return undefined;
  const g=geometry(el);
  const px=(emu:number|undefined,fallback:number)=>emu===undefined?fallback:Math.max(1,Math.min(4096,emu/9525));
  return {objectKind:kind,fragmentXml:standalone(el),signature:JSON.stringify(signature(el)),relationshipIds:relationshipIds(el),width:px(g?.widthEmu,180),height:px(g?.heightEmu,90),placement:g?.placement};
}

export function inspectDocxOpaqueObjects(source:EditorDocxSourcePackage):{objects:EditorDocxOpaqueObject[];diagnostics:EditorDocxDiagnostic[]}{
  const objects:EditorDocxOpaqueObject[]=[],diagnostics:EditorDocxDiagnostic[]=[];
  for(const path of Object.keys(source.parts).sort(compare)){
    const part=source.parts[path]!;
    if(!storyPart(source,path)||part.kind!=="xml")continue;
    // Skip obviously unrelated stories without parsing an extra DOM. This is
    // only an optimization: candidate tag spellings are prefix-independent.
    if(!/<(?:[\w.-]+:)?(?:drawing|pict|object)(?=[\s/>])/.test(part.data))continue;
    try{
      if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(part.data))throw Error("DTD/entity declaration unsupported");
      const root=new DOMParser().parseFromString(part.data,"application/xml").documentElement;
      if(!root)throw Error("Missing story root");
      const stack:XmlElement[]=[root];let ordinal=0;
      while(stack.length){
        const el=stack.pop()!;
        const kind=classifyOpaqueElement(el);
        if(!kind){stack.push(...children(el).reverse());continue;}
        const ids=relationshipIds(el),closure=resolveOpaqueClosure(source,path,ids);
        const object:EditorDocxOpaqueObject={kind,ownerPath:path,ordinal:ordinal++,fragmentXml:standalone(el),signature:JSON.stringify(signature(el)),geometry:geometry(el),relationshipIds:ids,...closure};
        objects.push(object);
        diagnostics.push({level:"warning",code:"opaque-object-not-editable",partPath:path,message:"Unsupported "+kind+" object retained in the source inventory; editable projection and preservation after mutation are not guaranteed."},...closure.issues);
      }
    }catch(error){
      diagnostics.push({level:"error",code:"opaque-scan-failed",partPath:path,message:error instanceof Error?error.message:String(error)});
    }
  }
  return {objects,diagnostics};
}

/** Conservative loss detector. Exact XML structure and the complete internal
 * closure must survive in the same owning story. No relocation or intentional
 * opaque deletion is supported by this first opt-in strict mode.
 */
export function auditOpaqueObjectPreservation(source:EditorDocxSourcePackage,output:EditorDocxSourcePackage):EditorDocxDiagnostic[]{
  const before=inspectDocxOpaqueObjects(source),after=inspectDocxOpaqueObjects(output);
  const issues=[...before.diagnostics,...after.diagnostics].filter(d=>d.level==="error");
  const used=new Set<number>();
  for(const object of before.objects){
    const index=after.objects.findIndex((other,i)=>!used.has(i)&&other.ownerPath===object.ownerPath&&other.kind===object.kind&&other.signature===object.signature);
    if(index<0){
      issues.push({level:"error",code:"opaque-object-changed-or-missing",partPath:object.ownerPath,message:"Original "+object.kind+" object #"+object.ordinal+" was changed or removed."});continue;
    }
    used.add(index);
    const other=after.objects[index]!;
    if(JSON.stringify(object.edges)!==JSON.stringify(other.edges)||JSON.stringify(object.partPaths)!==JSON.stringify(other.partPaths)){
      issues.push({level:"error",code:"opaque-relationship-closure-changed",partPath:object.ownerPath,message:"Opaque object relationships changed."});
      continue;
    }
    for(const path of object.partPaths){
      const a=source.parts[path],b=output.parts[path];
      if(!a||!b||a.kind!==b.kind||a.contentType!==b.contentType||a.encoding!==b.encoding||a.data!==b.data){
        issues.push({level:"error",code:"opaque-target-content-changed",partPath:path,message:"Opaque object dependency content or type changed."});
      }
    }
  }
  after.objects.forEach((object,index)=>{
    if(!used.has(index))issues.push({level:"error",code:"opaque-object-introduced",partPath:object.ownerPath,message:"An opaque object was introduced, copied or relocated without a proven source relationship mapping."});
  });
  return issues;
}

export class OpaqueObjectPreservationError extends Error{
  constructor(public readonly diagnostics:EditorDocxDiagnostic[]){
    super("DOCX export blocked: opaque object preservation could not be established ("+diagnostics.length+" diagnostics).");
    this.name="OpaqueObjectPreservationError";
  }
}
