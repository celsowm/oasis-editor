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
  indentation?: number;
  children: TextRun[];
}

export interface HeadingNode {
  id: string;
  kind: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: "left" | "center" | "right";
  indentation?: number;
  children: TextRun[];
}

export interface ImageNode {
  id: string;
  kind: "image";
  src: string; // Data URI (base64)
  naturalWidth: number;
  naturalHeight: number;
  width: number; // display width in px
  height: number; // display height in px
  align: "left" | "center" | "right";
  alt?: string;
}

export interface ListItemNode {
  id: string;
  kind: "list-item";
  align: "left" | "center" | "right" | "justify";
  indentation?: number;
  children: TextRun[];
}

export interface OrderedListItemNode {
  id: string;
  kind: "ordered-list-item";
  align: "left" | "center" | "right" | "justify";
  index: number;
  indentation?: number;
  children: TextRun[];
}

export interface TableCellNode {
  id: string;
  kind: "table-cell";
  children: BlockNode[]; // Allows nested blocks like paragraphs
  width?: number;
  vAlign?: "top" | "middle" | "bottom";
}

export interface TableRowNode {
  id: string;
  kind: "table-row";
  cells: TableCellNode[];
}

export interface TableNode {
  id: string;
  kind: "table";
  rows: TableRowNode[];
  columnWidths: number[]; // Widths in pixels
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ImageNode
  | TableNode
  | ListItemNode
  | OrderedListItemNode;

export type TextBlockNode =
  | ParagraphNode
  | HeadingNode
  | ListItemNode
  | OrderedListItemNode;

export function isTextBlock(node: BlockNode): node is TextBlockNode {
  return (
    node.kind === "paragraph" ||
    node.kind === "heading" ||
    node.kind === "list-item" ||
    node.kind === "ordered-list-item"
  );
}

export function isTableNode(node: BlockNode): node is TableNode {
  return node.kind === "table";
}
