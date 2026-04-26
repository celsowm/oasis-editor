import { XMLBuilder } from "../XMLBuilder.js";
import { W_NS } from "./WmlConstants.js";
import { BlockWriter } from "./BlockWriter.js";

export class CommentsWriter {
  private blockWriter: BlockWriter;

  constructor(blockWriter: BlockWriter) {
    this.blockWriter = blockWriter;
  }

  writeComments(comments: import("../../../core/document/DocumentTypes.js").DocumentModel["comments"]): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.raw(`<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`);
    for (const comment of comments!) {
      const attrs: Record<string, string> = { "w:id": comment.id };
      if (comment.author) attrs["w:author"] = comment.author;
      if (comment.date) attrs["w:date"] = new Date(comment.date).toISOString();
      b.open(W_NS, "comment", attrs);
      for (const block of comment.blocks) {
        if (block.kind === "paragraph" || block.kind === "heading" || block.kind === "list-item" || block.kind === "ordered-list-item") {
          this.blockWriter.writeParagraphLike(b, block as any);
        }
      }
      b.close(W_NS, "comment");
    }
    b.close(W_NS, "comments");
    return b.toBuffer();
  }
}
