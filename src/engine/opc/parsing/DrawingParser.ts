import {
  BlockNode,
  MarkSet,
  TextRun,
  ImageNode,
  EquationNode,
  ChartNode,
} from "../../../core/document/BlockTypes.js";
import { createEquation, createChart } from "../../../core/document/DocumentFactory.js";
import { parseXml, getAttr, firstChild, findDeep, arrayBufferToBase64 } from "./XmlUtils.js";
import { emuToPx } from "../../../core/utils/Units.js";
import { ParseContext } from "./ParseContext.js";
import { RelationshipResolver } from "./RelationshipResolver.js";

export class DrawingParser {
  private resolver: RelationshipResolver;

  constructor(resolver: RelationshipResolver) {
    this.resolver = resolver;
  }

  parseDrawing(el: Element, ctx: ParseContext): ImageNode | EquationNode | ChartNode | null {
    const blip = findDeep(el, "blip");
    if (blip) {
      const relId = getAttr(blip, "embed");
      if (relId) {
        const rel = this.resolver.findRelationship(ctx.currentPart, relId);
        if (rel) {
          const asset = ctx.assets.get(rel.target);
          if (asset && asset.data) {
            const src = `data:${asset.contentType};base64,${arrayBufferToBase64(asset.data)}`;
            const xfrm = findDeep(el, "xfrm");
            const ext = firstChild(xfrm, "ext");
            const cx = getAttr(ext, "cx");
            const cy = getAttr(ext, "cy");
            return {
              id: ctx.idGenerator.nextImageId(),
              kind: "image",
              src,
              naturalWidth: cx ? emuToPx(parseInt(cx, 10)) : 400,
              naturalHeight: cy ? emuToPx(parseInt(cy, 10)) : 300,
              width: cx ? emuToPx(parseInt(cx, 10)) : 400,
              height: cy ? emuToPx(parseInt(cy, 10)) : 300,
              align: "center",
            };
          }
        }
      }
    }
    return null;
  }

  parseVmlPicture(el: Element, ctx: ParseContext): ImageNode | null {
    const imageData = findDeep(el, "imagedata");
    if (imageData) {
      const relId = getAttr(imageData, "id");
      if (relId) {
        const rel = this.resolver.findRelationship(ctx.currentPart, relId);
        if (rel) {
          const asset = ctx.assets.get(rel.target);
          if (asset && asset.data) {
            const src = `data:${asset.contentType};base64,${arrayBufferToBase64(asset.data)}`;
            return {
              id: ctx.idGenerator.nextImageId(),
              kind: "image",
              src,
              naturalWidth: 400,
              naturalHeight: 300,
              width: 400,
              height: 300,
              align: "center",
            };
          }
        }
      }
    }
    return null;
  }

  parseEquation(el: Element, display: boolean, ctx?: ParseContext): EquationNode | null {
    const annotation = findDeep(el, "annotation");
    let latex = "";
    if (annotation && getAttr(annotation, "encoding") === "application/x-tex") {
      latex = annotation.textContent ?? "";
    } else {
      const tTags = Array.from(el.getElementsByTagNameNS("*", "t"));
      if (tTags.length > 0) {
        latex = tTags.map(t => t.textContent).join("");
      } else {
        latex = el.textContent ?? "";
      }
    }

    const eq: EquationNode = {
      id: ctx ? ctx.idGenerator.nextBlockId() : `eq:${Math.random().toString(36).substr(2, 9)}`,
      kind: "equation",
      latex: latex.trim(),
      display,
      omml: el.outerHTML || el.innerHTML || "<m:oMath></m:oMath>", 
    };
    return eq;
  }
}
