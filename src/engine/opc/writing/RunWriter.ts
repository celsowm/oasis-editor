import { XMLBuilder } from "../XMLBuilder.js";
import {
  TextRun as OasisTextRun,
  MarkSet,
} from "../../../core/document/BlockTypes.js";
import { W_NS, nextRelId, getBookmarkId } from "./WmlConstants.js";

export class RunWriter {
  writeRuns(b: XMLBuilder, runs: OasisTextRun[]): void {
    let openRevisionId: string | undefined;
    let openRevisionType: "insert" | "delete" | undefined;

    const closeRevision = () => {
      if (openRevisionId) {
        b.close(W_NS, openRevisionType === "insert" ? "ins" : "del");
        openRevisionId = undefined;
        openRevisionType = undefined;
      }
    };

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const prevRun = i > 0 ? runs[i - 1] : undefined;
      const nextRun = i < runs.length - 1 ? runs[i + 1] : undefined;

      // Handle revision grouping
      if (run.revision) {
        if (openRevisionId !== run.revision.id) {
          closeRevision();
          b.open(W_NS, run.revision.type === "insert" ? "ins" : "del", {
            "w:id": run.revision.id,
            "w:author": run.revision.author,
            "w:date": new Date(run.revision.date).toISOString(),
          });
          openRevisionId = run.revision.id;
          openRevisionType = run.revision.type;
        }
      } else {
        closeRevision();
      }

      if (run.bookmarkStart) {
        const id = getBookmarkId(run.bookmarkStart);
        b.selfClose(W_NS, "bookmarkStart", { "w:id": id, "w:name": run.bookmarkStart });
      }

      // Comment range start
      if (run.commentId && prevRun?.commentId !== run.commentId) {
        b.selfClose(W_NS, "commentRangeStart", { "w:id": run.commentId });
      }

      this.writeRun(b, run);

      // Comment range end
      if (run.commentId && nextRun?.commentId !== run.commentId) {
        b.selfClose(W_NS, "commentRangeEnd", { "w:id": run.commentId });
        // Comment reference run
        b.open(W_NS, "r");
        b.selfClose(W_NS, "commentReference", { "w:id": run.commentId });
        b.close(W_NS, "r");
      }

      if (run.bookmarkEnd) {
        const id = getBookmarkId(run.bookmarkEnd);
        b.selfClose(W_NS, "bookmarkEnd", { "w:id": id });
      }
    }

