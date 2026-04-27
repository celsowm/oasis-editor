import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { DocumentImporter } from "../../core/import/DocumentImporter.js";
import { createSection } from "../../core/document/DocumentFactory.js";
import { SafeZipReader } from "../zip/SafeZipReader.js";
import { OPCGraphBuilder } from "../opc/OPCGraphBuilder.js";
import { WmlParser } from "../opc/parsing/WordprocessingMLParser.js";
import { StyleResolver, applyStylesToBlocks } from "../../core/document/StyleResolver.js";

export class NativeDocxImporter implements DocumentImporter {
  private zipReader: SafeZipReader;
  private opcBuilder: OPCGraphBuilder;
  private wmlParser: WmlParser;

  constructor() {
    this.zipReader = new SafeZipReader();
    this.opcBuilder = new OPCGraphBuilder();
    this.wmlParser = new WmlParser();
  }

  public async importFromBuffer(arrayBuffer: ArrayBuffer): Promise<DocumentModel> {
    const zipEntries = await this.zipReader.read(arrayBuffer);

    // Convert ZipEntry Map to raw content Map for OPC builder
    const rawEntries = new Map<string, Uint8Array>();
    for (const [name, entry] of zipEntries) {
      if (!entry.isDirectory) {
        rawEntries.set(name, entry.content);
      }
    }

    const opcPackage = await this.opcBuilder.build(rawEntries);
    const documentIR = this.wmlParser.parse(opcPackage);

    const resolver = new StyleResolver(documentIR.styles);
    const styledBody = applyStylesToBlocks(documentIR.body, resolver);

    const section = createSection(styledBody);
    if (documentIR.header) {
      section.header = applyStylesToBlocks(documentIR.header, resolver);
    }
    if (documentIR.footer) {
      section.footer = applyStylesToBlocks(documentIR.footer, resolver);
    }

    return {
      id: `doc:${Date.now()}`,
      revision: 0,
      metadata: {
        title: documentIR.metadata.title ?? "Imported Document",
        createdAt: documentIR.metadata.createdAt
          ? documentIR.metadata.createdAt.getTime()
          : Date.now(),
        updatedAt: documentIR.metadata.modifiedAt
          ? documentIR.metadata.modifiedAt.getTime()
          : Date.now(),
      },
      sections: [section],
      footnotes: documentIR.notes.getByType("footnote").map((n: any) => ({ id: n.id, blocks: applyStylesToBlocks(n.blocks, resolver) })),
      endnotes: documentIR.notes.getByType("endnote").map((n: any) => ({ id: n.id, blocks: applyStylesToBlocks(n.blocks, resolver) })),
      comments: Array.from(documentIR.comments.values()).map((c: any) => ({
        id: c.id,
        author: c.author,
        date: c.date ? c.date.getTime() : undefined,
        blocks: applyStylesToBlocks(c.blocks, resolver),
      })),
      styles: Array.from(documentIR.styles.values()).map((s: any) => ({
        styleId: s.styleId,
        type: s.type,
        name: s.name,
        basedOn: s.basedOn,
        next: s.next,
        isDefault: s.isDefault,
        paragraphProps: s.paragraphProps,
        runProps: s.runProps,
      })),
    };
  }
}
