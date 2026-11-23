import type { PageNumberFormat } from "@/core/model.js";
import { formatPageNumber, pageNumberFormatFromSwitch } from "@/core/format/pageNumberFormat.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import { formatTemporalPicture, supportsTemporalPicture, type TemporalFormattingOptions } from "@/core/format/temporalFieldFormat.js";
import type { FieldStorySpan } from "./fieldStoryGraph.js";

export type NumericFieldCommand = "PAGE" | "NUMPAGES" | "SECTION" | "SECTIONPAGES";
export type ReferenceFieldCommand = "REF" | "PAGEREF";
export type TemporalFieldCommand = "DATE" | "TIME" | "CREATEDATE" | "SAVEDATE" | "PRINTDATE";
export interface SequenceField {
  type:"SEQ";
  identifier:string;
  operation:"next"|"repeat"|"reset";
  reset?:number;
  headingLevel?:number;
  format?:PageNumberFormat;
}
export type EvaluatableField =
  | SequenceField
  | { type: TemporalFieldCommand; temporal: true; picture?: string }
  | { type: NumericFieldCommand; format?: PageNumberFormat }
  | { type: ReferenceFieldCommand; bookmark: string; hyperlink?: boolean }
  | { type:"STYLEREF"; style:string; lastOnPage:boolean; output?:"number"|"position" };

export type FieldDependency =
  | { kind: "page" | "document-pages" | "section" | "section-pages" }
  | { kind: "bookmark-text" | "bookmark-page"; name: string }
  | { kind: "clock" | "created" | "saved" | "printed" }
  | { kind:"sequence"; name:string }
  | { kind:"style-text"; name:string; lastOnPage:boolean };

/** All numbers are the caller's one-based display values, not array indexes.
 * No DOM, clock, mutable editor state or layout service is consulted here.
 * An absent value is unresolved; a bookmark resolver may return null only
 * when it has positively established that the target does not exist. */
export interface FieldEvaluationContext {
  temporal?: TemporalFieldContext;
  /** Precomputed value for this exact SEQ occurrence, never a mutable counter. */
  sequenceValue?: number;
  pageNumber?: number;
  totalPages?: number;
  sectionNumber?: number;
  sectionPages?: number;
  bookmarkText?: (name: string) => string | null | undefined;
  bookmarkPage?: (name: string) => number | null | undefined;
  /** Exact resolved style text for a body occurrence or repeated page story. */
  styleRefText?: (name:string,lastOnPage:boolean,output:"text"|"number"|"position")=>string|undefined;
}

export interface TemporalFieldContext extends TemporalFormattingOptions {
  now?: number;
  created?: number;
  saved?: number;
  printed?: number;
}
const temporalCommands = new Set<string>(["DATE","TIME","CREATEDATE","SAVEDATE","PRINTDATE"]);
const temporalRegistry = {
  DATE:{key:"now",dependency:"clock"}, TIME:{key:"now",dependency:"clock"},
  CREATEDATE:{key:"created",dependency:"created"}, SAVEDATE:{key:"saved",dependency:"saved"},
  PRINTDATE:{key:"printed",dependency:"printed"},
} as const;
export type FieldEvaluation =
  | { status: "resolved"; text: string; dependencies: readonly FieldDependency[] }
  | { status: "preserved"; text: string; reason: "locked" | "unsupported" | "malformed" | "unresolved" | "structured"; dependencies: readonly FieldDependency[] }
  | { status: "error"; text: string; reason: "missing-bookmark"; dependencies: readonly FieldDependency[] };

const numericCommands = new Set<string>(["PAGE", "NUMPAGES", "SECTION", "SECTIONPAGES"]);
const referenceCommands = new Set<string>(["REF", "PAGEREF"]);
const numericRegistry: Record<NumericFieldCommand, {
  key: "pageNumber" | "totalPages" | "sectionNumber" | "sectionPages";
  dependency: FieldDependency["kind"];
}> = {
  PAGE: { key: "pageNumber", dependency: "page" },
  NUMPAGES: { key: "totalPages", dependency: "document-pages" },
  SECTION: { key: "sectionNumber", dependency: "section" },
  SECTIONPAGES: { key: "sectionPages", dependency: "section-pages" },
};

/** Compile only the deliberately supported subset. Unknown switches are
 * never ignored, even if the command itself is recognized. */
