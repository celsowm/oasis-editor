import { DocumentIR, NotesRegistry, ConversionWarning } from "../../ir/DocumentIR.js";
import { OPCPackage } from "../OPCGraphBuilder.js";
import { createParagraph } from "../../../core/document/DocumentFactory.js";
import { parseXml, firstChild } from "./XmlUtils.js";
import { RelationshipResolver } from "./RelationshipResolver.js";
import { MetadataParser } from "./MetadataParser.js";
import { StyleParser } from "./StyleParser.js";
import { NumberingParser } from "./NumberingParser.js";
import { AssetParser } from "./NotesAndCommentsParser.js";
import { CommentsParser, NotesParser } from "./NotesAndCommentsParser.js";
import { DrawingParser } from "./DrawingParser.js";
import { RunParser } from "./RunParser.js";
import { BlockParser } from "./BlockParser.js";
import { SectionPropertiesParser } from "./SectionPropertiesParser.js";
import { ParseContext } from "./ParseContext.js";

export class WMLParser {
  private resolver: RelationshipResolver;
  private metadataParser: MetadataParser;
  private styleParser: StyleParser;
  private numberingParser: NumberingParser;
  private assetParser: AssetParser;
  private drawingParser: DrawingParser;
  private runParser: RunParser;
  private blockParser: BlockParser;
  private sectionPropertiesParser: SectionPropertiesParser;

  constructor() {
    this.resolver = new RelationshipResolver();
    this.metadataParser = new MetadataParser();
    this.styleParser = new StyleParser();
    this.numberingParser = new NumberingParser();
    this.assetParser = new AssetParser();
    this.drawingParser = new DrawingParser(this.resolver);
    this.runParser = new RunParser(this.drawingParser, this.resolver);
    this.blockParser = new BlockParser(this.runParser);
    this.sectionPropertiesParser = new SectionPropertiesParser(this.resolver, this.blockParser);
  }

  parse(opc: OPCPackage): DocumentIR {
    const styles = this.styleParser.parse(opc);
    const numbering = this.numberingParser.parse(opc);
    const assets = this.assetParser.parse(opc);
    const warnings: ConversionWarning[] = [];

    const mainDoc = opc.mainDocument;
    if (!mainDoc) {
      warnings.push({
        code: "NO_MAIN_DOCUMENT",
        message: "No main document part found in OPC package",
        severity: "error",
      });
      return {
        metadata: {},
        body: [createParagraph("")],
        styles,
        numbering,
        assets,
        notes: { add: () => {}, get: () => undefined, getByType: () => [] } as any,
        comments: { add: () => {}, get: () => undefined, values: () => [].values() } as any,
        warnings,
      };
    }

    const ctx: ParseContext = {
      package: opc,
      currentPart: mainDoc,
      styles,
      numbering,
      assets,
      warnings,
    };

    const doc = parseXml(mainDoc.content);
    const body = firstChild(doc.documentElement, "body");
    const blocks = this.parseBody(body, ctx);

    if (blocks.length === 0) {
      blocks.push(createParagraph(""));
    }

    const metadata = this.metadataParser.parse(opc);

    const notes = new NotesRegistry();
    const notesParser = new NotesParser(this.blockParser);
    notesParser.parseFootnotes(opc, ctx, notes);
    notesParser.parseEndnotes(opc, ctx, notes);

    const commentsParser = new CommentsParser(this.blockParser);
    const comments = commentsParser.parse(opc, ctx);

    const { header, footer } = this.sectionPropertiesParser.parse(body, ctx);

    return {
      metadata,
      body: blocks,
      header,
      footer,
      styles,
      numbering,
      assets,
      notes,
      comments,
      warnings,
    };
  }

  private parseBody(body: Element | null, ctx: ParseContext) {
    const blocks = [];
    if (body) {
      for (const child of body.childNodes) {
        if (child.nodeType !== 1) continue;
        const parsed = this.blockParser.parseBlockElement(child as Element, ctx);
        blocks.push(...parsed);
      }
    }
    return blocks;
  }
}
