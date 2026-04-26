import { TextRun, MarkSet } from "../document/BlockTypes.js";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineInfo {
  id: string;
  text: string;
  width: number;
  height: number;
  x: number;
  y: number;
  offsetStart: number;
  offsetEnd: number;
}

export interface LayoutFragment {
  id: string;
  blockId: string;
  sectionId: string;
  pageId: string;
  fragmentIndex: number;
  kind: string;
  startOffset: number;
  endOffset: number;
  text: string;
  rect: Rect;
  typography: { fontFamily: string; fontSize: number; fontWeight: number };
  marks: MarkSet;
  runs: TextRun[];
  lines: LineInfo[];
  align: "left" | "center" | "right" | "justify";
  indentation?: number;
  listNumber?: number;
  listFormat?: import("../document/BlockTypes.js").ListFormat;
  listLevel?: number;
  // Image-specific fields (only populated when kind === "image")
  imageSrc?: string;
  imageAlt?: string;
  // Equation-specific fields (only populated when kind === "equation")
  equationLatex?: string;
  equationDisplay?: boolean;
  // Chart-specific fields (only populated when kind === "chart")
  chartType?: string;
  chartTitle?: string;
}
