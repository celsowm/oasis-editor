import {
  BlockNode,
  MarkSet,
  TextRun,
  ImageNode,
  EquationNode,
  ChartNode,
} from "../../../core/document/BlockTypes.js";
import { createTextRun } from "../../../core/document/DocumentFactory.js";
import { genId } from "../../../core/utils/IdGenerator.js";
import { parseFieldInstruction } from "../../../core/document/FieldUtils.js";
import { childElements, firstChild, getAttr } from "./XmlUtils.js";
import { ParseContext } from "./ParseContext.js";
import { DrawingParser } from "./DrawingParser.js";
import { RelationshipResolver } from "./RelationshipResolver.js";

export class RunParser {
  private drawingParser: DrawingParser;
  private resolver: RelationshipResolver;

  constructor(drawingParser: DrawingParser, resolver: RelationshipResolver) {
    this.drawingParser = drawingParser;
    this.resolver = resolver;
  }

  parseRuns(el: Element, ctx: ParseContext, currentMarks: MarkSet = {}): (TextRun | ImageNode | EquationNode | ChartNode)[] {
    const runs: (TextRun | ImageNode | EquationNode | ChartNode)[] = [];
    const children = Array.from(el.childNodes).filter((n) => (n as Element).nodeType === 1) as Element[];

    const bookmarkMap = new Map<string, string>();
    for (const child of children) {
      if (child.localName === "bookmarkStart") {
        const id = getAttr(child, "id");
        const name = getAttr(child, "name");
        if (id && name) bookmarkMap.set(id, name);
      }
    }

    let pendingBookmarkStart: string | undefined;
    const activeCommentIds = new Set<string>();

    const applyPendingStart = (run: TextRun | ImageNode | EquationNode | ChartNode) => {
      if (pendingBookmarkStart && !("kind" in run)) {
        (run as TextRun).bookmarkStart = pendingBookmarkStart;
        pendingBookmarkStart = undefined;
      }
    };

    const applyCommentIds = (run: TextRun | ImageNode | EquationNode | ChartNode) => {
      if (activeCommentIds.size > 0 && !("kind" in run)) {
        (run as TextRun).commentId = Array.from(activeCommentIds)[0];
      }
    };

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = child.localName;

      if (tag === "bookmarkStart") {
        const name = getAttr(child, "name");
        if (name) pendingBookmarkStart = name;
        continue;
      }

      if (tag === "bookmarkEnd") {
        const id = getAttr(child, "id");
        const name = id ? bookmarkMap.get(id) : undefined;
        if (name && runs.length > 0) {
          const lastRun = runs[runs.length - 1];
          if (!("kind" in lastRun)) {
            (lastRun as TextRun).bookmarkEnd = name;
          }
        }
        continue;
      }

      if (tag === "commentRangeStart") {
        const id = getAttr(child, "id");
        if (id) activeCommentIds.add(id);
        continue;
      }

      if (tag === "commentRangeEnd") {
        const id = getAttr(child, "id");
        if (id) activeCommentIds.delete(id);
        continue;
      }

      if (tag === "ins" || tag === "del") {
        const revId = getAttr(child, "id") || genId("rev");
        const author = getAttr(child, "author") || "Author";
        const dateStr = getAttr(child, "date");
        const date = dateStr ? new Date(dateStr).getTime() : Date.now();
        const revType = tag === "ins" ? "insert" as const : "delete" as const;

        for (const revChild of child.childNodes) {
          if (revChild.nodeType !== 1) continue;
          const revTag = (revChild as Element).localName;
          if (revTag === "r") {
            const rPr = firstChild(revChild as Element, "rPr");
            const marks = this.buildMarks(rPr, currentMarks);
            const runContent = this.parseRunContent(revChild as Element, ctx, marks);
            for (const rc of runContent) {
              applyPendingStart(rc);
              applyCommentIds(rc);
              if (!("kind" in rc)) {
                (rc as TextRun).revision = { type: revType, author, date, id: revId };
              }
            }
            runs.push(...runContent);
          }
        }
        continue;
      }

      if (tag === "r") {
        const fldChar = firstChild(child, "fldChar");
        if (fldChar && getAttr(fldChar, "fldCharType") === "begin") {
          const fieldRuns: Element[] = [];
          let j = i;
          for (; j < children.length; j++) {
            fieldRuns.push(children[j]);
            const fc = firstChild(children[j], "fldChar");
            if (fc && getAttr(fc, "fldCharType") === "end") break;
          }
          const fieldRun = this.parseComplexField(fieldRuns, ctx, currentMarks);
          if (fieldRun) {
            applyPendingStart(fieldRun);
            applyCommentIds(fieldRun);
            runs.push(fieldRun);
          }
          i = j;
          continue;
        }

        const rPr = firstChild(child, "rPr");
        const marks = this.buildMarks(rPr, currentMarks);
        const runContent = this.parseRunContent(child, ctx, marks);
        if (runContent.length > 0) {
          applyPendingStart(runContent[0]);
        }
        for (const rc of runContent) {
          applyCommentIds(rc);
        }
        runs.push(...runContent);
      } else if (tag === "hyperlink") {
        const relId = getAttr(child, "id");
        let href = "";
        if (relId) {
          const rel = this.resolver.findRelationship(ctx.currentPart, relId);
          if (rel) href = rel.target;
        }
        const linkMarks = { ...currentMarks, link: href || undefined };
        for (const r of childElements(child, "r")) {
          const rPr = firstChild(r, "rPr");
          const marks = this.buildMarks(rPr, linkMarks);
          const runContent = this.parseRunContent(r, ctx, marks);
          if (runContent.length > 0) {
            applyPendingStart(runContent[0]);
          }
          for (const rc of runContent) {
            applyCommentIds(rc);
          }
          runs.push(...runContent);
        }
      } else if (tag === "fldSimple") {
        const fieldRun = this.parseSimpleField(child, ctx, currentMarks);
        if (fieldRun) {
          applyPendingStart(fieldRun);
          applyCommentIds(fieldRun);
          runs.push(fieldRun);
        }
      } else if (tag === "oMath" || tag === "oMathPara") {
        const eq = this.drawingParser.parseEquation(child, tag === "oMathPara");
        if (eq) {
          applyPendingStart(eq);
          applyCommentIds(eq);
          runs.push(eq);
        }
      } else if (tag === "AlternateContent") {
        const altRuns = this.parseAlternateContentRuns(child, ctx, currentMarks);
        if (altRuns.length > 0) {
          applyPendingStart(altRuns[0]);
        }
        for (const rc of altRuns) {
          applyCommentIds(rc);
        }
        runs.push(...altRuns);
      }
    }

