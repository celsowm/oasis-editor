import type { EditorNamedStyle, EditorTextRun } from "@/core/model.js";
import { visitRun } from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";
import { materializeRunStyle } from "./styleMaterialization.js";
import { serializeRunProperties } from "./runPropertiesXml.js";
import { serializeRunText } from "./runTextXml.js";
import { serializeImageRun } from "./imageRunXml.js";
import {
  serializeTextBoxRun,
  type SerializeBlocksXml,
} from "./textBoxRunXml.js";
import {
  serializeFieldRun,
  serializeFieldCharRun,
  serializeInstrTextRun,
} from "./fieldRunXml.js";
import {
  serializeFootnoteRefMarker,
  serializeFootnoteReference,
} from "./footnoteRunXml.js";
import {
  serializeEndnoteRefMarker,
  serializeEndnoteReference,
} from "./endnoteRunXml.js";
import { wrapRunWithHyperlink } from "./hyperlinkXml.js";

export function serializeRun(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  if ((run as { __isFootnoteRefMarker?: boolean }).__isFootnoteRefMarker) {
    return serializeFootnoteRefMarker();
  }
  if ((run as { __isEndnoteRefMarker?: boolean }).__isEndnoteRefMarker) {
    return serializeEndnoteRefMarker();
  }

  const materializedRunStyle = materializeRunStyle(
    run,
    paragraphStyleId,
    styles,
  );
  const runProps = () => serializeRunProperties(materializedRunStyle);
  const asText = () => `<w:r>${runProps()}${serializeRunText(run.text)}</w:r>`;

  // Dispatch by run kind, exhaustively: adding a `RunKind` variant forces a
  // branch here (compile error otherwise), so DOCX export can never silently
  // drop a new inline object. The object serializers may still decline (return
  // null) — e.g. an image with no relationship — in which case the run falls
  // back to plain text, preserving the previous behaviour.
  return visitRun(run, {
    footnoteReference: (r) =>
      serializeFootnoteReference(r, materializedRunStyle, context) ?? asText(),
    endnoteReference: (r) =>
      serializeEndnoteReference(r, materializedRunStyle, context) ?? asText(),
    fieldChar: (r) => serializeFieldCharRun(r.fieldChar!, runProps()),
    fieldInstruction: (r) =>
      serializeInstrTextRun(r.fieldInstruction!, runProps()),
    field: (r) => serializeFieldRun(r.field!.type, runProps()),
    textBox: (r) =>
      serializeTextBoxRun(
        r,
        r.textBox!,
        context,
        styles,
        runProps(),
        serializeBlocksXml,
      ),
    image: (r) => {
      const rId = context.imageMap.get(r.id);
      if (rId) {
        const result = serializeImageRun(r.id, rId, context, runProps());
        if (result !== null) {
          return result;
        }
      }
      return asText();
    },
    sym: (r) =>
      `<w:r>${runProps()}<w:sym w:font="${escapeXml(r.sym!.font)}" w:char="${r.sym!.char}"/></w:r>`,
    text: () => asText(),
  });
}

export function serializeRunWithRelationships(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  const runXml = serializeRun(
    run,
    context,
    paragraphStyleId,
    styles,
    serializeBlocksXml,
  );
  const href = run.styles?.link;
  if (!href) {
    return runXml;
  }

  return wrapRunWithHyperlink(runXml, href, context);
}
