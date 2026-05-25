import type {
  EditorBlockNode,
  EditorParagraphListStyle,
} from "../../core/model.js";

export interface DocContext {
  numberingInfo: Map<string, { numId: number; level: number }>;
  definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }>;
  images: Array<{
    rId: string;
    target: string;
    base64: string;
    runId: string;
    cx: number;
    cy: number;
    alt?: string;
  }>;
  imageMap: Map<string, string>;
  hyperlinks: Array<{ rId: string; href: string }>;
  hyperlinkMap: Map<string, string>;
}

export interface NumberingContext {
  numberingInfo: Map<string, { numId: number; level: number }>;
  definitions: Array<{
    kind: EditorParagraphListStyle["kind"];
    level: number;
    abstractNumId: number;
    numId: number;
  }>;
}

export interface ExportBuildState {
  nextImageId: number;
}

export interface PartDefinition {
  kind: "header" | "footer";
  type: "default" | "first" | "even";
  path: string;
  relId: string;
  blocks: EditorBlockNode[];
  context: DocContext;
}

export interface SectionReferenceDefinition {
  header?: Partial<Record<"default" | "first" | "even", { relId: string }>>;
  footer?: Partial<Record<"default" | "first" | "even", { relId: string }>>;
}
