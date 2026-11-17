/** Corpus smoke gate: the inventory must follow the actual WML graph. */
export function assertOfficialDocxScope(scope){
  for(const profile of ["strict","transitional"]){
    const rows=scope.rows.filter(r=>r.profile===profile);
    const isWord=r=>r.namespace==="http://schemas.openxmlformats.org/wordprocessingml/2006/main"||r.namespace==="http://purl.oclc.org/ooxml/wordprocessingml/main";
    const has=(name,parent)=>rows.some(r=>isWord(r)&&r.element===name&&r.context?.element===parent);
    if(!has("body","document")||!has("p","body")||!has("r","p")||!has("t","r"))throw Error("Incomplete Word document traversal: "+profile);
    if(!rows.some(r=>isWord(r)&&r.element==="numFmt"&&r.attributes.some(a=>a.name==="val"&&a.values.length>10)))throw Error("Missing numbering enum projection: "+profile);
    if(rows.length<100||rows.reduce((n,r)=>n+r.attributes.length,0)<100)throw Error("Unexpectedly shallow DOCX inventory: "+profile);
  }
}