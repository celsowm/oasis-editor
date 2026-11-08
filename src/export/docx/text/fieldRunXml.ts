import type { EditorFieldChar, EditorFieldData } from "@/core/model.js";
import { pageNumberFormatToSwitch } from "@/core/format/pageNumberFormat.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";

export function serializeFieldRun(
  field: EditorFieldData,
  rPrXml: string,
  resultText = "1",
): string {
  let instr: string;
  if (field.type === "DATE") {
    const picture = field.dateFormat ?? "M/d/yyyy";
    instr = ` DATE \\@ "${picture}" `;
  } else {
    const base = field.type === "PAGE" ? " PAGE " : " NUMPAGES ";
    const switchText = pageNumberFormatToSwitch(field.format);
    instr = switchText ? ` ${base.trim()} \\* ${switchText} ` : base;
  }
  return `<w:fldSimple w:instr="${escapeXml(
    instr,
  )}"><w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(
    resultText,
  )}</w:t></w:r></w:fldSimple>`;
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
