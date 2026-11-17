const $=id=>document.getElementById(id);
const td=(row,value)=>{const cell=row.insertCell();cell.textContent=value;return cell;};
async function start(){
  const response=await fetch("./capabilities.json");
  if(!response.ok)throw Error("HTTP "+response.status);
  const report=await response.json();
  $("status").textContent="Source: "+(report.sourceRef??"unknown")+" | Evidence: "+report.evidenceMode+" | Inventory: "+report.inventory.status+". "+(report.inventory.reason??"");
  for(const [id,values] of [["profile",report.entries.map(e=>e.profile)],["domain",report.entries.map(e=>e.domain)],["dimension",report.dimensions]]) for(const v of [...new Set(values)].sort()){const option=document.createElement("option");option.value=v;option.textContent=v;$(id).append(option);}
  function render(){
    const search=$("search").value.toLowerCase(), profile=$("profile").value,domain=$("domain").value,dimension=$("dimension").value,level=$("level").value;
    const entries=report.entries.filter(e=>(!profile||e.profile===profile)&&(!domain||e.domain===domain)&&(!level||(dimension?[e.support[dimension]]:Object.values(e.support)).includes(level))&&[e.element,e.namespace,e.context,e.domain,...e.limitations].join(" ").toLowerCase().includes(search));
    $("count").textContent=entries.length+" / "+report.entries.length+" seed entries";
    $("rows").replaceChildren();
    for(const e of entries){
      const row=$("rows").insertRow(),label=td(row,e.element+" / "+e.context+" ("+e.profile+")");label.title=e.namespace;
      for(const d of report.dimensions){const value=e.support[d],cell=td(row,value);cell.className=value;}
      const cell=td(row,e.limitations.join(" "));
      for(const ev of e.evidence){const p=document.createElement("p"), a=document.createElement("a");a.textContent=ev.case+" — "+ev.observed;
        if(/^[a-f0-9]{40}$/.test(report.sourceRef??""))a.href="https://github.com/celsowm/oasis-editor/blob/"+report.sourceRef+"/"+ev.file.split("/").map(encodeURIComponent).join("/");
        p.append(a);cell.append(p);}
    }
  }
  for(const id of ["search","profile","domain","dimension","level"])$(id).addEventListener("input",render);
  render();
}
start().catch(error=>{$("status").textContent="Report unavailable: "+error.message+". Generate it using npm run ooxml:report.";});
