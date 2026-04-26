import {
  BlockNode,
  MarkSet,
  TextRun,
  ImageNode,
  EquationNode,
  ChartNode,
} from "../../../core/document/BlockTypes.js";
import { createEquation, createChart } from "../../../core/document/DocumentFactory.js";
import { genId } from "../../../core/utils/IdGenerator.js";
import { parseXml, getAttr, firstChild, findDeep, arrayBufferToBase64 } from "./XmlUtils.js";
import { emuToPx } from "../../../core/utils/Units.js";
import { ParseContext } from "./ParseContext.js";
import { RelationshipResolver } from "./RelationshipResolver.js";

let blockCounter = 2000;
const nextBlockId = (): string => `block:wml:${blockCounter++}`;

export class DrawingParser {
  private resolver: RelationshipResolver;

  constructor(resolver: RelationshipResolver) {
    this.resolver = resolver;
  }

  parseDrawing(el: Element, ctx: ParseContext): ImageNode | ChartNode | null {
    const chartEl = findDeep(el, "chart");
    if (chartEl) {
      return this.parseChart(el, chartEl, ctx);
    }

    const blip = findDeep(el, "blip");
    if (!blip) return null;

    const embedId = getAttr(blip, "embed");
    if (!embedId) return null;

    const rel = this.resolver.findRelationship(ctx.currentPart, embedId);
    if (!rel) return null;

    const imagePart = ctx.package.parts.get(rel.target);
    if (!imagePart) return null;

    const base64 = arrayBufferToBase64(imagePart.content);
    const src = `data:${imagePart.contentType};base64,${base64}`;

    const extent = findDeep(el, "extent");
    let width: number | undefined;
    let height: number | undefined;
    if (extent) {
      const cx = parseInt(getAttr(extent, "cx") ?? "0", 10);
      const cy = parseInt(getAttr(extent, "cy") ?? "0", 10);
      if (cx) width = emuToPx(cx);
      if (cy) height = emuToPx(cy);
    }

    const docPr = findDeep(el, "docPr");
    const alt = getAttr(docPr, "descr") || getAttr(docPr, "title") || undefined;

    return {
      id: nextBlockId(),
      kind: "image" as const,
      src,
      alt,
      width: width ?? 300,
      height: height ?? 200,
      naturalWidth: width ?? 300,
      naturalHeight: height ?? 200,
      align: "left" as const,
    };
  }

  parseVmlPicture(el: Element, ctx: ParseContext): ImageNode | null {
    const imagedata = findDeep(el, "imagedata");
    if (!imagedata) return null;

    const relId = getAttr(imagedata, "id");
    if (!relId) return null;

    const rel = this.resolver.findRelationship(ctx.currentPart, relId);
    if (!rel) return null;

    const imagePart = ctx.package.parts.get(rel.target);
    if (!imagePart) return null;

    const base64 = arrayBufferToBase64(imagePart.content);
    const src = `data:${imagePart.contentType};base64,${base64}`;

    return {
      id: nextBlockId(),
      kind: "image" as const,
      src,
      width: 300,
      height: 200,
      naturalWidth: 300,
      naturalHeight: 200,
      align: "left" as const,
    };
  }

  parseEquation(el: Element, display: boolean): EquationNode | null {
    const omml = this.serializeNode(el);
    const latex = this.extractLatexFromOMML(el) || "";
    return createEquation(latex, display, undefined, omml || undefined);
  }

  private serializeNode(node: Node): string {
    if ((node as any).toString && typeof (node as any).toString === "function") {
      return (node as any).toString();
    }
    return "";
  }

  private extractLatexFromOMML(node: Element): string | null {
    if (node.localName === "annotation") {
      const encoding = getAttr(node, "encoding");
      if (encoding === "application/x-tex") {
        return node.textContent ?? null;
      }
    }
    for (const child of node.childNodes) {
      if (child.nodeType === 1) {
        const found = this.extractLatexFromOMML(child as Element);
        if (found) return found;
      }
    }
    return null;
  }

  private parseChart(el: Element, chartEl: Element, ctx: ParseContext): ChartNode | null {
    const chartRelId = getAttr(chartEl, "id");
    let chartType = "unknown";
    let title: string | undefined;

    if (chartRelId) {
      const rel = this.resolver.findRelationship(ctx.currentPart, chartRelId);
      if (rel) {
        const chartPart = ctx.package.parts.get(rel.target);
        if (chartPart) {
          const chartTypeResult = this.detectChartType(chartPart.content);
          chartType = chartTypeResult.type;
          title = chartTypeResult.title;
        }
      }
    }

    const extent = findDeep(el, "extent");
    let width = 400;
    let height = 250;
    if (extent) {
      const cx = parseInt(getAttr(extent, "cx") ?? "0", 10);
      const cy = parseInt(getAttr(extent, "cy") ?? "0", 10);
      if (cx) width = emuToPx(cx);
      if (cy) height = emuToPx(cy);
    }

    return {
      id: nextBlockId(),
      kind: "chart" as const,
      chartType,
      title,
      width,
      height,
    };
  }

  private detectChartType(buffer: Uint8Array | ArrayBuffer): { type: string; title?: string } {
    try {
      const text = new TextDecoder().decode(buffer);
      if (text.includes("<c:barChart")) return { type: "bar" };
      if (text.includes("<c:lineChart")) return { type: "line" };
      if (text.includes("<c:pieChart")) return { type: "pie" };
      if (text.includes("<c:doughnutChart")) return { type: "doughnut" };
      if (text.includes("<c:areaChart")) return { type: "area" };
      if (text.includes("<c:scatterChart")) return { type: "scatter" };
      if (text.includes("<c:radarChart")) return { type: "radar" };
      if (text.includes("<c:bubbleChart")) return { type: "bubble" };
      if (text.includes("<c:surfaceChart")) return { type: "surface" };
      const titleMatch = text.match(/<c:chartTitle>.*?<c:tx>.*?<c:t>([^<]+)<\/c:t>/s);
      if (titleMatch) {
        return { type: "unknown", title: titleMatch[1] };
      }
    } catch {
      // ignore
    }
    return { type: "unknown" };
  }
}