    closeRevision();
  }

  private writeRun(b: XMLBuilder, run: OasisTextRun): void {
    if (run.marks.link && !run.field) {
      this.writeHyperlinkRun(b, run);
      return;
    }

    if (run.field) {
      this.writeFieldRun(b, run);
      return;
    }

    if (run.footnoteId) {
      b.open(W_NS, "r");
      b.open(W_NS, "rPr");
      b.selfClose(W_NS, "rStyle", { "w:val": "FootnoteReference" });
      b.close(W_NS, "rPr");
      b.selfClose(W_NS, "footnoteReference", { "w:id": run.footnoteId });
      b.close(W_NS, "r");
      return;
    }

    if (run.endnoteId) {
      b.open(W_NS, "r");
      b.open(W_NS, "rPr");
      b.selfClose(W_NS, "rStyle", { "w:val": "EndnoteReference" });
      b.close(W_NS, "rPr");
      b.selfClose(W_NS, "endnoteReference", { "w:id": run.endnoteId });
      b.close(W_NS, "r");
      return;
    }

    b.open(W_NS, "r");
    this.writeRunProperties(b, run.marks);
    b.open(W_NS, "t");
    b.text(run.text);
    b.close(W_NS, "t");
    b.close(W_NS, "r");
  }

  writeRunText(b: XMLBuilder, text: string, textTag: string): void {
    let buffer = "";
    const flush = () => {
      if (buffer) {
        b.open(W_NS, textTag);
        b.text(buffer);
        b.close(W_NS, textTag);
        buffer = "";
      }
    };
    for (const ch of text) {
      if (ch === "\t") {
        flush();
        b.selfClose(W_NS, "tab");
      } else if (ch === "\n") {
        flush();
        b.selfClose(W_NS, "br");
      } else if (ch === "\u2011") {
        flush();
        b.selfClose(W_NS, "noBreakHyphen");
      } else if (ch === "\u00AD") {
        flush();
        b.selfClose(W_NS, "softHyphen");
      } else {
        buffer += ch;
      }
    }
    flush();
  }

  private writeFieldRun(b: XMLBuilder, run: OasisTextRun): void {
    const instruction = run.field!.instruction;

    // Begin
    b.open(W_NS, "r");
    b.open(W_NS, "rPr");
    b.close(W_NS, "rPr");
    b.selfClose(W_NS, "fldChar", { "w:fldCharType": "begin" });
    b.close(W_NS, "r");

    // Instruction
    b.open(W_NS, "r");
    b.open(W_NS, "rPr");
    b.close(W_NS, "rPr");
    b.open(W_NS, "instrText");
    b.text(instruction);
    b.close(W_NS, "instrText");
    b.close(W_NS, "r");

    // Separate
    b.open(W_NS, "r");
    b.open(W_NS, "rPr");
    b.close(W_NS, "rPr");
    b.selfClose(W_NS, "fldChar", { "w:fldCharType": "separate" });
    b.close(W_NS, "r");

    // Result
    b.open(W_NS, "r");
    this.writeRunProperties(b, run.marks);
    const textTag = run.revision?.type === "delete" ? "delText" : "t";
    this.writeRunText(b, run.text, textTag);
    b.close(W_NS, "r");

    // End
    b.open(W_NS, "r");
    b.open(W_NS, "rPr");
    b.close(W_NS, "rPr");
    b.selfClose(W_NS, "fldChar", { "w:fldCharType": "end" });
    b.close(W_NS, "r");
  }

  private writeHyperlinkRun(b: XMLBuilder, run: OasisTextRun): void {
    const relId = nextRelId();
    // Note: the relationship will be added by the caller
    b.open(W_NS, "hyperlink", { "r:id": relId });
    b.open(W_NS, "r");
    this.writeRunProperties(b, run.marks);
    b.open(W_NS, "t");
    b.text(run.text);
    b.close(W_NS, "t");
    b.close(W_NS, "r");
    b.close(W_NS, "hyperlink");
  }

  writeRunProperties(b: XMLBuilder, marks: MarkSet): void {
    const hasProps =
      marks.bold ||
      marks.italic ||
      marks.underline ||
      marks.strike ||
      marks.color ||
      marks.highlight ||
      marks.fontFamily ||
      marks.fontSize !== undefined ||
      marks.vertAlign;

    if (!hasProps) return;

    b.open(W_NS, "rPr");
    if (marks.bold) b.selfClose(W_NS, "b");
    if (marks.italic) b.selfClose(W_NS, "i");
    if (marks.underline) b.selfClose(W_NS, "u", { "w:val": "single" });
    if (marks.strike) b.selfClose(W_NS, "strike");
    if (marks.color) b.selfClose(W_NS, "color", { "w:val": marks.color });
    if (marks.highlight) b.selfClose(W_NS, "highlight", { "w:val": marks.highlight });
    if (marks.fontSize !== undefined) {
      b.selfClose(W_NS, "sz", { "w:val": Math.round(marks.fontSize * 2) });
      b.selfClose(W_NS, "szCs", { "w:val": Math.round(marks.fontSize * 2) });
    }
    if (marks.fontFamily) {
      b.selfClose(W_NS, "rFonts", { "w:ascii": marks.fontFamily, "w:hAnsi": marks.fontFamily });
    }
    if (marks.vertAlign) {
      b.selfClose(W_NS, "vertAlign", { "w:val": marks.vertAlign });
    }
    b.close(W_NS, "rPr");
  }
}
