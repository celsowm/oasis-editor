import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "../../../core/model.js";
import type { DocContext } from "../docxTypes.js";
import { serializeTableXml } from "../tableXml.js";
import { serializeParagraphProperties } from "./paragraphPropertiesXml.js";
import { serializeRunWithRelationships } from "./runXml.js";
import { serializeDropCapFrameParagraph } from "./dropCapXml.js";

export function serializeBlocksXml(
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
): string {
  return blocks
    .map((block) => {
      if (block.type === "table") {
        const pageBreakXml = block.style?.pageBreakBefore
          ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
          : "";
        return (
          pageBreakXml +
          serializeTableXml(block, (paragraph, cell) =>
            serializeParagraphXml(paragraph, context, styles, {
              align: cell.style?.horizontalAlign,
            }),
          )
        );
      }
      return serializeParagraphXml(block, context, styles);
    })
    .join("");
}

export function serializeParagraphXml(
  paragraph: EditorParagraphNode,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const runs =
    paragraph.runs.length > 0 ? paragraph.runs : [{ id: "", text: "" }];
  // A drop cap is emitted as a preceding standalone frame paragraph (Word's
  // representation); the body paragraph itself serializes unchanged.
  const dropCapFrame = paragraph.dropCap
    ? serializeDropCapFrameParagraph(paragraph.dropCap)
    : "";
  return `${dropCapFrame}<w:p>${serializeParagraphProperties(
    paragraph,
    context.numberingInfo,
    styles,
    overrides,
  )}${runs
    .map((run) =>
      serializeRunWithRelationships(
        run,
        context,
        paragraph.style?.styleId,
        styles,
      ),
    )
    .join("")}</w:p>`;
}
