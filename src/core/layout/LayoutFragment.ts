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
  offsetStart: number;
  offsetEnd: number;
  y: number;
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
}
