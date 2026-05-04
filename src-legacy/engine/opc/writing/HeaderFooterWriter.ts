import { XMLBuilder } from "../XMLBuilder.js";
import { Relationship } from "../OPCGraphBuilder.js";
import { BlockNode } from "../../../core/document/BlockTypes.js";
import { W_NS, nextRelId } from "./WmlConstants.js";
import { BlockWriter } from "./BlockWriter.js";

export class HeaderFooterWriter {
  private blockWriter: BlockWriter;

  constructor(blockWriter: BlockWriter) {
    this.blockWriter = blockWriter;
  }

  writeHeaderFooter(
    blocks: BlockNode[],
    tag: "hdr" | "ftr",
    relId: string,
    relationships: Relationship[],
    imageParts: Map<string, { contentType: string; data: Uint8Array }>,
  ): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.raw(`<w:${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">`);
    for (const block of blocks) {
      this.blockWriter.writeBlock(b, block, relationships, imageParts);
    }
    b.close(W_NS, tag);
    relationships.push({
      id: relId,
      type: `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${tag === "hdr" ? "header" : "footer"}`,
      target: `${tag}1.xml`,
    });
    return b.toBuffer();
  }
}
