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

/** Preservation-only description. No executable or editable object semantics. */
export interface EditorDocxOpaqueObject {
  kind: "chart" | "diagram" | "embedded" | "ink" | "drawing" | "vml";
  ownerPath: string;
  ordinal: number;
  fragmentXml: string;
  /** Expanded-name structure; not a digest or a proof of visual equivalence. */
  signature: string;
  geometry?: {
    placement: "inline" | "anchor";
    widthEmu?: number;
    heightEmu?: number;
    wrap?: string;
    relativeHeight?: string;
  };
  relationshipIds: string[];
  edges: Array<{
    ownerPath: string;
    relationshipId: string;
    type: string;
    target: string;
    targetMode: "Internal" | "External";
    resolvedTarget?: string;
  }>;
  partPaths: string[];
  issues: EditorDocxDiagnostic[];
}

export interface EditorDocxSourcePackage {
  format: "docx";
  mainDocumentPart: string;
  contentTypes: EditorOpcContentTypes;
  rootRelationships: EditorOpcRelationship[];
  parts: Record<string, EditorOpcPart>;
  diagnostics?: EditorDocxDiagnostic[];
  /** Inventory of unsupported story objects; not part of the editable run model yet. */
  opaqueObjects?: EditorDocxOpaqueObject[];
  /**
   * Hashes of the canonical Oasis rebuild immediately after import, keyed by
   * conventional rebuilt part path. During source-backed export an equal hash
   * proves that the modeled semantic domain did not change, allowing the exact
   * source part bytes to remain untouched instead of being reserialized.
   */
  rebuiltPartHashes?: Record<string, string>;
}
