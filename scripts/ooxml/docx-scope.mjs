import { dimensions } from "./registry.mjs";
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const ordered=xs=>xs.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b)));
const id=p=>JSON.stringify([p.profile,p.file,p.path]);
const expanded=(namespace,name)=>JSON.stringify([namespace,name]);
const unknown=()=>Object.fromEntries(dimensions.map(d=>[d,"unknown"]));
/** Explicit entry points for document parts and DrawingML payloads that enter
 * through relationships or wildcards, rather than a transitive file-import
 * graph (which would incorrectly include all standalone XLSX/PPTX structures).
 * Select global declarations only. Missing roots are reported, not invented. */
export const DOCX_ROOTS=Object.freeze([
  {file:"wml.xsd",domain:"word",names:["document","styles","numbering","settings","webSettings","fonts","hdr","ftr","footnotes","endnotes","comments","glossaryDocument"]},
  {file:"dml-main.xsd",domain:"theme",names:["theme","themeOverride"]},
  {file:"dml-wordprocessingDrawing.xsd",domain:"drawing",names:["inline","anchor"]},
  {file:"dml-picture.xsd",domain:"drawing",names:["pic"]},
  {file:"dml-chart.xsd",domain:"charts",names:["chartSpace","chart"]},
  {file:"dml-chartDrawing.xsd",domain:"charts",names:["userShapes"]},
  {file:"dml-diagram.xsd",domain:"diagrams",names:["relIds","dataModel","layoutDef","styleDef","colorsDef"]},
  {file:"shared-math.xsd",domain:"math",names:["oMath","oMathPara"]},
  {file:"shared-documentPropertiesExtended.xsd",domain:"metadata",names:["Properties"]},
  {file:"shared-documentPropertiesCustom.xsd",domain:"metadata",names:["Properties"]},
  {file:"shared-customXmlDataProperties.xsd",domain:"custom XML",names:["datastoreItem"]},
  {file:"shared-customXmlSchemaProperties.xsd",domain:"custom XML",names:["schemaLibrary"]},
  {file:"shared-bibliography.xsd",domain:"bibliography",names:["Sources"]},
  {file:"vml-main.xsd",domain:"VML",profiles:["transitional"],names:["shape","group","rect","roundrect","oval","line","polyline","arc","curve","image"]},
  {file:"opc-contentTypes.xsd",domain:"OPC",profiles:["opc"],names:["Types"]},
  {file:"opc-relationships.xsd",domain:"OPC",profiles:["opc"],names:["Relationships"]},
  {file:"opc-coreProperties.xsd",domain:"OPC",profiles:["opc"],names:["coreProperties"]}
]);
const basename=p=>p.split("/").at(-1);
function leafParticles(nodes){
  const out=[];
  function walk(list){for(const p of list){if(p.kind==="element")out.push(p);else if(p.children)walk(p.children);}}
  walk(nodes??[]);return out;
}
export function buildDocxScope(inventory,capabilities=[],rootSpecs=DOCX_ROOTS){
  const projections=(inventory.effective?.projections??[]).filter(p=>p.kind==="element");
  const lookup=new Map(projections.map(p=>[id(p),p]));
  const profiles=[...new Set(projections.map(p=>p.profile))].sort();
  const roots=[], missingRoots=[], unresolved=new Map(), rows=new Map();
  const candidates=new Map();
  for(const e of capabilities){
    const k=JSON.stringify([e.profile,e.namespace,e.element]);
    const list=candidates.get(k)??[];list.push(e);candidates.set(k,list);
  }
  for(const spec of rootSpecs){
    for(const profile of spec.profiles??profiles.filter(p=>p==="strict"||p==="transitional")){
      for(const name of spec.names){
        const matches=projections.filter(p=>p.profile===profile&&basename(p.file)===spec.file&&p.context==="schema"&&p.name===name);
        if(matches.length!==1){missingRoots.push({profile,file:spec.file,name,status:matches.length?"ambiguous":"missing"});continue;}
        roots.push({id:id(matches[0]),profile,domain:spec.domain,namespace:matches[0].namespace,name,file:matches[0].file,path:matches[0].path});
      }
    }
  }
  const remember=(p,parent,root)=>{
    const key=JSON.stringify([parent?id(parent):null,id(p)]);
    let row=rows.get(key);
    if(!row){
      const related=(candidates.get(JSON.stringify([p.profile,p.namespace,p.name]))??[]).map(e=>({context:e.context,domain:e.domain,support:e.support,evidence:e.evidence,limitations:e.limitations,contextHint:parent?(e.context===parent.name||e.context==="document/body"&&parent.name==="body"?"parent-name-match":"different-context"):"part-root-or-payload"}));
      row={id:key,profile:p.profile,namespace:p.namespace,element:p.name??"(unresolved name)",context:parent?{namespace:parent.namespace,element:parent.name,file:parent.file,path:parent.path}:null,
        declaration:{file:p.file,path:p.path,type:p.type,typeSource:p.typeSource},roots:new Set(),domains:new Set(),support:unknown(),
        attributes:(p.attributes??[]).map(a=>({...a,support:unknown(),values:(a.enumeration??[]).map(value=>({value,support:unknown()}))})),
        values:(p.enumeration??[]).map(value=>({value,support:unknown()})),observations:related};
      rows.set(key,row);
    }
    row.roots.add(root.id);row.domains.add(root.domain);
  };
  for(const root of roots){
    const start=lookup.get(root.id),seen=new Set(),queue=[start];
    remember(start,null,root);
    for(let i=0;i<queue.length;i++){
      const p=queue[i],k=id(p);
      if(seen.has(k))continue;seen.add(k);
      for(const particle of leafParticles(p.particles)){
        const child=lookup.get(JSON.stringify([p.profile,particle.source.file,particle.source.path]));
        if(!child){
          const reason={profile:p.profile,parent:{file:p.file,path:p.path},particle:particle.source};
          unresolved.set(JSON.stringify(reason),reason);continue;
        }
        remember(child,p,root);
        if(!seen.has(id(child)))queue.push(child);
      }
    }
  }
  const allRows=ordered([...rows.values()].map(r=>({...r,roots:[...r.roots].sort(cmp),domains:[...r.domains].sort(cmp)})));
  const declarations=new Set(allRows.map(r=>JSON.stringify([r.profile,r.declaration.file,r.declaration.path])));
  const qnames=new Set(allRows.map(r=>JSON.stringify([r.profile,expanded(r.namespace,r.element)])));
  const counts={roots:roots.length,missingRoots:missingRoots.length,contexts:allRows.length,elementDeclarations:declarations.size,qualifiedNames:qnames.size,
    attributeOccurrences:allRows.reduce((n,r)=>n+r.attributes.length,0),enumeratedValueOccurrences:allRows.reduce((n,r)=>n+r.values.length+r.attributes.reduce((a,b)=>a+b.values.length,0),0),
    contextsWithRelatedObservations:allRows.filter(r=>r.observations.length).length,unresolvedParticleLinks:unresolved.size};
  const perProfile=Object.fromEntries(profiles.map(profile=>{
    const list=allRows.filter(r=>r.profile===profile);
    return [profile,{contexts:list.length,attributeOccurrences:list.reduce((n,r)=>n+r.attributes.length,0)}];
  }));
  return {version:1,status:"partial",counts,perProfile,roots:ordered(roots),missingRoots:ordered(missingRoots),unresolved:ordered([...unresolved.values()]),
    limitations:["Finite declaration-parent contexts, not every possible document path. Recursive structures reuse the same graph nodes.","Explicit part/payload roots are a candidate scope, not a complete OPC relationship/content-type inventory. Wildcards, substitutions, extension schemas, embedded packages and prose-only constraints remain incomplete.","Context observations are related registry claims, not certified support for the schema row. All schema-row/attribute/value dimensions are unknown until exact evidence is attached.","Standalone SpreadsheetML and PresentationML roots are not seeded. Shared schemas can still be reached by actual particle links."],rows:allRows};
}
