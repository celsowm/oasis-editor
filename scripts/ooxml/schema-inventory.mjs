import { DOMParser } from "@xmldom/xmldom";
import { readFileSync, realpathSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { digest } from "./registry.mjs";

const XS="http://www.w3.org/2001/XMLSchema";
const children=n=>Array.from(n.childNodes??[]).filter(x=>x.nodeType===1 && x.namespaceURI===XS);
const attr=(n,k)=>n.getAttribute(k)||null;
const sort=(a,b)=>a<b?-1:a>b?1:0;

export function inspectSchema(xml, profile, file) {
  if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw Error("DTD/entity declarations forbidden");
  const doc=new DOMParser({onError:(level,message)=>{if(level!=="warning") throw Error(message);}}).parseFromString(xml,"application/xml");
  const root=doc.documentElement;
  if(root?.namespaceURI!==XS || root.localName!=="schema") throw Error("Not an XML Schema: "+file);
  const namespace=attr(root,"targetNamespace")??"";
  const declarations=[], references=[];
  function visit(node,context) {
    for(const child of children(node)) {
      const kind=child.localName, name=attr(child,"name"), ref=attr(child,"ref");
      const segment=kind+(name?":"+name:ref?":"+ref:"");
      const position=children(node).indexOf(child);
      const path=context+"/"+segment+"["+position+"]";
      if(["element","attribute","complexType","simpleType","group","attributeGroup","enumeration","any","anyAttribute"].includes(kind)) {
        declarations.push({profile,namespace,file,context,kind,name,ref,type:attr(child,"type"),value:attr(child,"value"),use:attr(child,"use"),minOccurs:attr(child,"minOccurs"),maxOccurs:attr(child,"maxOccurs")});
      }
      if(["include","import","redefine","override"].includes(kind) || ref || attr(child,"base") || attr(child,"type") || ["any","anyAttribute"].includes(kind)) {
        references.push({file,path,kind,location:attr(child,"schemaLocation"),namespace:attr(child,"namespace"),ref,base:attr(child,"base"),type:attr(child,"type")});
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
    if(!["transitional","strict","extension"].includes(item.profile) || ![item.edition,item.source,item.license,item.path].every(x=>typeof x==="string" && x.trim()) || !/^[a-f0-9]{64}$/.test(item.sha256)) throw Error("Missing schema provenance");
    if(isAbsolute(item.path)) throw Error("Absolute schema path");
    const path=realpathSync(resolve(root,item.path)), rel=relative(root,path);
    if(rel===".."||rel.startsWith("../")||rel.startsWith("..\\")||isAbsolute(rel)) throw Error("Schema outside manifest directory");
    const key=JSON.stringify([item.profile,rel]); if(seen.has(key)) throw Error("Duplicate schema file"); seen.add(key);
    const bytes=readFileSync(path); if(digest(bytes)!==item.sha256) throw Error("Schema hash mismatch: "+item.path);
    const data=inspectSchema(bytes.toString("utf8"),item.profile,item.path);
    declarations.push(...data.declarations); references.push(...data.references);
    sources.push({profile:item.profile,edition:item.edition,source:item.source,license:item.license,path:item.path,sha256:item.sha256});
  }
  const order=arr=>arr.sort((a,b)=>sort(JSON.stringify(a),JSON.stringify(b)));
  return {status:"incomplete",reason:"Lexical declaration prototype only; QName/type graph, imports, inheritance, groups, substitution and effective cardinality are not resolved. Not a coverage denominator.",sources:order(sources),declarations:order(declarations),references:order(references)};
}
