import { XMLBuilder } from "../XMLBuilder.js";
import { W_NS } from "./WmlConstants.js";
import { BlockWriter } from "./BlockWriter.js";

export class NotesWriter {
  private blockWriter: BlockWriter;

  constructor(blockWriter: BlockWriter) {
    this.blockWriter = blockWriter;
  }

  writeFootnotes(footnotes: import("../../../core/document/DocumentTypes.js").DocumentModel["footnotes"]): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.raw(`<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`);
    for (const note of footnotes!) {
      b.open(W_NS, "footnote", { "w:id": note.id });
      for (const block of note.blocks) {
        if (block.kind === "paragraph" || block.kind === "heading" || block.kind === "list-item" || block.kind === "ordered-list-item") {
          this.blockWriter.writeParagraphLike(b, block as any);
        }
      }
      b.close(W_NS, "footnote");
    }
    b.close(W_NS, "footnotes");
    return b.toBuffer();
  }

  writeEndnotes(endnotes: import("../../../core/document/DocumentTypes.js").DocumentModel["endnotes"]): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.raw(`<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`);
    for (const note of endnotes!) {
      b.open(W_NS, "endnote", { "w:id": note.id });
      for (const block of note.blocks) {
        if (block.kind === "paragraph" || block.kind === "heading" || block.kind === "list-item" || block.kind === "ordered-list-item") {
          this.blockWriter.writeParagraphLike(b, block as any);
        }
      }
      b.close(W_NS, "endnote");
    }
    b.close(W_NS, "endnotes");
    return b.toBuffer();
  }
}