export function compileFieldInstruction(raw: string): EvaluatableField | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || !parsed.command) return undefined;
  const args = parsed.tokens.slice(1);
  if(parsed.command==="STYLEREF"){
    const name=args[0];
    if(!name||(name.kind!=="quoted"&&name.kind!=="word")||
       !name.value.trim()||name.value.length>128||
       /[\r\n\t\\]/.test(name.value))return undefined;
    let lastOnPage=false;
    let output:"number"|"position"|undefined;
    for(const token of args.slice(1)){
      if(token.kind!=="switch")return undefined;
      const name=token.value.toLowerCase();
      if(name==="l"){
        if(lastOnPage)return undefined;
        lastOnPage=true;
      }else if(name==="n"||name==="p"){
        if(output)return undefined;
        output=name==="n"?"number":"position";
      }else return undefined;
    }
    return output?{type:"STYLEREF",style:name.value,lastOnPage,output}
      :{type:"STYLEREF",style:name.value,lastOnPage};
  }
  if(parsed.command==="SEQ"){
    const identifier=args[0];
    if(!identifier||identifier.kind!=="word"||!/^\p{L}[\p{L}\p{N}_]{0,39}$/u.test(identifier.value))return undefined;
    const field:SequenceField={type:"SEQ",identifier:identifier.value.toLowerCase(),operation:"next"};
    const seen=new Set<string>();
    for(let i=1;i<args.length;i++){
      const token=args[i]!;
      if(token.kind!=="switch")return undefined;
      const name=token.value.toLowerCase();
      if(seen.has(name))return undefined;
      seen.add(name);
      if(name==="n"||name==="c"||name==="r"){
        if(["n","c","r"].filter(s=>seen.has(s)).length>1)return undefined;
        field.operation=name==="c"?"repeat":name==="r"?"reset":"next";
        if(name==="r"){
          const value=args[++i];
          if(value?.kind!=="word"||!/^\d{1,7}$/.test(value.value)||!validNumber(Number(value.value)))return undefined;
          field.reset=Number(value.value);
        }
      }else if(name==="s"){
        const value=args[++i];
        if(value?.kind!=="word"||! /^[1-9]$/.test(value.value))return undefined;
        field.headingLevel=Number(value.value);
      }else if(name==="*"){
        const value=args[++i];
        if(value?.kind!=="word")return undefined;
        const format=value.value.toUpperCase()==="ARABIC"?"decimal":pageNumberFormatFromSwitch(value.value);
        if(!format)return undefined;
        field.format=format;
      }else return undefined;
    }
    // Combined reset/repeat and chapter reset semantics are not qualified.
    if(field.headingLevel!==undefined&&field.operation!=="next")return undefined;
    return field;
  }
  if (temporalCommands.has(parsed.command)) {
    const type=parsed.command as TemporalFieldCommand;
    if(!args.length)return {type,temporal:true};
    if(args.length!==2||args[0]?.kind!=="switch"||args[0].value!=="@"||
       args[1]?.kind!=="quoted"||!supportsTemporalPicture(args[1].value))return undefined;
    return {type,temporal:true,picture:args[1].value};
  }
  if (numericCommands.has(parsed.command)) {
    const type = parsed.command as NumericFieldCommand;
    if (args.length === 0) return { type };
    if (args.length !== 2 || args[0]?.kind !== "switch" || args[0].value !== "*" ||
        args[1]?.kind !== "word") return undefined;
    const format = pageNumberFormatFromSwitch(args[1].value);
    return format ? { type, format } : undefined;
  }
  if (referenceCommands.has(parsed.command)) {
    const target = args[0];
    if (!target || target.kind === "switch" || !target.value) return undefined;
    const hyperlink = args.length === 2 && args[1]?.kind === "switch" &&
      args[1].value.toLowerCase() === "h";
    if (args.length !== 1 && !hyperlink) return undefined;
    const type = parsed.command as ReferenceFieldCommand;
    return hyperlink ? { type, bookmark: target.value, hyperlink: true } : { type, bookmark: target.value };
  }
  return undefined;
}

function preserved(text: string, reason: Extract<FieldEvaluation, {status:"preserved"}>["reason"],
  dependencies: readonly FieldDependency[] = []): FieldEvaluation {
  return { status: "preserved", text, reason, dependencies };
}

