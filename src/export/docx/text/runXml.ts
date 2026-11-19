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
import { serializeMathExpression } from "./mathXml.js";
import {
  mergeRunOoxmlSourceIntoGeneratedXml,
  serializeRunFromOoxmlSource,
} from "./sourceRunXml.js";
import {
  serializeDeletionRunContent,
  serializeMoveRangeMarker,
  serializeRunRevisionWrapper,
} from "./revisionXml.js";

export function serializeRun(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  if (run.revisionRangeMarker) {
    return serializeMoveRangeMarker(run.revisionRangeMarker);
  }
  if ((run as { __isFootnoteRefMarker?: boolean }).__isFootnoteRefMarker) {
    return serializeFootnoteRefMarker();
  }
  if ((run as { __isEndnoteRefMarker?: boolean }).__isEndnoteRefMarker) {
    return serializeEndnoteRefMarker();
  }

  if (run.kind === "opaque") {
    const trusted = context.authorizedOpaqueFragments?.get(run.opaque.fragmentXml);
    if (!trusted || run.text !== "\uFFFC" ||
        trusted.signature !== run.opaque.signature ||
        trusted.kind !== run.opaque.objectKind ||
        JSON.stringify(trusted.relationshipIds) !== JSON.stringify(run.opaque.relationshipIds)) {
      throw new Error("Opaque DOCX objects require source-backed export with an unchanged, authorized source fragment.");
    }
    return `<w:r>${serializeRunProperties(run.styles)}${run.opaque.fragmentXml}</w:r>`;
  }

  const preservedSourceXml = serializeRunFromOoxmlSource(run);
  if (preservedSourceXml) {
    return preservedSourceXml;
  }

  const materializedRunStyle = materializeRunStyle(
    run,
    paragraphStyleId,
    styles,
  );
  const runProps = (): string => serializeRunProperties(materializedRunStyle);
  const asText = (): string =>
    `<w:r>${runProps()}${serializeRunText(run.text)}</w:r>`;

  // Dispatch by run kind, exhaustively: adding a `RunKind` variant forces a
  // branch here (compile error otherwise), so DOCX export can never silently
  // drop a new inline object. The object serializers may still decline (return
  // null) — e.g. an image with no relationship — in which case the run falls
  // back to plain text, preserving the previous behaviour.
  const generatedXml = visitRun(run, {
    footnoteReference: (r): string =>
      serializeFootnoteReference(r, materializedRunStyle, context) ?? asText(),
    endnoteReference: (r): string =>
      serializeEndnoteReference(r, materializedRunStyle, context) ?? asText(),
    fieldChar: (r): string => serializeFieldCharRun(r.fieldChar!, runProps()),
    fieldInstruction: (r): string =>
      serializeInstrTextRun(r.fieldInstruction!, runProps()),
    field: (r): string =>
      serializeFieldRun(
        r.field!,
        runProps(),
        r.text,
      ),
    textBox: (r): string =>
      serializeTextBoxRun(
        r,
        r.textBox!,
        context,
        styles,
        runProps(),
        serializeBlocksXml,
      ),
    image: (r): string => {
      const rId = context.imageMap.get(r.id);
      if (rId) {
        const result = serializeImageRun(r.id, rId, context, runProps());
        if (result !== null) {
          return result;
        }
      }
      return asText();
    },
    sym: (r): string =>
      `<w:r>${runProps()}<w:sym w:font="${escapeXml(r.sym!.font)}" w:char="${r.sym!.char}"/></w:r>`,
    math: (r): string => serializeMathExpression(r.math!),
    opaque: (): string => { throw new Error("Unexpected opaque serializer dispatch"); },
    text: (): string => asText(),
  });

  return mergeRunOoxmlSourceIntoGeneratedXml(run, generatedXml);
}

export function serializeRunWithRelationships(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  let runXml = serializeRun(
    run,
    context,
    paragraphStyleId,
    styles,
    serializeBlocksXml,
  );
  if (run.revisionRangeMarker) {
    return runXml;
  }
  if (run.revision?.type === "delete") {
    runXml = serializeDeletionRunContent(runXml);
  }

  const href = run.styles?.link;
  const linkedXml = href ? wrapRunWithHyperlink(runXml, href, context) : runXml;
  return run.revision
    ? serializeRunRevisionWrapper(linkedXml, run.revision)
    : linkedXml;
}
