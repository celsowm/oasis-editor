export interface MarkSet {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface TextRun {
  id: string;
  text: string;
  marks: MarkSet;
}

export interface ParagraphNode {
  id: string;
  kind: "paragraph";
  align: "left" | "center" | "right" | "justify";
  children: TextRun[];
}

export interface HeadingNode {
  id: string;
  kind: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: "left" | "center" | "right";
  children: TextRun[];
}

export interface ImageNode {
  id: string;
  kind: "image";
  src: string; // Data URI (base64)
  naturalWidth: number;
  naturalHeight: number;
  width: number;  // display width in px
  height: number; // display height in px
  align: "left" | "center" | "right";
  alt?: string;
}

export type BlockNode = ParagraphNode | HeadingNode | ImageNode;
