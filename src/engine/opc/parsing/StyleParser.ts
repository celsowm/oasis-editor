import { StyleRegistry } from "../../ir/DocumentIR.js";
import { parseXml, childElements, firstChild, getAttr, hasChild } from "./XmlUtils.js";
import { OPCPackage } from "../OPCGraphBuilder.js";

export class StyleParser {
  parse(opc: OPCPackage): StyleRegistry {
    const registry = new StyleRegistry();
    const stylesPart = opc.parts.get("word/styles.xml");
    if (!stylesPart) return registry;

    const doc = parseXml(stylesPart.content);
    const root = doc.documentElement;

    for (const styleEl of childElements(root, "style")) {
      const styleId = getAttr(styleEl, "styleId");
      const type = getAttr(styleEl, "type");
      if (!styleId || !type) continue;

      const entry = {
        styleId,
        type: type as any,
        name: getAttr(firstChild(styleEl, "name"), "val") ?? undefined,
        basedOn: getAttr(firstChild(styleEl, "basedOn"), "val") ?? undefined,
        next: getAttr(firstChild(styleEl, "next"), "val") ?? undefined,
        isDefault: getAttr(styleEl, "default") === "1",
        qFormat: hasChild(styleEl, "qFormat"),
        paragraphProps: this.parseParagraphProperties(styleEl, true),
        runProps: this.parseRunProperties(styleEl, true),
      };
      registry.add(entry);
    }

    return registry;
  }

  private parseParagraphProperties(el: Element, fromStyle: boolean = false): Record<string, unknown> | undefined {
    const pPr = fromStyle ? firstChild(el, "pPr") : el;
    if (!pPr) return undefined;
    const props: Record<string, unknown> = {};

    const jc = getAttr(firstChild(pPr, "jc"), "val");
    if (jc) props.align = jc;

    const spacing = firstChild(pPr, "spacing");
    if (spacing) {
      const before = getAttr(spacing, "before");
      const after = getAttr(spacing, "after");
      const line = getAttr(spacing, "line");
      if (before) props.spaceBefore = parseInt(before, 10);
      if (after) props.spaceAfter = parseInt(after, 10);
      if (line) props.lineSpacing = parseInt(line, 10);
    }

    const ind = firstChild(pPr, "ind");
    if (ind) {
      const left = getAttr(ind, "left");
      const right = getAttr(ind, "right");
      const firstLine = getAttr(ind, "firstLine");
      if (left) props.indentLeft = parseInt(left, 10);
      if (right) props.indentRight = parseInt(right, 10);
      if (firstLine) props.indentFirstLine = parseInt(firstLine, 10);
    }

    return Object.keys(props).length > 0 ? props : undefined;
  }

  private parseRunProperties(el: Element, fromStyle: boolean = false): Record<string, unknown> | undefined {
    const rPr = fromStyle ? firstChild(el, "rPr") : el;
    if (!rPr) return undefined;
    return this.buildMarks(rPr) as unknown as Record<string, unknown>;
  }

  private buildMarks(rPr: Element | null): Record<string, unknown> {
    if (!rPr) return {};
    const marks: Record<string, unknown> = {};

    if (hasChild(rPr, "b") || hasChild(rPr, "bCs")) marks.bold = true;
    if (hasChild(rPr, "i") || hasChild(rPr, "iCs")) marks.italic = true;
    if (hasChild(rPr, "u")) {
      const uEl = firstChild(rPr, "u");
      const uVal = getAttr(uEl, "val");
      if (uVal !== "none" && uVal !== "0") marks.underline = true;
    }
    if (hasChild(rPr, "strike")) marks.strike = true;
    if (hasChild(rPr, "dstrike")) marks.strike = true;
    const color = getAttr(firstChild(rPr, "color"), "val");
    if (color) marks.color = color;

    const highlight = getAttr(firstChild(rPr, "highlight"), "val");
    if (highlight && highlight !== "none") marks.highlight = highlight;

    const sz = getAttr(firstChild(rPr, "sz"), "val");
    if (sz) marks.fontSize = parseInt(sz, 10) / 2;

    const vertAlign = getAttr(firstChild(rPr, "vertAlign"), "val");
    if (vertAlign) marks.vertAlign = vertAlign;

    const rFonts = firstChild(rPr, "rFonts");
    if (rFonts) {
      marks.fontFamily = getAttr(rFonts, "ascii") || getAttr(rFonts, "hAnsi") || undefined;
    }

    return marks;
  }
}
