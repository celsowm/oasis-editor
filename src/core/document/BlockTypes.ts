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
  kind: 'paragraph';
  align: 'left' | 'center' | 'right' | 'justify';
  children: TextRun[];
}

export interface HeadingNode {
  id: string;
  kind: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: 'left' | 'center' | 'right';
  children: TextRun[];
}

export type BlockNode = ParagraphNode | HeadingNode;
