import type {
  EditorBlockNode,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorRunBase,
  EditorTextBoxData,
  EditorTextRun,
} from "@/core/model.js";
import { visitRun } from "@/core/model.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import { assertNever } from "@/core/assertNever.js";

export function cloneTextBox(textBox: EditorTextBoxData): EditorTextBoxData {
  return {
    ...textBox,
    floating: textBox.floating
      ? {
          ...textBox.floating,
          positionH: textBox.floating.positionH
            ? { ...textBox.floating.positionH }
            : undefined,
          positionV: textBox.floating.positionV
            ? { ...textBox.floating.positionV }
            : undefined,
        }
      : undefined,
    shape: textBox.shape ? { ...textBox.shape } : undefined,
    body: textBox.body ? { ...textBox.body } : undefined,
    blocks: cloneBlocks(textBox.blocks),
  };
}

export function cloneRun(run: EditorTextRun): EditorTextRun {
  const base: EditorRunBase = {
    id: run.id,
    text: run.text,
    styles: cloneStyle(run.styles),
    revision: run.revision ? { ...run.revision } : undefined,
  };
  return visitRun<EditorTextRun>(run, {
    text: () => ({ ...base, kind: "text" }),
    image: (r) => ({ ...base, kind: "image", image: { ...r.image } }),
    textBox: (r) => ({
      ...base,
      kind: "textBox",
      textBox: cloneTextBox(r.textBox),
    }),
    field: (r) => ({ ...base, kind: "field", field: { ...r.field } }),
    fieldChar: (r) => ({
      ...base,
      kind: "fieldChar",
      fieldChar: { ...r.fieldChar },
    }),
    fieldInstruction: (r) => ({
      ...base,
      kind: "fieldInstruction",
      fieldInstruction: r.fieldInstruction,
    }),
    footnoteReference: (r) => ({
      ...base,
      kind: "footnoteReference",
      footnoteReference: { ...r.footnoteReference },
    }),
    endnoteReference: (r) => ({
      ...base,
      kind: "endnoteReference",
      endnoteReference: { ...r.endnoteReference },
    }),
    sym: (r) => ({ ...base, kind: "sym", sym: { ...r.sym } }),
  });
}

export function cloneParagraph(
  paragraph: EditorParagraphNode,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map(cloneRun),
    style: paragraph.style ? { ...paragraph.style } : undefined,
    list: paragraph.list ? { ...paragraph.list } : undefined,
  };
}

export function cloneParagraphList(
  list?: EditorParagraphListStyle,
): EditorParagraphListStyle | undefined {
  return list ? { ...list } : undefined;
}

export function cloneParagraphs(
  paragraphs: EditorParagraphNode[],
): EditorParagraphNode[] {
  return paragraphs.map(cloneParagraph);
}

export function cloneBlocks(blocks: EditorBlockNode[]): EditorBlockNode[] {
  return blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
        return cloneParagraph(block);
      case "table":
        return {
          ...block,
          style: block.style
            ? {
                ...block.style,
                defaultCellMargins: block.style.defaultCellMargins
                  ? { ...block.style.defaultCellMargins }
                  : undefined,
                floating: block.style.floating
                  ? { ...block.style.floating }
                  : undefined,
                revisionXml: block.style.revisionXml
                  ? [...block.style.revisionXml]
                  : undefined,
              }
            : undefined,
          tblGridChangeXml: block.tblGridChangeXml,
          rows: block.rows.map((row) => ({
            ...row,
            style: row.style
              ? {
                  ...row.style,
                  revisionXml: row.style.revisionXml
                    ? [...row.style.revisionXml]
                    : undefined,
                }
              : undefined,
            cells: row.cells.map((cell) => ({
              ...cell,
              style: cell.style
                ? {
                    ...cell.style,
                    revisionXml: cell.style.revisionXml
                      ? [...cell.style.revisionXml]
                      : undefined,
                  }
                : undefined,
              blocks: cloneParagraphs(cell.blocks),
            })),
          })),
        };
      default:
        return assertNever(block, "block");
    }
  });
}
