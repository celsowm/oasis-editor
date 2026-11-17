import { DOMParser } from "@xmldom/xmldom";
import { readFileSync, realpathSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { digest } from "./registry.mjs";
import { buildEffectiveInventory } from "./effective-schema.mjs";

const XS="http://www.w3.org/2001/XMLSchema";
const children=n=>Array.from(n.childNodes??[]).filter(x=>x.nodeType===1 && x.namespaceURI===XS);
const attr=(n,k)=>n.getAttribute(k)||null;
function qname(node,value) {
  if(!value) return null;
  const parts=value.split(":");
  const prefix=parts.length===2?parts[0]:null;
  // Resolve xmlns declarations at the lexical point of use. xmldom's
  // lookupNamespaceURI(null) may return the element's own namespace rather
  // than the in-scope default namespace used by unprefixed QName values.
  if(prefix==="xml")return {namespace:"http://www.w3.org/XML/1998/namespace",name:parts.at(-1)};
  let ns=null;
  const declaration=prefix?"xmlns:"+prefix:"xmlns";
  for(let cursor=node;cursor&&cursor.nodeType===1;cursor=cursor.parentNode){
    if(cursor.hasAttribute(declaration)){ns=cursor.getAttribute(declaration);break;}
  }
  return {namespace:ns??"",name:parts.at(-1)};
}
const symbolKey=(profile,namespace,kind,name)=>JSON.stringify([profile,namespace,kind,name]);
const sort=(a,b)=>a<b?-1:a>b?1:0;

export function inspectSchema(xml, profile, file) {
  xml=xml.replace(/^\uFEFF/,"");
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw Error("DTD/entity declarations forbidden");
  const doc=new DOMParser({onError:(level,message)=>{if(level!=="warning") throw Error(message);}}).parseFromString(xml,"application/xml");
  const root=doc.documentElement;
  if(root?.namespaceURI!==XS || root.localName!=="schema") throw Error("Not an XML Schema: "+file);
  const namespace=attr(root,"targetNamespace")??"";
  const declarations=[], references=[];
  const defaults={elementForm:attr(root,"elementFormDefault")??"unqualified",attributeForm:attr(root,"attributeFormDefault")??"unqualified"};
  function visit(node,context) {
    for(const child of children(node)) {
      const kind=child.localName, name=attr(child,"name"), ref=attr(child,"ref");
      const segment=kind+(name?":"+name:ref?":"+ref:"");
      const position=children(node).indexOf(child);
      const path=context+"/"+segment+"["+position+"]";
      if(["element","attribute","complexType","simpleType","group","attributeGroup","enumeration","any","anyAttribute","sequence","choice","all","complexContent","simpleContent","extension","restriction","list","union"].includes(kind)) {
        declarations.push({profile,namespace,file,context,path,kind,name,global:context==="schema",ref,nameNamespace:context==="schema"?namespace:(attr(child,"form")??(kind==="attribute"?defaults.attributeForm:defaults.elementForm))==="qualified"?namespace:"",type:attr(child,"type"),value:attr(child,"value"),use:attr(child,"use"),minOccurs:attr(child,"minOccurs"),maxOccurs:attr(child,"maxOccurs"),form:attr(child,"form"),default:attr(child,"default"),fixed:attr(child,"fixed")});
      }
      if(["include","import","redefine","override"].includes(kind) || ref || attr(child,"base") || attr(child,"type") || attr(child,"substitutionGroup") || attr(child,"itemType") || attr(child,"memberTypes") || ["any","anyAttribute"].includes(kind)) {
        references.push({profile,file,path,kind,location:attr(child,"schemaLocation"),namespace:attr(child,"namespace"),ref,base:attr(child,"base"),type:attr(child,"type"),targets:[
          ...(ref?[{role:"ref",qname:qname(child,ref),kinds:[kind]}]:[]),
          ...(attr(child,"base")?[{role:"base",qname:qname(child,attr(child,"base")),kinds:["complexType","simpleType"]}]:[]),
          ...(attr(child,"type")?[{role:"type",qname:qname(child,attr(child,"type")),kinds:["complexType","simpleType"]}]:[]),
          ...(attr(child,"substitutionGroup")?[{role:"substitutionGroup",qname:qname(child,attr(child,"substitutionGroup")),kinds:["element"]}]:[]),
          ...(attr(child,"itemType")?[{role:"itemType",qname:qname(child,attr(child,"itemType")),kinds:["simpleType"]}]:[]),
          ...(attr(child,"memberTypes")??"").split(/\s+/).filter(Boolean).map(v=>({role:"memberType",qname:qname(child,v),kinds:["simpleType"]}))
        ]});
      }
      visit(child,path);
    }
  }
  visit(root,"schema");
  return {declarations,references};
}

export function inventoryFromManifest(manifestPath) {
  const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));
  if(manifest.version!==1 || !Array.isArray(manifest.files) || !manifest.files.length) throw Error("Invalid or empty schema manifest");
  const root=realpathSync(dirname(resolve(manifestPath)));
  const seen=new Set(), declarations=[], references=[], sources=[];
  for(const item of manifest.files) {
    if(!["transitional","strict","extension","opc"].includes(item.profile) || ![item.edition,item.source,item.license,item.path].every(x=>typeof x==="string" && x.trim()) || !/^[a-f0-9]{64}$/.test(item.sha256)) throw Error("Missing schema provenance");
    if(isAbsolute(item.path)) throw Error("Absolute schema path");
    const path=realpathSync(resolve(root,item.path)), rel=relative(root,path);
    if(rel===".."||rel.startsWith("../")||rel.startsWith("..\\")||isAbsolute(rel)) throw Error("Schema outside manifest directory");
    const key=JSON.stringify([item.profile,rel]); if(seen.has(key)) throw Error("Duplicate schema file"); seen.add(key);
    const bytes=readFileSync(path); if(digest(bytes)!==item.sha256) throw Error("Schema hash mismatch: "+item.path);
    let data;
    try { data=inspectSchema(bytes.toString("utf8"),item.profile,item.path); }
    catch(error){throw new Error("Cannot parse verified schema "+item.path+": "+error.message,{cause:error});}
    declarations.push(...data.declarations); references.push(...data.references);
    sources.push({profile:item.profile,edition:item.edition,source:item.source,license:item.license,path:item.path,sha256:item.sha256,archiveSha256:item.archiveSha256??null});
  }
  const order=arr=>arr.sort((a,b)=>sort(JSON.stringify(a),JSON.stringify(b)));
  const graph=resolveReferences(declarations,references,sources);
  const effective=buildEffectiveInventory(declarations,graph);
  const counts=Object.fromEntries([...new Set(declarations.map(d=>d.kind))].sort().map(k=>[k,declarations.filter(d=>d.kind===k).length]));
  return {status:"incomplete",reason:"Pinned declarations, direct QName links and effective attribute/particle projections. Restrictions, substitutions, external XSDs and complete DOCX reachability remain limited; not a coverage denominator.",sources:order(sources),declarations:order(declarations),references:order(references),graph,counts,effective};
}

