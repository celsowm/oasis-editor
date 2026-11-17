/** CSS font list -> one Word font face. Preserve quoted commas in actual face
 * names unless the quoted token itself is an old serialized CSS fallback list.
 * Do not truncate a real long name into a nonexistent font; fall back to Calibri.
 */
export function docxTypeface(css: string): string {
  let value=css.trim();
  for(let depth=0;depth<3;depth++){
    const m=/^(?:"([^"]*)"|'([^']*)'|([^,]*))/.exec(value);
    if(!m)break;
    const family=(m[1]??m[2]??m[3]??"").trim();
    if(/,\s*(?:sans-serif|serif|monospace|system-ui)\s*$/i.test(family)){value=family;continue;}
    const generic: Record<string,string>={"sans-serif":"Calibri","serif":"Times New Roman","monospace":"Courier New","system-ui":"Calibri"};
    return generic[family.toLowerCase()]??(family&&family.length<=31?family:"Calibri");
  }
  return "Calibri";
}
