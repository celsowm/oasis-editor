import { NumberingRegistry } from "../../ir/DocumentIR.js";
import { parseXml, childElements, firstChild, getAttr } from "./XmlUtils.js";
import { OPCPackage } from "../OPCGraphBuilder.js";

export class NumberingParser {
  parse(opc: OPCPackage): NumberingRegistry {
    const registry = new NumberingRegistry();
    const numPart = opc.parts.get("word/numbering.xml");
    if (!numPart) return registry;

    const doc = parseXml(numPart.content);
    const root = doc.documentElement;

    for (const abstractNumEl of childElements(root, "abstractNum")) {
      const abstractNumId = getAttr(abstractNumEl, "abstractNumId");
      if (!abstractNumId) continue;

      const levels: any[] = [];
      for (const lvlEl of childElements(abstractNumEl, "lvl")) {
        const level = parseInt(getAttr(lvlEl, "ilvl") ?? "0", 10);
        const numFmt = getAttr(firstChild(lvlEl, "numFmt"), "val");
        const lvlText = getAttr(firstChild(lvlEl, "lvlText"), "val");
        const start = parseInt(getAttr(firstChild(lvlEl, "start"), "val") ?? "1", 10);

        levels.push({
          level,
          format: this.mapNumFmt(numFmt),
          text: lvlText ?? undefined,
          start,
          paragraphProps: this.parseParagraphProperties(lvlEl),
          runProps: this.parseRunProperties(lvlEl),
        });
      }

      registry.addAbstract({ abstractNumId, levels });
    }

    for (const numEl of childElements(root, "num")) {
      const numId = getAttr(numEl, "numId");
      const abstractNumId = getAttr(firstChild(numEl, "abstractNumId"), "val");
      if (numId && abstractNumId) {
        registry.addConcrete({ numId, abstractNumId });
      }
    }

    return registry;
  }

  private parseParagraphProperties(el: Element): Record<string, unknown> | undefined {
    const pPr = firstChild(el, "pPr");
    if (!pPr) return undefined;
    const props: Record<string, unknown> = {};
    const jc = getAttr(firstChild(pPr, "jc"), "val");
    if (jc) props.align = jc;
    return Object.keys(props).length > 0 ? props : undefined;
  }

  private parseRunProperties(el: Element): Record<string, unknown> | undefined {
    const rPr = firstChild(el, "rPr");
    if (!rPr) return undefined;
    const marks: Record<string, unknown> = {};
    // Simplified run props extraction for numbering levels
    return Object.keys(marks).length > 0 ? marks : undefined;
  }

  private mapNumFmt(fmt: string | null): any {
    if (!fmt) return "decimal";
    switch (fmt.toLowerCase()) {
      case "bullet": return "bullet";
      case "decimal": return "decimal";
      case "lowerletter": return "lowerLetter";
      case "upperletter": return "upperLetter";
      case "lowerroman": return "lowerRoman";
      case "upperroman": return "upperRoman";
      default: return "decimal";
    }
  }
}