    return runs;
  }

  parseRunContent(el: Element, ctx: ParseContext, marks: MarkSet): (TextRun | ImageNode | EquationNode | ChartNode)[] {
    const result: (TextRun | ImageNode | EquationNode | ChartNode)[] = [];

    for (const child of el.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = (child as Element).localName;

      if (tag === "t" || tag === "delText") {
        const text = child.textContent ?? "";
        if (text) result.push(createTextRun(text, { ...marks }));
      } else if (tag === "tab") {
        result.push(createTextRun("\t", { ...marks }));
      } else if (tag === "br") {
        const breakType = getAttr(child as Element, "type");
        if (breakType === "page") continue;
        result.push(createTextRun("\n", { ...marks }));
      } else if (tag === "noBreakHyphen") {
        result.push(createTextRun("\u2011", { ...marks }));
      } else if (tag === "softHyphen") {
        result.push(createTextRun("\u00AD", { ...marks }));
      } else if (tag === "sym") {
        const char = getAttr(child as Element, "char");
        if (char) {
          const code = parseInt(char, 16);
          if (!isNaN(code)) result.push(createTextRun(String.fromCharCode(code), { ...marks }));
        }
      } else if (tag === "AlternateContent") {
        const altRuns = this.parseAlternateContentRuns(child as Element, ctx, marks);
        result.push(...altRuns);
      } else if (tag === "drawing") {
        const img = this.drawingParser.parseDrawing(child as Element, ctx);
        if (img) result.push(img);
      } else if (tag === "pict") {
        const img = this.drawingParser.parseVmlPicture(child as Element, ctx);
        if (img) result.push(img);
      } else if (tag === "oMath" || tag === "oMathPara") {
        const eq = this.drawingParser.parseEquation(child as Element, tag === "oMathPara");
        if (eq) result.push(eq);
      } else if (tag === "footnoteReference") {
        const id = getAttr(child as Element, "id");
        if (id) result.push(createTextRun("", { ...marks }, undefined, undefined, undefined, undefined, id, undefined));
      } else if (tag === "endnoteReference") {
        const id = getAttr(child as Element, "id");
        if (id) result.push(createTextRun("", { ...marks }, undefined, undefined, undefined, undefined, undefined, id));
      } else if (tag === "commentReference") {
        continue;
      }
    }

    return result;
  }

  parseAlternateContentRuns(el: Element, ctx: ParseContext, currentMarks: MarkSet): (TextRun | ImageNode | EquationNode | ChartNode)[] {
    const fallback = firstChild(el, "Fallback");
    const choice = firstChild(el, "Choice");
    const target = fallback || choice;
    if (!target) return [];

    const result: (TextRun | ImageNode | EquationNode | ChartNode)[] = [];
    for (const child of target.childNodes) {
      if (child.nodeType !== 1) continue;
      const tag = (child as Element).localName;
      if (tag === "r") {
        const rPr = firstChild(child as Element, "rPr");
        const marks = this.buildMarks(rPr, currentMarks);
        const runContent = this.parseRunContent(child as Element, ctx, marks);
        result.push(...runContent);
      } else if (tag === "drawing") {
        const img = this.drawingParser.parseDrawing(child as Element, ctx);
        if (img) result.push(img);
      } else if (tag === "pict") {
        const img = this.drawingParser.parseVmlPicture(child as Element, ctx);
        if (img) result.push(img);
      } else if (tag === "oMath" || tag === "oMathPara") {
        const eq = this.drawingParser.parseEquation(child as Element, tag === "oMathPara");
        if (eq) result.push(eq);
      }
    }
    return result;
  }

  private parseComplexField(fieldRuns: Element[], ctx: ParseContext, baseMarks: MarkSet): TextRun | null {
    let instruction = "";
    let resultText = "";
    let inResult = false;

    for (const run of fieldRuns) {
      const fldChar = firstChild(run, "fldChar");
      if (fldChar) {
        const type = getAttr(fldChar, "fldCharType");
        if (type === "separate") {
          inResult = true;
          continue;
        }
        if (type === "begin" || type === "end") continue;
      }

      const instrText = firstChild(run, "instrText");
      if (instrText) {
        instruction += instrText.textContent ?? "";
        continue;
      }

      if (inResult) {
        const t = firstChild(run, "t");
        if (t) resultText += t.textContent ?? "";
      }
    }

    const field = parseFieldInstruction(instruction);
    if (!field) return null;

    return createTextRun(resultText || field.type, baseMarks, undefined, field);
  }

  private parseSimpleField(el: Element, ctx: ParseContext, baseMarks: MarkSet): TextRun | null {
    const instruction = getAttr(el, "instr") ?? "";
    const field = parseFieldInstruction(instruction);
    if (!field) return null;

    let resultText = "";
    for (const r of childElements(el, "r")) {
      const t = firstChild(r, "t");
      if (t) resultText += t.textContent ?? "";
    }

    return createTextRun(resultText || field.type, baseMarks, undefined, field);
  }

  buildMarks(rPr: Element | null, base: MarkSet = {}): MarkSet {
    if (!rPr) return { ...base };
    const marks: MarkSet = { ...base };

    const hasChild = (el: Element, name: string) => firstChild(el, name) !== null;

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
    if (vertAlign) marks.vertAlign = vertAlign as any;

    const rFonts = firstChild(rPr, "rFonts");
    if (rFonts) {
      marks.fontFamily = getAttr(rFonts, "ascii") || getAttr(rFonts, "hAnsi") || undefined;
    }

    return marks;
  }
}
