import { getOrderIndex } from "@/ooxml/schemaOrder.js";

/** Sort only complete, freshly generated property fragments, not imported XML.
 * Preserve nested markup and stable order for repeated/unknown properties.
 * MC wrappers are positioned according to their known WML fallback when present.
 */
export function orderedPropertyFragments(parts: readonly string[], order: readonly string[]): string {
  return parts.map((xml,index)=>{
    const first=/^<w:([\w]+)(?=[\s/>])/.exec(xml)?.[1];
    const fallback=xml.startsWith("<mc:AlternateContent") ? /<mc:Fallback>\s*<w:([\w]+)(?=[\s/>])/.exec(xml)?.[1] : undefined;
    // Extension-only content belongs after base properties but before changes.
    const revision=order.findIndex(name=>name.endsWith("PrChange"));
    const rank=first||fallback?getOrderIndex((first??fallback)!,order):revision<0?9999:revision-0.5;
    return {xml,index,rank};
  }).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(x=>x.xml).join("");
}
