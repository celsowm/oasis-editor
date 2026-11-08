import type { EditorFieldChar, PageNumberFormat } from "@/core/model.js";
import { pageNumberFormatToSwitch } from "@/core/format/pageNumberFormat.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";

export function serializeFieldRun(
  fieldType: "PAGE" | "NUMPAGES",
  format: PageNumberFormat | undefined,
  rPrXml: string,
): string {
  const base = fieldType === "PAGE" ? " PAGE " : " NUMPAGES ";
  const switchText = pageNumberFormatToSwitch(format);
  const instr = switchText ? ` ${base.trim()} \\* ${switchText} ` : base;
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
