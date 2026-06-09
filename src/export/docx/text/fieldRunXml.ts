import type { EditorTextStyle } from "../../../core/model.js";
import { serializeRunProperties } from "./runPropertiesXml.js";

export function serializeFieldRun(
  fieldType: "PAGE" | "NUMPAGES",
  rPrXml: string,
): string {
  const instr = fieldType === "PAGE" ? " PAGE " : " NUMPAGES ";
  return `<w:fldSimple w:instr="${instr}"><w:r>${rPrXml}<w:t>1</w:t></w:r></w:fldSimple>`;
}
