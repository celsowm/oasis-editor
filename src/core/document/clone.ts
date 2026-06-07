import type {
  EditorBlockNode,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTextRun,
} from "../model.js";
import { cloneStyle } from "../textStyle/textStyleMutations.js";

export function cloneRun(run: EditorTextRun): EditorTextRun {
  return {
    ...run,
    styles: cloneStyle(run.styles),
    image: run.image ? { ...run.image } : undefined,
    field: run.field ? { ...run.field } : undefined,
    revision: run.revision ? { ...run.revision } : undefined,
    footnoteReference: run.footnoteReference
      ? { ...run.footnoteReference }
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
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: cloneParagraphs(cell.blocks),
        })),
      })),
    };
  });
}
