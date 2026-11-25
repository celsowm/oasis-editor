import type {EditorDocument,EditorParagraphNode,EditorNamedStyle} from "@/core/model.js";
import {resolveDefaultParagraphStyleId} from "@/core/model.js";
import {getHeadingLevel} from "@/core/headings.js";
import {semanticBuiltinStyle,identifyImportedBuiltinStyle} from "@/core/model/builtinStyles.js";

/** Return a 1-based TOC level, null for body text, or undefined when the
 * source style graph cannot certify the level. Unlike the general rendering
 * cascade this bounded lookup never recurses on a malformed basedOn graph. */
export function createTocOutlineResolver(document:EditorDocument){
  const styles=document.styles;
  const byId=new Map<string,EditorNamedStyle|null>();
  for(const style of Object.values(styles??{})){
    byId.set(style.id,byId.has(style.id)?null:style);
  }
  const explicit=(level:number|null):number|null|undefined=>
    level===null||level===9?null:Number.isInteger(level)&&level>=0&&level<9?level+1:undefined;
  const defaults=[...byId.values()].filter(s=>s?.type==="paragraph"&&s.isDefault);
  const defaultId=defaults.length===1?defaults[0]!.id:resolveDefaultParagraphStyleId(styles);
  return (p:EditorParagraphNode):number|null|undefined=>{
    if(p.style?.outlineLevel!==undefined)return explicit(p.style.outlineLevel);
    if(!p.style?.styleId&&defaults.length>1)return undefined;
    let id=p.style?.styleId??defaultId;
    const seen=new Set<string>();
    while(id){
      if(seen.has(id)||seen.size>=128)return undefined;
      seen.add(id);
      const style=byId.get(id);
      if(style===null)return undefined;
      if(!style){
        const legacy=getHeadingLevel(id);
        if(legacy!==null)return legacy;
        return /^(normal|caption)$/i.test(id)?null:undefined;
      }
      if(style.type!=="paragraph")return undefined;
      if(style.paragraphStyle?.outlineLevel!==undefined)return explicit(style.paragraphStyle.outlineLevel);
      const identity=semanticBuiltinStyle(style)??identifyImportedBuiltinStyle(style);
      const heading=getHeadingLevel(identity);
      if(heading!==null)return heading;
      id=style.basedOn;
    }
    return null;
  };
}
