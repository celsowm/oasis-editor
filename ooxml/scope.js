const $=id=>document.getElementById(id);
const add=(parent,tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;parent.append(el);return el;};
const pageSize=40;
async function start(){
 const response=await fetch("./docx-scope.json");if(!response.ok)throw Error("HTTP "+response.status);
 const scope=await response.json();
 $("status").textContent=scope.counts.contexts+" declaration contexts · "+scope.counts.attributeOccurrences+" attribute occurrences · "+scope.counts.enumeratedValueOccurrences+" enumerated value occurrences. Partial inventory; no global coverage percentage. Source: "+(scope.sourceRef??"unknown");
 const ul=add($("limitations"),"ul");for(const l of scope.limitations)add(ul,"li",l);
 for(const r of scope.missingRoots)add(ul,"li",r.profile+" "+r.file+" / "+r.name+" — "+r.status);
 for(const [id,values] of [["profile",scope.rows.map(r=>r.profile)],["domain",scope.rows.flatMap(r=>r.domains)]])for(const v of [...new Set(values)].sort()){const o=add($(id),"option",v);o.value=v;}
 const indexed=scope.rows.map(r=>({r,search:[r.element,r.namespace,r.context?.element,r.context?.namespace,r.declaration.file,...r.attributes.flatMap(a=>[a.name,a.namespace,...a.values.map(v=>v.value)]),...r.values.map(v=>v.value)].join(" ").toLowerCase()}));
 let page=0;
 function render(){
  const q=$("search").value.trim().toLowerCase(),p=$("profile").value,d=$("domain").value,o=$("observations").value;
  const matches=indexed.filter(({r,search})=>(!p||r.profile===p)&&(!d||r.domains.includes(d))&&(!o||(o==="related" ? r.observations.length>0 : r.observations.length===0))&&search.includes(q));
  const pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages-1);
  $("count").textContent=matches.length+" matching contexts — page "+(page+1)+" of "+pages;
  $("previous").disabled=page===0;$("next").disabled=page>=pages-1;
  $("rows").replaceChildren();
  for(const {r} of matches.slice(page*pageSize,(page+1)*pageSize)){
   const article=add($("rows"),"article");
   add(article,"strong",r.element+(r.context?" in "+r.context.element:" (entry point)")+" · "+r.profile);
   add(article,"div",r.namespace);
   add(article,"small",r.declaration.file+" "+r.declaration.path);
   const details=add(article,"details");add(details,"summary",r.attributes.length+" attributes, "+r.values.length+" element values; "+r.observations.length+" related observations");
   const attrs=add(details,"ul");
   for(const a of r.attributes)add(attrs,"li",(a.namespace?"{"+a.namespace+"}":"")+a.name+" — "+a.use+(a.values.length?"; values: "+a.values.map(v=>v.value).join(", "):""));
   if(r.values.length)add(details,"p","Element values: "+r.values.map(v=>v.value).join(", "));
   for(const ev of r.observations)add(details,"p","Related: "+ev.context+" ("+ev.contextHint+") — "+Object.entries(ev.support).map(([k,v])=>k+": "+v).join(", "));
  }
 }
 for(const id of ["search","profile","domain","observations"])$(id).addEventListener("input",()=>{page=0;render();});
 $("previous").addEventListener("click",()=>{page--;render();});$("next").addEventListener("click",()=>{page++;render();});
 render();
}
start().catch(e=>{$("status").textContent="Inventory unavailable: "+e.message+". Generate with the official schema manifest.";});
