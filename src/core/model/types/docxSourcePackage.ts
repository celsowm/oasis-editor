/**
 * Serializable snapshot of the OPC package that backed an imported DOCX.
 *
 * The editor model is the typed, editable projection. This package snapshot is
 * the preservation layer for parts and relationships that Oasis does not yet
 * understand semantically. It deliberately contains only structured-clone-safe
 * data so imports can continue to run inside a Web Worker.
 */

export type EditorOpcPartKind = "xml" | "binary";
export type EditorOpcPartEncoding = "utf8" | "base64";

export interface EditorOpcRelationship {
  id: string;
  type: string;
  target: string;
  targetMode?: "Internal" | "External";
  /** Normalized package path for an internal target. */
  resolvedTarget?: string;
}

export interface EditorOpcContentTypes {
  defaults: Record<string, string>;
  overrides: Record<string, string>;
}

export interface EditorOpcPart {
  path: string;
  contentType?: string;
  kind: EditorOpcPartKind;
  data: string;
  encoding: EditorOpcPartEncoding;
  originalHash: string;
  relationships?: EditorOpcRelationship[];
}

export interface EditorDocxDiagnostic {
  level: "warning" | "error";
  code: string;
  message: string;
  partPath?: string;
  relationshipId?: string;
}

export interface EditorDocxSourcePackage {
  format: "docx";
  mainDocumentPart: string;
  contentTypes: EditorOpcContentTypes;
  rootRelationships: EditorOpcRelationship[];
  parts: Record<string, EditorOpcPart>;
  diagnostics?: EditorDocxDiagnostic[];
}
