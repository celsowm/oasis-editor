import type { EditorDropCap } from "@/core/model.js";
import { serializeRunProperties } from "./runPropertiesXml.js";
import { serializeRunText } from "./runTextXml.js";

/**
 * Serializes a drop cap back into Word's representation: a standalone frame
 * paragraph (`w:framePr/@dropCap`) holding the cap letter, emitted immediately
 * before the wrapping body paragraph. The inverse of `parseDropCapFrame`; the
 * `framePr`/spacing scaffolding is regenerated from the descriptor.
 */
export function serializeDropCapFrameParagraph(dropCap: EditorDropCap): string {
  const runProps = serializeRunProperties(dropCap.style);
  const framePr =
    `<w:framePr w:dropCap="${dropCap.type}" w:lines="${dropCap.lines}"` +
    ` w:wrap="around" w:vAnchor="text" w:hAnchor="text"/>`;
  const pPr =
    `<w:pPr><w:keepNext/>${framePr}` +
    `<w:spacing w:after="0"/>${runProps ? `<w:rPr>${stripRpr(runProps)}</w:rPr>` : ""}` +
    `</w:pPr>`;
  return `<w:p>${pPr}<w:r>${runProps}${serializeRunText(dropCap.text)}</w:r></w:p>`;
}

/** `serializeRunProperties` already returns a `<w:rPr>…</w:rPr>` wrapper; unwrap
 * it so it can be re-wrapped inside the paragraph mark's own `<w:rPr>`. */
function stripRpr(rPr: string): string {
  return rPr.replace(/^<w:rPr>/, "").replace(/<\/w:rPr>$/, "");
}
