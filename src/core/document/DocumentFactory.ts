import {
  MarkSet,
  TextRun,
  ParagraphNode,
  HeadingNode,
  ImageNode,
  TableCellNode,
  TableRowNode,
  TableNode,
  BlockNode,
} from "./BlockTypes.js";
import { DocumentModel, createDocumentMetadata } from "./DocumentTypes.js";
import {
  SectionNode,
  createDefaultBreakPolicy,
  createDefaultMargins,
} from "./SectionTypes.js";
import { IdGenerator } from "../utils/IdGenerator.js";

/** Default generator used by createDocument when none is provided. */
const defaultIdGen = new IdGenerator();

const createTextRun = (
  text: string,
  marks: Partial<MarkSet> = {},
  gen: IdGenerator = defaultIdGen,
  field?: import("./BlockTypes.js").FieldInfo,
  bookmarkStart?: string,
  bookmarkEnd?: string,
  footnoteId?: string,
  endnoteId?: string,
  commentId?: string,
): TextRun => ({
  id: gen.nextRunId(),
  text,
  marks,
  field,
  bookmarkStart,
  bookmarkEnd,
  footnoteId,
  endnoteId,
  commentId,
});

const createImageNode = (
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  displayWidth: number,
  align: ImageNode["align"] = "center",
  alt = "",
  gen: IdGenerator = defaultIdGen,
): ImageNode => {
  const aspectRatio = naturalHeight / naturalWidth;
  const displayHeight = Math.round(displayWidth * aspectRatio);
  return {
    id: gen.nextImageId(),
    kind: "image",
    src,
    naturalWidth,
    naturalHeight,
    width: displayWidth,
    height: displayHeight,
    align,
    alt,
  };
};

const createTableCell = (
  children: BlockNode[] = [],
  gen: IdGenerator = defaultIdGen,
): TableCellNode => ({
  id: gen.nextBlockId(),
  kind: "table-cell",
  children: children.length > 0 ? children : [createParagraph("", "left", gen)],
});

const createTableRow = (
  cellCount: number,
  gen: IdGenerator = defaultIdGen,
): TableRowNode => ({
  id: gen.nextBlockId(),
  kind: "table-row",
  cells: Array.from({ length: cellCount }, () => createTableCell([], gen)),
});

const createTable = (
  rows: number,
  cols: number,
  totalWidth = 600,
  gen: IdGenerator = defaultIdGen,
): TableNode => ({
  id: gen.nextBlockId(),
  kind: "table",
  rows: Array.from({ length: rows }, () => createTableRow(cols, gen)),
  columnWidths: Array(cols).fill(Math.floor(totalWidth / cols)),
});

export const createParagraph = (
  text: string,
  align: ParagraphNode["align"] = "left",
  gen: IdGenerator = defaultIdGen,
): ParagraphNode => ({
  id: gen.nextBlockId(),
  kind: "paragraph",
  align,
  children: [createTextRun(text, {}, gen)],
});

export const createHeading = (
  text: string,
  level: HeadingNode["level"] = 1,
  align: HeadingNode["align"] = "left",
  gen: IdGenerator = defaultIdGen,
): HeadingNode => ({
  id: gen.nextBlockId(),
  kind: "heading",
  level,
  align,
  children: [createTextRun(text, { bold: true, fontSize: 24 }, gen)],
});

export const createPageBreak = (
  id?: string,
  gen: IdGenerator = defaultIdGen,
): import("./BlockTypes.js").PageBreakNode => ({
  id: id || gen.nextBlockId(),
  kind: "page-break",
});

export const createEquation = (
  latex: string,
  display = false,
  gen: IdGenerator = defaultIdGen,
  omml?: string,
): import("./BlockTypes.js").EquationNode => ({
  id: gen.nextBlockId(),
  kind: "equation",
  latex,
  display,
  omml,
});

export const createChart = (
  chartType: string,
  title?: string,
  gen: IdGenerator = defaultIdGen,
): import("./BlockTypes.js").ChartNode => ({
  id: gen.nextBlockId(),
  kind: "chart",
  chartType,
  title,
  width: 400,
  height: 250,
});

export const createSection = (
  children: BlockNode[] = [],
  gen: IdGenerator = defaultIdGen,
): SectionNode => ({
  id: gen.nextSectionId(),
  pageTemplateId: "template:a4:default",
  margins: createDefaultMargins(),
  orientation: "portrait",
  breakPolicy: createDefaultBreakPolicy(),
  children,
  header: [createParagraph("", "left", gen)],
  footer: [createParagraph("", "left", gen)],
});

export const createDocument = (
  gen: IdGenerator = defaultIdGen,
): DocumentModel => ({
  id: "doc:root",
  revision: 0,
  metadata: createDocumentMetadata("Lorem Ipsum Document"),
  sections: [
    createSection(
      [
        createHeading("Lorem Ipsum Dolor Sit Amet", 1, "left", gen),
        {
          id: gen.nextBlockId(),
          kind: "paragraph" as const,
          align: "left" as const,
          children: [
            createTextRun("Lorem ipsum dolor sit amet, ", { bold: true }, gen),
            createTextRun("consectetur adipiscing elit. ", {}, gen),
            createTextRun("Integer nec odio. ", { italic: true }, gen),
            createTextRun("Praesent libero. Sed cursus ante dapibus diam.", {}, gen),
          ],
        },
        createParagraph(
          "Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa.",
          "left",
          gen,
        ),
        {
          id: gen.nextBlockId(),
          kind: "heading" as const,
          level: 2 as const,
          align: "left" as const,
          children: [
            createTextRun("Vestibulum Lacinia", { bold: true, fontSize: 18 }, gen),
          ],
        },
        {
          id: gen.nextBlockId(),
          kind: "paragraph" as const,
          align: "left" as const,
          children: [
            createTextRun("Vestibulum lacinia arcu eget nulla. ", {}, gen),
            createTextRun("Class aptent taciti sociosqu", { underline: true }, gen),
            createTextRun(
              " ad litora torquent per conubia nostra, per inceptos himenaeos. ",
              {},
              gen,
            ),
          ],
        },
        createParagraph(
          "Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet.",
          "left",
          gen,
        ),
      ],
      gen,
    ),
  ],
});

// Re-export factory functions for external use
export { createTextRun, createImageNode as createImage, createTableCell, createTableRow, createTable };