export function resolveReferences(declarations,references,sources=[]) {
  const index=new Map(), files=new Set(sources.map(s=>JSON.stringify([s.profile,s.path])));
  for(const d of declarations) if(d.global&&d.name) {
    const key=symbolKey(d.profile,d.namespace,d.kind,d.name);
    const list=index.get(key)??[];list.push({file:d.file,path:d.path});index.set(key,list);
  }
  const edges=[];
  for(const r of references) {
    for(const t of r.targets??[]) {
      const matches=t.kinds.flatMap(k=>index.get(symbolKey(r.profile,t.qname.namespace,k,t.qname.name))??[]);
      const status=t.qname.namespace===XS?"builtin-namespace":matches.length===1?"resolved":matches.length>1?"ambiguous":"unresolved";
      edges.push({profile:r.profile,file:r.file,path:r.path,role:t.role,qname:t.qname,status,matches});
    }
    if(r.location&&["include","import","redefine","override"].includes(r.kind)){
      const location=r.location;
      const candidate=/^[a-z]+:|^\//i.test(location)?null:relative(".",resolve(dirname(r.file),location)).split("\\").join("/");
      edges.push({profile:r.profile,file:r.file,path:r.path,role:r.kind,location,status:candidate&&files.has(JSON.stringify([r.profile,candidate]))?"file-present":"unresolved"});
    }
  }
  edges.sort((a,b)=>sort(JSON.stringify(a),JSON.stringify(b)));
  const summary=Object.fromEntries([...new Set(edges.map(e=>e.status))].sort().map(k=>[k,edges.filter(e=>e.status===k).length]));
  return {summary,edges};
}
