import type { DocContext } from "../docxTypes.js";
import { escapeXml, OFFICE_REL_NS } from "../xmlUtils.js";
import {
  buildDrawingXml,
  buildSrcRect,
  buildXfrmAttrs,
} from "./drawingContainerXml.js";
export function serializeImageRun(
  runId: string,
  rId: string,
  context: DocContext,
  rPrXml: string,
): string | null {
  const img = context.images.find((i) => i.rId === rId);
  if (!img) {
    return null;
  }

  const docPrId = (parseInt(rId.replace(/\D+/g, ""), 10) || 0) + 1;
  const altAttr =
    img.alt !== undefined
      ? ` descr="${escapeXml(img.alt)}" title="${escapeXml(img.alt)}"`
      : "";
  const xfrmAttrs = buildXfrmAttrs(img);
  const srcRect = buildSrcRect(img.crop);
  const fill =
    img.fillMode === "tile"
      ? "<a:tile/>"
      : "<a:stretch><a:fillRect/></a:stretch>";
  const blipRelAttr =
    img.kind === "linked" ? `r:link="${rId}"` : `r:embed="${rId}"`;
  const picXml = `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture"${altAttr}/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip ${blipRelAttr} xmlns:r="${OFFICE_REL_NS}"/>${srcRect}${fill}</pic:blipFill><pic:spPr><a:xfrm${xfrmAttrs}><a:off x="0" y="0"/><a:ext cx="${img.cx}" cy="${img.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  const drawing = buildDrawingXml(img, docPrId, altAttr, picXml);
  return `<w:r>${rPrXml}${drawing}</w:r>`;
}
