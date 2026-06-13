import type { EditorFieldChar } from "../../../core/model.js";
import { escapeXml } from "../xmlUtils.js";

export function serializeFieldRun(
  fieldType: "PAGE" | "NUMPAGES",
  rPrXml: string,
): string {
  const instr = fieldType === "PAGE" ? " PAGE " : " NUMPAGES ";
  return `<w:fldSimple w:instr="${instr}"><w:r>${rPrXml}<w:t>1</w:t></w:r></w:fldSimple>`;
}

/**
 * Serialize a preserved complex-field control char as its own `w:r`. Reproduces
 * `w:fldChar` with its `w:fldCharType` and the `w:fldLock`/`w:dirty` flags so
 * REF/PAGEREF/TOC and unknown fields round-trip 1:1.
 */
export function serializeFieldCharRun(
  fieldChar: EditorFieldChar,
  rPrXml: string,
): string {
  const attrs =
    (fieldChar.fieldLock ? ` w:fldLock="true"` : "") +
    (fieldChar.dirty ? ` w:dirty="true"` : "");
  return `<w:r>${rPrXml}<w:fldChar w:fldCharType="${fieldChar.kind}"${attrs}/></w:r>`;
}

/** Serialize preserved `w:instrText` (the field instruction) as its own `w:r`. */
export function serializeInstrTextRun(
  instruction: string,
  rPrXml: string,
): string {
  return `<w:r>${rPrXml}<w:instrText xml:space="preserve">${escapeXml(
    instruction,
  )}</w:instrText></w:r>`;
}
