import { SectionNode } from "./SectionTypes.js";

export interface DocumentMetadata {
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentStyleEntry {
  styleId: string;
  type: "paragraph" | "character" | "table" | "numbering";
  name?: string;
  basedOn?: string;
  next?: string;
  isDefault?: boolean;
  paragraphProps?: Record<string, unknown>;
  runProps?: Record<string, unknown>;
}

export interface DocumentModel {
  id: string;
  revision: number;
  sections: SectionNode[];
  metadata: DocumentMetadata;
  footnotes?: { id: string; blocks: import("./BlockTypes.js").BlockNode[] }[];
  endnotes?: { id: string; blocks: import("./BlockTypes.js").BlockNode[] }[];
  comments?: { id: string; author?: string; date?: number; blocks: import("./BlockTypes.js").BlockNode[] }[];
  styles?: DocumentStyleEntry[];
}

export const createDocumentMetadata = (
  title = "Untitled",
): DocumentMetadata => ({
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
