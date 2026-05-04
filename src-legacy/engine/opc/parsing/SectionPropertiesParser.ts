import { BlockNode } from "../../../core/document/BlockTypes.js";
import { parseXml, firstChild, getAttr } from "./XmlUtils.js";
import { ParseContext } from "./ParseContext.js";
import { BlockParser } from "./BlockParser.js";
import { RelationshipResolver } from "./RelationshipResolver.js";

export class SectionPropertiesParser {
  private resolver: RelationshipResolver;
  private blockParser: BlockParser;

  constructor(resolver: RelationshipResolver, blockParser: BlockParser) {
    this.resolver = resolver;
    this.blockParser = blockParser;
  }

  parse(body: Element | null, ctx: ParseContext): { header?: BlockNode[]; footer?: BlockNode[] } {
    const result: { header?: BlockNode[]; footer?: BlockNode[] } = {};
    if (!body) return result;

    const sectPr = firstChild(body, "sectPr");
    if (!sectPr) return result;

    for (const child of sectPr.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = (child as Element).localName;
      if (tag === "headerReference" || tag === "footerReference") {
        const type = getAttr(child as Element, "type") || "default";
        if (type !== "default") continue;
        const relId = getAttr(child as Element, "id");
        if (!relId) continue;
        const targetPart = this.resolver.resolveRelationship(ctx.currentPart, relId, ctx.package);
        if (!targetPart) continue;
        const hfDoc = parseXml(targetPart.content);
        const hfRoot = hfDoc.documentElement;
        const hfBlocks: BlockNode[] = [];
        for (const node of hfRoot.childNodes) {
          if (node.nodeType !== 1) continue;
          const parsed = this.blockParser.parseBlockElement(node as Element, { ...ctx, currentPart: targetPart });
          hfBlocks.push(...parsed);
        }
        if (tag === "headerReference") result.header = hfBlocks;
        else result.footer = hfBlocks;
      }
    }

    return result;
  }
}