/** Bound numeric formatting work, especially Roman conversion, and reject
 * fractional/nonfinite layout values instead of producing bogus caches. */
function validNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 1_000_000;
}

export function evaluateField(
  field: EvaluatableField, context: FieldEvaluationContext, cachedText: string,
  locked = false,
): FieldEvaluation {
  if (locked) return preserved(cachedText, "locked");
  if(field.type==="STYLEREF"){
    const dependencies:FieldDependency[]=[{kind:"style-text",name:field.style,lastOnPage:field.lastOnPage}];
    const result=context.styleRefText?.(field.style,field.lastOnPage,field.output??"text");
    return typeof result==="string"&&result.length>0
      ? {status:"resolved",text:result,dependencies}
      : preserved(cachedText,"unresolved",dependencies);
  }
  if(field.type==="SEQ"){
    const dependencies:FieldDependency[]=[{kind:"sequence",name:field.identifier}];
    if(!validNumber(context.sequenceValue))return preserved(cachedText,"unresolved",dependencies);
    return {status:"resolved",text:formatPageNumber(context.sequenceValue,field.format),dependencies};
  }
  if ("temporal" in field) {
    const entry=temporalRegistry[field.type];
    const dependencies:FieldDependency[]=[{kind:entry.dependency}];
    const value=context.temporal?.[entry.key];
    if(value===undefined)return preserved(cachedText,"unresolved",dependencies);
    const picture=field.picture??(field.type==="TIME"?"HH:mm":context.temporal?.locale==="pt-BR"?"dd/MM/yyyy":"M/d/yyyy");
    if(!supportsTemporalPicture(picture))return preserved(cachedText,"unsupported",dependencies);
    const text=formatTemporalPicture(value,picture,context.temporal);
    return text===undefined?preserved(cachedText,"unresolved",dependencies):{status:"resolved",text,dependencies};
  }
  if ("bookmark" in field) {
    const dependencies: FieldDependency[] = [{ kind: field.type === "REF" ? "bookmark-text" : "bookmark-page", name: field.bookmark }];
    const value = field.type === "REF" ? context.bookmarkText?.(field.bookmark) : context.bookmarkPage?.(field.bookmark);
    if (value === null) return { status: "error", reason: "missing-bookmark", text: "Error! Bookmark not defined.", dependencies };
    if (field.type === "REF" && typeof value === "string") {
      return { status: "resolved", text: value, dependencies };
    }
    if (typeof value === "number" && validNumber(value)) {
      return { status: "resolved", text: String(value), dependencies };
    }
    return preserved(cachedText, "unresolved", dependencies);
  }
  const entry = numericRegistry[field.type];
  const dependencies: FieldDependency[] = [{ kind: entry.dependency } as FieldDependency];
  const value = context[entry.key];
  if (!validNumber(value)) return preserved(cachedText, "unresolved", dependencies);
  return { status: "resolved", text: formatPageNumber(value, field.format), dependencies };
}

export function evaluateFieldInstruction(
  raw: string, context: FieldEvaluationContext, cachedText: string, locked = false,
): FieldEvaluation {
  if (locked) return preserved(cachedText, "locked");
  if (parseFieldInstruction(raw).error) return preserved(cachedText, "malformed");
  const field = compileFieldInstruction(raw);
  return field ? evaluateField(field, context, cachedText) : preserved(cachedText, "unsupported");
}

/** Read-only evaluation of a scalar complex span. A caller must provide a
 * valid graph and cached result. Nested operands/results, no separator and
 * multi-paragraph caches are not scalar replacement candidates. */
export function evaluateScalarFieldSpan(span: FieldStorySpan, context: FieldEvaluationContext, cachedText: string): FieldEvaluation {
  if (span.beginMarker.fieldLock) return preserved(cachedText, "locked");
  if (!span.end) return preserved(cachedText, "malformed");
  if (!span.separator || span.begin.paragraphIndex !== span.end.paragraphIndex ||
      span.code.some(p => p.kind !== "instruction") || span.result.some(p => p.kind !== "run"))
    return preserved(cachedText, "structured");
  const raw = span.code.map(p => p.kind === "instruction" ? p.raw : "").join("");
  return evaluateFieldInstruction(raw, context, cachedText);
}
