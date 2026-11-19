import type { EditorFieldData } from "@/core/model.js";
import { pageNumberFormatFromSwitch } from "@/core/format/pageNumberFormat.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";

/** Only project instructions expressible by the existing scalar model.
 * Unsupported switches/arguments stay as original instruction runs. */
export function projectScalarFieldInstruction(raw:string):EditorFieldData|undefined {
  const parsed=parseFieldInstruction(raw);
  if(parsed.error)return undefined;
  const args=parsed.tokens.slice(1),type=parsed.command;
  if(type==="PAGE"||type==="NUMPAGES"){
    if(!args.length)return {type};
    if(args.length!==2||args[0]!.kind!=="switch"||args[0]!.value!=="*"||args[1]!.kind!=="word")return undefined;
    const format=pageNumberFormatFromSwitch(args[1]!.value);
    return format?{type,format}:undefined;
  }
  if(type==="DATE"){
    if(!args.length)return {type};
    if(args.length!==2||args[0]!.kind!=="switch"||args[0]!.value!=="@"||args[1]!.kind!=="quoted")return undefined;
    // Current date serializer cannot express escaped quotes/backslashes
    // losslessly; retain such instructions until the richer field model.
    const picture=args[1]!.value;
    if(!picture||/["\\]/.test(picture))return undefined;
    return {type,dateFormat:picture};
  }
  if(type==="REF"||type==="PAGEREF"){
    const target=args[0];
    if(!target||target.kind==="switch"||!target.value||/["\\]/.test(target.value))return undefined;
    if(args.length!==1&&!(args.length===2&&args[1]!.kind==="switch"&&args[1]!.value.toLowerCase()==="h"))return undefined;
    return {type,bookmark:target.value};
  }
  return undefined;
}
