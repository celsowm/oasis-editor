/**
 * Structured Office Math Markup Language (OMML) data used by the editor.
 *
 * Math expressions are deliberately independent from the document tree.  A
 * paragraph stores one expression as an inline object; the expression itself
 * is edited as this small, serialisable AST.
 */

export type EditorMathNode =
  | EditorMathText
  | EditorMathFraction
  | EditorMathRadical
  | EditorMathScript
  | EditorMathDelimiter
  | EditorMathAccent
  | EditorMathNary
  | EditorMathLimit
  | EditorMathMatrix
  | EditorMathBox
  | EditorMathGroup
  | EditorMathRaw;

export interface EditorMathText {
  kind: "text";
  value: string;
  style?: EditorMathStyle;
}

export interface EditorMathFraction {
  kind: "fraction";
  numerator: EditorMathNode[];
  denominator: EditorMathNode[];
  bar?: boolean;
}

export interface EditorMathRadical {
  kind: "radical";
  radicand: EditorMathNode[];
  degree?: EditorMathNode[];
}

export interface EditorMathScript {
  kind: "script";
  base: EditorMathNode[];
  subscript?: EditorMathNode[];
  superscript?: EditorMathNode[];
}

export interface EditorMathDelimiter {
  kind: "delimiter";
  children: EditorMathNode[][];
  begin?: string;
  end?: string;
  separator?: string;
  grow?: boolean;
}

export interface EditorMathAccent {
  kind: "accent";
  accent: string;
  children: EditorMathNode[];
}

export interface EditorMathNary {
  kind: "nary";
  operator: string;
  children: EditorMathNode[];
  subscript?: EditorMathNode[];
  superscript?: EditorMathNode[];
  grow?: boolean;
}

export interface EditorMathLimit {
  kind: "limit";
  operator: "low" | "upper";
  base: EditorMathNode[];
  limit: EditorMathNode[];
}

export interface EditorMathMatrix {
  kind: "matrix";
  rows: EditorMathNode[][][];
  rowGap?: number;
  columnGap?: number;
}

export interface EditorMathBox {
  kind: "box";
  children: EditorMathNode[];
  border?: boolean;
  hidden?: boolean;
}

export interface EditorMathGroup {
  kind: "group";
  children: EditorMathNode[];
}

/** Unknown OMML is retained so importing and re-exporting remains lossless. */
export interface EditorMathRaw {
  kind: "raw";
  xml: string;
  fallbackText?: string;
}

export interface EditorMathStyle {
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  normalText?: boolean;
  script?: "roman" | "script" | "fraktur" | "double-struck";
}

export interface EditorMathExpression {
  version: 1;
  children: EditorMathNode[];
  display?: boolean;
  /** Original OMML for diagnostics and exact round-trip of untouched data. */
  sourceXml?: string;
}

export const EMPTY_EDITOR_MATH_EXPRESSION: EditorMathExpression = {
  version: 1,
  children: [{ kind: "text", value: "" }],
};

export const MATH_OBJECT_REPLACEMENT = "\uFFFC";
