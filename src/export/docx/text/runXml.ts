import type { EditorNamedStyle, EditorTextRun } from "../../../core/model.js";
import type { DocContext } from "../docxTypes.js";
import { materializeRunStyle } from "./styleMaterialization.js";
import { serializeRunProperties } from "./runPropertiesXml.js";
import { serializeRunText } from "./runTextXml.js";
import { serializeImageRun } from "./imageRunXml.js";
import { serializeTextBoxRun } from "./textBoxRunXml.js";
import { serializeFieldRun } from "./fieldRunXml.js";
import {
  serializeFootnoteRefMarker,
  serializeFootnoteReference,
} from "./footnoteRunXml.js";
import { wrapRunWithHyperlink } from "./hyperlinkXml.js";

export function serializeRun(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  if ((run as { __isFootnoteRefMarker?: boolean }).__isFootnoteRefMarker) {
    return serializeFootnoteRefMarker();
  }

  const materializedRunStyle = materializeRunStyle(
    run,
    paragraphStyleId,
    styles,
  );
  if (run.footnoteReference) {
    const result = serializeFootnoteReference(
      run,
      materializedRunStyle,
      context,
    );
    if (result !== null) {
      return result;
    }
  }
  if (run.field) {
    return serializeFieldRun(
      run.field.type,
      serializeRunProperties(materializedRunStyle),
    );
  }
  if (run.textBox) {
    return serializeTextBoxRun(
      run,
      run.textBox,
      context,
      styles,
      serializeRunProperties(materializedRunStyle),
    );
  }
  if (run.image) {
    const rId = context.imageMap.get(run.id);
    if (rId) {
      const result = serializeImageRun(
        run.id,
        rId,
        context,
        serializeRunProperties(materializedRunStyle),
      );
      if (result !== null) {
        return result;
      }
    }
  }
  return `<w:r>${serializeRunProperties(materializedRunStyle)}${serializeRunText(run.text)}</w:r>`;
}

export function serializeRunWithRelationships(
  run: EditorTextRun,
  context: DocContext,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  const runXml = serializeRun(run, context, paragraphStyleId, styles);
  const href = run.styles?.link;
  if (!href) {
    return runXml;
  }

  return wrapRunWithHyperlink(runXml, href, context);
}
