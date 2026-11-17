/** Schema projection, not a schema validator. Preserve particle grouping and provenance.
 * Never expand child element types recursively: recursive WML types are legitimate.
 */
const key=(profile,file,path)=>JSON.stringify([profile,file,path]);
const attrKey=a=>JSON.stringify([a.namespace,a.name]);
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const sorted=items=>items.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b)));
const containers=new Set(["complexContent","simpleContent","extension","restriction"]);
const groups=new Set(["sequence","choice","all"]);
const types=new Set(["complexType","simpleType"]);
export function buildEffectiveInventory(declarations,graph){
  const nodes=new Map(), kids=new Map(), links=new Map();
  for(const d of declarations) {
    const id=key(d.profile,d.file,d.path);
    nodes.set(id,d);
    const k=key(d.profile,d.file,d.context);
    const children=kids.get(k)??[];children.push(d);kids.set(k,children);
  }
  for(const e of graph.edges){
    const id=key(e.profile,e.file,e.path);
    const list=links.get(id)??[];list.push(e);links.set(id,list);
  }
  const idOf=d=>key(d.profile,d.file,d.path);
  const children=d=>kids.get(idOf(d))??[];
  const edge=(d,role)=>(links.get(idOf(d))??[]).find(e=>e.role===role);
  const target=(d,role)=>{
    const e=edge(d,role);
    return e?.status==="resolved"?nodes.get(key(d.profile,e.matches[0].file,e.matches[0].path)):null;
  };
  const source=d=>({file:d.file,path:d.path});
  const problems=new Set();
  const issue=(d,reason)=>problems.add(JSON.stringify({profile:d.profile,...source(d),reason}));
  const occurs=d=>({min:d.minOccurs??"1",max:d.maxOccurs??"1"});
  function enumValues(d,stack=new Set()){
    if(!d)return [];
    const id=idOf(d);
    if(stack.has(id)){issue(d,"cyclic simple type");return [];}
    const next=new Set(stack).add(id);
    const own=children(d).filter(c=>c.kind==="enumeration").map(c=>c.value);
    if(own.length)return [...new Set(own)].sort(cmp);
    const restrictions=children(d).filter(c=>c.kind==="restriction");
    if(restrictions.length)return [...new Set(restrictions.flatMap(c=>enumValues(c,next)))].sort(cmp);
    return enumValues(target(d,"base"),next);
  }
  function attribute(d){
    const t=target(d,"ref")??d,r=edge(d,"ref");
    if(r&&!target(d,"ref")) issue(d,"unresolved attribute reference");
    const type=target(t,"type")??children(t).find(c=>c.kind==="simpleType");
    return {namespace:r?.qname?.namespace??t.nameNamespace,name:r?.qname?.name??t.name,use:d.use??t.use??"optional",
      default:d.default??t.default,fixed:d.fixed??t.fixed,type:edge(t,"type")?.qname??null,enumeration:enumValues(type),source:source(d),declaration:source(t)};
  }
  function collectAttributes(d,stack=new Set()){
    const id=idOf(d);
    if(stack.has(id)){issue(d,"cyclic attribute/type group");return [];}
    const next=new Set(stack).add(id), out=new Map();
    // Keep prohibited markers until the final projection: restrictions may
    // remove inherited attributes even when nested inside another group.
    const merge=list=>{for(const a of list)out.set(attrKey(a),a);};
    const base=edge(d,"base"), baseNode=target(d,"base");
    if(baseNode)merge(collectAttributes(baseNode,next));
    else if(base&&base.status!=="builtin-namespace")issue(d,"unresolved attribute base");
    for(const c of children(d)){
      if(c.kind==="attribute")merge([attribute(c)]);
      else if(c.kind==="attributeGroup"){
        const group=target(c,"ref");
        if(group)merge(collectAttributes(group,next));
        else issue(c,"unresolved attribute group");
      }else if(containers.has(c.kind)){
        merge(collectAttributes(c,next));
        if(c.kind==="restriction")issue(c,"restriction semantics only partially projected");
      }else if(c.kind==="anyAttribute")issue(c,"attribute wildcard requires validation policy");
    }
    return [...out.values()];
  }
  function particles(d,stack=new Set()){
    const id=idOf(d);
    if(stack.has(id)){issue(d,"cyclic model group/type");return [];}
    const next=new Set(stack).add(id), out=[];
    const b=target(d,"base");
    if(d.kind==="extension"&&b)out.push(...particles(b,next));
    if(d.kind==="restriction")issue(d,"restriction particles are lexical projection");
    for(const c of children(d)){
      if(c.kind==="element"){
        const ref=edge(c,"ref");
        const t=target(c,"ref")??c;
        if(ref&&!target(c,"ref"))issue(c,"unresolved element reference");
        out.push({kind:"element",name:ref?.qname?.name??t.name,namespace:ref?.qname?.namespace??t.nameNamespace,type:edge(t,"type")?.qname??null,occurs:occurs(c),source:source(c)});
      }else if(groups.has(c.kind)){
        out.push({kind:c.kind,occurs:occurs(c),children:particles(c,next),source:source(c)});
      }else if(c.kind==="group"){
        const g=target(c,"ref");
        if(!g)issue(c,"unresolved model group");
        out.push({kind:"group",occurs:occurs(c),ref:edge(c,"ref")?.qname??null,children:g?particles(g,next):[],source:source(c)});
      }else if(c.kind==="any"){
        out.push({kind:"any",occurs:occurs(c),source:source(c)});
        issue(c,"wildcard requires validation policy");
      }else if(containers.has(c.kind))out.push(...particles(c,next));
    }
    return out;
  }
  const projected=[];
  for(const d of declarations){
    if(!types.has(d.kind)&&d.kind!=="element")continue;
    if(d.kind==="element"){
      const targetElement=target(d,"ref")??d;
      const t=target(targetElement,"type")??children(targetElement).find(c=>types.has(c.kind));
      const ref=edge(d,"ref"), typeEdge=edge(targetElement,"type");
      if(ref&&!target(d,"ref"))issue(d,"unresolved element reference");
      if(typeEdge&&!t&&typeEdge.status!=="builtin-namespace")issue(d,"unresolved element type");
      if(!t&&!typeEdge)issue(d,"element type implicit or unresolved");
      projected.push({profile:d.profile,kind:"element",namespace:ref?.qname?.namespace??targetElement.nameNamespace,name:ref?.qname?.name??targetElement.name,context:d.context,...source(d),type:typeEdge?.qname??null,typeSource:t?source(t):null,attributes:t?sorted(collectAttributes(t).filter(a=>a.use!=="prohibited")):[],particles:t?particles(t):[],enumeration:t?enumValues(t):[]});
    }else{
      projected.push({profile:d.profile,kind:d.kind,namespace:d.namespace,name:d.name,context:d.context,...source(d),attributes:sorted(collectAttributes(d).filter(a=>a.use!=="prohibited")),particles:d.kind==="complexType"?particles(d):[],enumeration:d.kind==="simpleType"?enumValues(d):[]});
    }
  }
  const substitutions=graph.edges.filter(e=>e.role==="substitutionGroup");
  return {status:"partial",limitations:["No full restriction validation, substitution closure, wildcard policy, XSD co-constraints, cross-profile reachability or prose rules. Recursive child element types remain references."],counts:{projections:projected.length,elements:projected.filter(p=>p.kind==="element").length,attributeOccurrences:projected.reduce((n,p)=>n+p.attributes.length,0),unresolvedOrPartial:problems.size,substitutionEdges:substitutions.length},projections:sorted(projected),substitutions,diagnostics:[...problems].sort(cmp).map(s=>JSON.parse(s))};
}
