import type {
  EditorBlockNode,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorRunBase,
  EditorTextBoxData,
  EditorTextRun,
  EditorMathExpression,
} from "@/core/model.js";
import { visitRun } from "@/core/model.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import { assertNever } from "@/core/assertNever.js";
import { copyEditorRunOoxmlSource } from "@/ooxml/word/sourceFragments.js";

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

function cloneMathValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneMathValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneMathValue(child)]),
    );
  }
  return value;
}

export function cloneMathExpression(
  expression: EditorMathExpression,
): EditorMathExpression {
  return cloneMathValue(expression) as EditorMathExpression;
}

export function cloneRun(run: EditorTextRun): EditorTextRun {
  const base: EditorRunBase = {
    id: run.id,
    text: run.text,
    styles: cloneStyle(run.styles),
    revision: run.revision ? { ...run.revision } : undefined,
  };
  const cloned = visitRun<EditorTextRun>(run, {
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
    math: (r) => ({
      ...base,
      kind: "math",
      math: cloneMathExpression(r.math),
    }),
  });
  return copyEditorRunOoxmlSource(run, cloned);
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
                revision: block.style.revision
                  ? {
                      ...block.style.revision,
                      previous: { ...block.style.revision.previous },
                    }
                  : undefined,
              }
            : undefined,
          gridRevision: block.gridRevision
            ? {
                ...block.gridRevision,
                previous: [...block.gridRevision.previous],
              }
            : undefined,
          rows: block.rows.map((row) => ({
            ...row,
            conditionalStyle: row.conditionalStyle
              ? { ...row.conditionalStyle }
              : undefined,
            style: row.style
              ? {
                  ...row.style,
                  revision: row.style.revision
                    ? { ...row.style.revision }
                    : undefined,
                  propertyRevision: row.style.propertyRevision
                    ? {
                        ...row.style.propertyRevision,
                        previous: { ...row.style.propertyRevision.previous },
                      }
                    : undefined,
                }
              : undefined,
            cells: row.cells.map((cell) => ({
              ...cell,
              conditionalStyle: cell.conditionalStyle
                ? { ...cell.conditionalStyle }
                : undefined,
              mergeRevisionState: cell.mergeRevisionState
                ? {
                    ...cell.mergeRevisionState,
                    previousCells: cell.mergeRevisionState.previousCells.map(
                      (previousCell) => ({
                        ...previousCell,
                        mergeRevisionState: undefined,
                        style: previousCell.style
                          ? { ...previousCell.style }
                          : undefined,
                        blocks: cloneBlocks(previousCell.blocks),
                      }),
                    ),
                  }
                : undefined,
              style: cell.style
                ? {
                    ...cell.style,
                    revision: cell.style.revision
                      ? { ...cell.style.revision }
                      : undefined,
                    propertyRevision: cell.style.propertyRevision
                      ? {
                          ...cell.style.propertyRevision,
                          previous: {
                            ...cell.style.propertyRevision.previous,
                          },
                        }
                      : undefined,
                  }
                : undefined,
              blocks: cloneBlocks(cell.blocks),
            })),
          })),
        };
      default:
        return assertNever(block, "block");
    }
  });
}
