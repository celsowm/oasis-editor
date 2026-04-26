import { AssetRegistry, CommentRegistry, NotesRegistry } from "../../ir/DocumentIR.js";
import { parseXml, getAttr, childElements } from "./XmlUtils.js";
import { OPCPackage } from "../OPCGraphBuilder.js";
import { BlockNode } from "../../../core/document/BlockTypes.js";
import { ParseContext } from "./ParseContext.js";
import { BlockParser } from "./BlockParser.js";

export class AssetParser {
  parse(opc: OPCPackage): AssetRegistry {
    const registry = new AssetRegistry();
    for (const [name, part] of opc.parts) {
      if (part.contentType.startsWith("image/")) {
        const id = name.replace(/[^a-zA-Z0-9]/g, "_");
        registry.add({
          id,
          partName: name,
          contentType: part.contentType,
          data: part.content,
        });
      }
    }
    return registry;
  }
}

export class CommentsParser {
  private blockParser: BlockParser;

  constructor(blockParser: BlockParser) {
    this.blockParser = blockParser;
  }

  parse(opc: OPCPackage, ctx: ParseContext): CommentRegistry {
    const registry = new CommentRegistry();
    const part = opc.parts.get("word/comments.xml");
    if (!part) return registry;

    const doc = parseXml(part.content);
    const root = doc.documentElement;

    for (const child of root.childNodes) {
      const el = child as Element;
      if (el.nodeType !== 1) continue;
      if (el.localName !== "comment") continue;
      const id = getAttr(el, "id");
      if (!id) continue;
      const author = getAttr(el, "author") || undefined;
      const dateStr = getAttr(el, "date");
      const date = dateStr ? new Date(dateStr) : undefined;
      const blocks: BlockNode[] = [];
      for (const p of el.childNodes) {
        if (p.nodeType !== 1) continue;
        const parsed = this.blockParser.parseBlockElement(p as Element, ctx);
        blocks.push(...parsed);
      }
      registry.add({ id, author, date, blocks });
    }
    return registry;
  }
}

export class NotesParser {
  private blockParser: BlockParser;

  constructor(blockParser: BlockParser) {
    this.blockParser = blockParser;
  }

  parseFootnotes(opc: OPCPackage, ctx: ParseContext, notes: NotesRegistry): void {
    const part = opc.parts.get("word/footnotes.xml");
    if (!part) return;
    const doc = parseXml(part.content);
    const root = doc.documentElement;
    for (const child of root.childNodes) {
      const el = child as Element;
      if (el.nodeType !== 1) continue;
      if (el.localName !== "footnote") continue;
      const id = getAttr(el, "id");
      if (!id) continue;
      const blocks: BlockNode[] = [];
      for (const p of el.childNodes) {
        if (p.nodeType !== 1) continue;
        const parsed = this.blockParser.parseBlockElement(p as Element, ctx);
        blocks.push(...parsed);
      }
      notes.add({ id, type: "footnote", blocks });
    }
  }

  parseEndnotes(opc: OPCPackage, ctx: ParseContext, notes: NotesRegistry): void {
    const part = opc.parts.get("word/endnotes.xml");
    if (!part) return;
    const doc = parseXml(part.content);
    const root = doc.documentElement;
    for (const child of root.childNodes) {
      const el = child as Element;
      if (el.nodeType !== 1) continue;
      if (el.localName !== "endnote") continue;
      const id = getAttr(el, "id");
      if (!id) continue;
      const blocks: BlockNode[] = [];
      for (const p of el.childNodes) {
        if (p.nodeType !== 1) continue;
        const parsed = this.blockParser.parseBlockElement(p as Element, ctx);
        blocks.push(...parsed);
      }
      notes.add({ id, type: "endnote", blocks });
    }
  }
}
