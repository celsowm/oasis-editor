import type {
  EditorBlockNode,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTextBoxData,
  EditorTextRun,
} from "../model.js";
import { cloneStyle } from "../textStyle/textStyleMutations.js";

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
  return {
    ...run,
    styles: cloneStyle(run.styles),
    image: run.image ? { ...run.image } : undefined,
    textBox: run.textBox ? cloneTextBox(run.textBox) : undefined,
    field: run.field ? { ...run.field } : undefined,
    revision: run.revision ? { ...run.revision } : undefined,
    footnoteReference: run.footnoteReference
      ? { ...run.footnoteReference }
      : undefined,
    endnoteReference: run.endnoteReference
      ? { ...run.endnoteReference }
      : undefined,
  };
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
    if (block.type === "paragraph") {
      return cloneParagraph(block);
    }
    return {
      ...block,
      style: block.style
        ? {
            ...block.style,
            defaultCellMargins: block.style.defaultCellMargins
              ? { ...block.style.defaultCellMargins }
              : undefined,
            floating: block.style.floating ? { ...block.style.floating } : undefined,
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
  });
}
