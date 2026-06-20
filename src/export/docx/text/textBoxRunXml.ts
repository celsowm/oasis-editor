import type {
  EditorBlockNode,
  EditorNamedStyle,
  EditorTextBoxData,
  EditorTextRun,
} from "@/core/model.js";
import type { DocContext } from "@/export/docx/docxTypes.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";
import { EMU_PER_PX, EMU_PER_PT, OOXML_ROTATION_UNITS } from "./constants.js";
import { buildDrawingContainerXml } from "./drawingContainerXml.js";

/**
 * Serializes a list of blocks (paragraphs/tables) to `w:p`/`w:tbl` XML. A text
 * box's body recurses into this. Injected as a callback by the orchestrator
 * (`blocksXml`) rather than imported, so this module does not import back into
 * `blocksXml` (which serializes runs through `runXml` -> here).
 */
export type SerializeBlocksXml = (
  blocks: EditorBlockNode[],
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
) => string;

function buildTextBoxGraphicXml(
  textBox: EditorTextBoxData,
  cx: number,
  cy: number,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  const shape = textBox.shape;
  const preset = escapeXml(shape?.preset ?? "rect");
  const rotValue = textBox.rotation
    ? Math.round(textBox.rotation * OOXML_ROTATION_UNITS)
    : 0;
  const xfrmRotAttr = rotValue !== 0 ? ` rot="${rotValue}"` : "";

  const fillXml = shape?.fill
    ? `<a:solidFill><a:srgbClr val="${escapeXml(shape.fill.replace(/^#/, ""))}"/></a:solidFill>`
    : "";
  let lnXml = "";
  if (shape?.borderColor || shape?.borderWidthPt !== undefined) {
    const widthAttr =
      shape?.borderWidthPt !== undefined
        ? ` w="${Math.round(shape.borderWidthPt * EMU_PER_PT)}"`
        : "";
    const colorXml = shape?.borderColor
      ? `<a:solidFill><a:srgbClr val="${escapeXml(shape.borderColor.replace(/^#/, ""))}"/></a:solidFill>`
      : "";
    lnXml = `<a:ln${widthAttr}>${colorXml}<a:miter lim="800000"/></a:ln>`;
  }

  const body = textBox.body;
  const bodyAttrs: string[] = [
    'rot="0"',
    `vert="${escapeXml(body?.vert ?? "horz")}"`,
  ];
  bodyAttrs.push(`wrap="${escapeXml(body?.wrap ?? "square")}"`);
  if (body?.paddingLeft !== undefined) {
    bodyAttrs.push(`lIns="${Math.round(body.paddingLeft * EMU_PER_PX)}"`);
  }
  if (body?.paddingTop !== undefined) {
    bodyAttrs.push(`tIns="${Math.round(body.paddingTop * EMU_PER_PX)}"`);
  }
  if (body?.paddingRight !== undefined) {
    bodyAttrs.push(`rIns="${Math.round(body.paddingRight * EMU_PER_PX)}"`);
  }
  if (body?.paddingBottom !== undefined) {
    bodyAttrs.push(`bIns="${Math.round(body.paddingBottom * EMU_PER_PX)}"`);
  }
  bodyAttrs.push(`anchor="${escapeXml(body?.anchor ?? "t")}"`);
  bodyAttrs.push('anchorCtr="0"');
  const autoFitXml = body?.autoFit ? "<a:spAutoFit/>" : "";

  const hasTextBoxContent = textBox.blocks.length > 0;
  const innerXml = hasTextBoxContent
    ? serializeBlocksXml(textBox.blocks, context, styles)
    : "";
  const cNvSpPrXml = hasTextBoxContent
    ? '<wps:cNvSpPr txBox="1"><a:spLocks noChangeArrowheads="1"/></wps:cNvSpPr>'
    : "<wps:cNvSpPr/>";
  const txbxXml = hasTextBoxContent
    ? `<wps:txbx><w:txbxContent>${innerXml}</w:txbxContent></wps:txbx>`
    : "";

  return (
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    "<wps:wsp>" +
    cNvSpPrXml +
    '<wps:spPr bwMode="auto">' +
    `<a:xfrm${xfrmRotAttr}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>` +
    fillXml +
    lnXml +
    "</wps:spPr>" +
    txbxXml +
    `<wps:bodyPr ${bodyAttrs.join(" ")}>${autoFitXml}</wps:bodyPr>` +
    "</wps:wsp>" +
    "</a:graphicData>" +
    "</a:graphic>"
  );
}

export function serializeTextBoxRun(
  run: EditorTextRun,
  textBox: EditorTextBoxData,
  context: DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  rPrXml: string,
  serializeBlocksXml: SerializeBlocksXml,
): string {
  const cx = Math.round(textBox.width * EMU_PER_PX);
  const cy = Math.round(textBox.height * EMU_PER_PX);
  const docPrId = context.textBoxDocPrIds.get(run.id) ?? 1;
  const docPrName = textBox.name ?? "Text Box";
  const altAttr =
    textBox.alt !== undefined
      ? ` descr="${escapeXml(textBox.alt)}" title="${escapeXml(textBox.alt)}"`
      : "";
  const graphicXml = buildTextBoxGraphicXml(
    textBox,
    cx,
    cy,
    context,
    styles,
    serializeBlocksXml,
  );
  const drawing = buildDrawingContainerXml({
    cx,
    cy,
    floating: textBox.floating,
    docPrId,
    docPrName,
    altAttr,
    graphicXml,
  });
  return `<w:r>${rPrXml}${drawing}</w:r>`;
}
