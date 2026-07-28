import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorPosition,
  EditorState,
  EditorTableCellNode,
  EditorTextStyle,
} from "@/core/model.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { getDocumentParagraphsCanonical, getParagraphText } from "@/core/model.js";

/** Current version of the editor document schema. */
export const EDITOR_SCHEMA_VERSION = 1;

/**
 * Selects a specific node in the document tree. Used as a targeting mechanism
 * for edit operations and queries.
 */
export type DocumentSelector =
  | { nodeId: string }
  | { text: string; occurrence?: number }
  | { headingPath: string[] }
  | { tableId: string; row: number; column: number }
  | { bookmark: string }
  | { contentControlTag: string };

/** A range between two positions in the document. */
export interface DocumentRange {
  start: EditorPosition;
  end: EditorPosition;
}

/** Descriptor for a node in a semantic document snapshot. */
export interface SemanticNode {
  id: string;
  type: string;
  text?: string;
  node: unknown;
}

/** Descriptor for a text match found by the find API. */
export interface DocumentMatch {
  selector: { nodeId: string };
  paragraphId: string;
  text: string;
  start: number;
  end: number;
}

/** An item in the document outline (heading hierarchy). */
export interface DocumentOutlineItem {
  id: string;
  level: number;
  text: string;
  path: string[];
}

/** Immutable snapshot of the document's semantic structure. */
export interface SemanticDocumentSnapshot {
  schemaVersion: number;
  documentId: string;
  text: string;
  outline: DocumentOutlineItem[];
  nodes: SemanticNode[];
}

/** Non-fatal warning produced during an operation. */
export type OasisWarning = { code: string; message: string; nodeId?: string };

/** Error codes for operation failures. */
export type OasisErrorCode =
  | "NODE_NOT_FOUND"
  | "AMBIGUOUS_SELECTOR"
  | "INVALID_RANGE"
  | "VALIDATION_FAILED"
  | "READ_ONLY"
  | "UNSUPPORTED_OPERATION"
  | "DOCUMENT_VERSION_CONFLICT"
  | "IMPORT_FAILED"
  | "EXPORT_FAILED"
  | "ABORTED";

/** Structured error information returned on operation failure. */
export interface OasisError {
  code: OasisErrorCode;
  message: string;
  expectedVersion?: number;
  actualVersion?: number;
  details?: unknown;
}

/**
 * Wraps a successful value or an error with its metadata.
 * @typeParam T - The type of the success value.
 */
export type OasisResult<T> =
  | { ok: true; value: T; version: number; warnings: OasisWarning[] }
  | { ok: false; error: OasisError };

/** A single edit operation to be applied to the document. */
export type EditOperation =
  | { op: "insertText"; target: DocumentSelector; text: string; offset?: number }
  | { op: "replaceText"; target: DocumentSelector; text: string }
  | { op: "deleteRange"; range: DocumentRange }
  | { op: "insertParagraph"; text?: string; after?: DocumentSelector }
  | { op: "insertBlocks"; blocks: EditorBlockNode[]; after?: DocumentSelector }
  | { op: "deleteNode"; target: DocumentSelector }
  | { op: "setTextStyle"; target: DocumentSelector; style: EditorTextStyle }
  | { op: "setParagraphStyle"; target: DocumentSelector; style: { styleId: string } }
  | { op: "insertTable"; rows: string[][]; after?: DocumentSelector }
  | { op: "updateTableCell"; target: { tableId: string; row: number; column: number }; text: string };

/** Describes the origin/actor of an edit request. */
export interface EditActor { type: string; actorId?: string; label?: string }

/** Request to apply one or more edit operations to the document. */
export interface ApplyEditRequest {
  operations: EditOperation[];
  expectedVersion?: number;
  transactionId?: string;
  idempotencyKey?: string;
  origin?: EditActor;
}

/** Result value returned after applying edit operations. */
export interface ApplyEditValue { changedNodeIds: string[]; createdNodeIds: string[] }

/**
 * Deep-clones a document.
 * @param document - The document to clone.
 * @returns A deep copy of the document.
 */
export function cloneDocument<T extends EditorDocument>(document: T): T {
  return structuredClone(document);
}

/**
 * Ensures the document has a schemaVersion property set.
 * @param document - The document to normalize.
 * @returns The normalized document.
 */
export function normalizeDocument(document: EditorDocument): EditorDocument {
  const next = cloneDocument(document);
  (next as EditorDocument & { schemaVersion?: number }).schemaVersion =
    (next as EditorDocument & { schemaVersion?: number }).schemaVersion ?? EDITOR_SCHEMA_VERSION;
  return next;
}

/**
 * Validates document structure, returning errors if any.
 * @param document - The document to validate.
 * @returns An OasisResult indicating success or listing validation errors.
 */
export function validateDocument(document: EditorDocument): OasisResult<true> {
  const errors: string[] = [];
  if (!document || !document.id || !document.sections?.length) errors.push("Document must have an id and section");
  const ids = new Set<string>();
  for (const paragraph of getDocumentParagraphsCanonical(document)) {
    if (ids.has(paragraph.id)) errors.push(`Duplicate node id: ${paragraph.id}`);
    ids.add(paragraph.id);
    if (!paragraph.runs?.length) errors.push(`Paragraph has no runs: ${paragraph.id}`);
    for (const run of paragraph.runs) {
      if (ids.has(run.id)) errors.push(`Duplicate node id: ${run.id}`);
      ids.add(run.id);
    }
  }
  return errors.length
    ? { ok: false, error: { code: "VALIDATION_FAILED", message: errors.join("; "), details: errors } }
    : { ok: true, value: true, version: 0, warnings: [] };
}

/**
 * Creates a new empty editor document.
 * @param options - Optional initial blocks and title.
 * @returns A new EditorDocument.
 */
export function createDocument(options: { blocks?: EditorBlockNode[]; title?: string } = {}): EditorDocument {
  return createEditorDocument(options.blocks ?? [createEditorParagraph("")], undefined, undefined, undefined, {
    title: options.title ?? "Untitled document",
  });
}

/** Creates an empty paragraph node. Alias for {@link createEditorParagraph}. */
export const createParagraph = createEditorParagraph;

/**
 * Creates a heading paragraph.
 * @param text - The heading text.
 * @param options - Options including the heading level.
 * @returns A new heading paragraph node.
 */
export function createHeading(text: string, options: { level?: number } = {}): EditorParagraphNode {
  const paragraph = createEditorParagraph(text);
  paragraph.style = { styleId: `heading${options.level ?? 1}` };
  return paragraph;
}

/**
 * Creates a table node from a 2D array of string cell values.
 * @param rows - A 2D array where each inner array represents a row of cell values.
 * @returns A new table node.
 */
export function createTable(rows: string[][]): ReturnType<typeof createEditorTable> {
  return createEditorTable(rows.map((row) => createEditorTableRow(row.map((text) => createEditorTableCell([createEditorParagraph(text)])))));
}

function allNodes(document: EditorDocument): SemanticNode[] {
  const result: SemanticNode[] = [{ id: document.id, type: "document", node: document }];
  const visitBlocks = (blocks: EditorBlockNode[]): void => blocks.forEach((block) => {
    result.push({ id: block.id, type: block.type, text: block.type === "paragraph" ? getParagraphText(block) : undefined, node: block });
    if (block.type === "paragraph") block.runs.forEach((run) => result.push({ id: run.id, type: "run", text: run.text, node: run }));
    else block.rows.forEach((row) => { result.push({ id: row.id, type: "table-row", node: row }); row.cells.forEach((cell) => { result.push({ id: cell.id, type: "table-cell", node: cell }); visitBlocks(cell.blocks); }); });
  });
  document.sections.forEach((section) => visitBlocks(section.blocks));
  return result;
}

function resolveParagraph(document: EditorDocument, selector: DocumentSelector): EditorParagraphNode | null {
  const paragraphs = getDocumentParagraphsCanonical(document);
  if ("nodeId" in selector) return paragraphs.find((p) => p.id === selector.nodeId) ?? null;
  if ("text" in selector) {
    const found = paragraphs.filter((p) => getParagraphText(p).includes(selector.text));
    const index = selector.occurrence ?? 0;
    if (found.length !== 1 && selector.occurrence === undefined) throw new Error(found.length > 1 ? "AMBIGUOUS_SELECTOR" : "NODE_NOT_FOUND");
    return found[index] ?? null;
  }
  if ("headingPath" in selector) {
    const index = selector.headingPath.length ? selector.headingPath.length - 1 : 0;
    return paragraphs.filter((p) => p.style?.styleId?.startsWith("heading"))[index] ?? null;
  }
  if ("bookmark" in selector) {
    const bookmark = document.bookmarks?.items[selector.bookmark] ?? Object.values(document.bookmarks?.items ?? {}).find((item) => item.name === selector.bookmark);
    const paragraphId = bookmark?.start?.paragraphId;
    return paragraphId ? paragraphs.find((p) => p.id === paragraphId) ?? null : null;
  }
  if ("contentControlTag" in selector) {
    const tagged = paragraphs.find((p) => p.sdtWrappers?.some((wrapper) => wrapper.sdtPr.tag === selector.contentControlTag || wrapper.sdtPr.alias === selector.contentControlTag));
    if (tagged) return tagged;
    const taggedTable = allNodes(document).find((node) => node.type === "table" && (node.node as { sdtWrappers?: Array<{ sdtPr?: { tag?: string; alias?: string } }> }).sdtWrappers?.some((wrapper) => wrapper.sdtPr?.tag === selector.contentControlTag || wrapper.sdtPr?.alias === selector.contentControlTag));
    const firstCellParagraph = (taggedTable?.node as { rows?: Array<{ cells?: Array<{ blocks?: EditorBlockNode[] }> }> } | undefined)?.rows?.[0]?.cells?.[0]?.blocks?.find((block) => block.type === "paragraph");
    return (firstCellParagraph as EditorParagraphNode | undefined) ?? null;
  }
  if ("tableId" in selector) {
    const table = allNodes(document).find((n) => n.id === selector.tableId && n.type === "table")?.node as { rows: { cells: { blocks: EditorBlockNode[] }[] }[] } | undefined;
    return table?.rows[selector.row]?.cells[selector.column]?.blocks.find((b) => b.type === "paragraph") as EditorParagraphNode | undefined ?? null;
  }
  return null;
}

function replaceParagraph(document: EditorDocument, id: string, update: (paragraph: EditorParagraphNode) => EditorParagraphNode): void {
  const visit = (blocks: EditorBlockNode[]): boolean => { for (let i = 0; i < blocks.length; i++) { const block = blocks[i]!; if (block.type === "paragraph" && block.id === id) { blocks[i] = update(block); return true; } if (block.type === "table" && block.rows.some((r) => r.cells.some((c) => visit(c.blocks)))) return true; } return false; };
  document.sections.some((section) => visit(section.blocks));
}

/**
 * Creates a query object for read-only document inspection.
 * @param document - The document to query against.
 * @returns An object with snapshot, getText, getNode, find, and outline methods.
 */
export function queryDocument(document: EditorDocument): {
  snapshot: () => SemanticDocumentSnapshot;
  getText: (target?: DocumentSelector | DocumentRange) => string;
  getNode: (selector: DocumentSelector) => SemanticNode | null;
  find: (text: string) => DocumentMatch[];
  outline: () => DocumentOutlineItem[];
} {
  const outline = (): DocumentOutlineItem[] => getDocumentParagraphsCanonical(document).flatMap((p) => { const match = p.style?.styleId?.match(/^heading(\d+)$/); return match ? [{ id: p.id, level: Number(match[1]), text: getParagraphText(p), path: [getParagraphText(p)] }] : []; });
  return {
    snapshot: () => ({ schemaVersion: (document as EditorDocument & { schemaVersion?: number }).schemaVersion ?? EDITOR_SCHEMA_VERSION, documentId: document.id, text: getDocumentParagraphsCanonical(document).map(getParagraphText).join("\n"), outline: outline(), nodes: allNodes(document) }),
    getText: (target) => { if (!target) return getDocumentParagraphsCanonical(document).map(getParagraphText).join("\n"); if ("start" in target) return getDocumentParagraphsCanonical(document).find((p) => p.id === target.start.paragraphId)?.runs.map((r) => r.text).join("") ?? ""; return getParagraphText(resolveParagraph(document, target) ?? createEditorParagraph("")); },
    getNode: (selector) => { const paragraph = resolveParagraph(document, selector); return paragraph ? { id: paragraph.id, type: "paragraph", text: getParagraphText(paragraph), node: paragraph } : allNodes(document).find((n) => "nodeId" in selector && n.id === selector.nodeId) ?? null; },
    find: (text) => getDocumentParagraphsCanonical(document).flatMap((p) => { const value = getParagraphText(p); const matches: DocumentMatch[] = []; let start = value.indexOf(text); while (start >= 0) { matches.push({ selector: { nodeId: p.id }, paragraphId: p.id, text, start, end: start + text.length }); start = value.indexOf(text, start + Math.max(1, text.length)); } return matches; }),
    outline,
  };
}

/**
 * Applies an array of edit operations to a document.
 * @param document - The document to mutate.
 * @param operations - The operations to apply.
 * @returns The mutated document along with metadata about changed and created nodes.
 */
export function applyDocumentOperations(document: EditorDocument, operations: EditOperation[]): { document: EditorDocument; value: ApplyEditValue } {
  const next = normalizeDocument(document); const changedNodeIds: string[] = []; const createdNodeIds: string[] = [];
  for (const operation of operations) {
    if (operation.op === "insertText" || operation.op === "replaceText") {
      const paragraph = resolveParagraph(next, operation.target); if (!paragraph) throw new Error("NODE_NOT_FOUND");
      const old = getParagraphText(paragraph); const offset = operation.op === "replaceText" ? 0 : Math.min(operation.offset ?? old.length, old.length); const text = operation.op === "replaceText" ? operation.text : old.slice(0, offset) + operation.text + old.slice(offset);
      replaceParagraph(next, paragraph.id, (p) => ({ ...p, runs: [{ ...p.runs[0]!, text }] })); changedNodeIds.push(paragraph.id);
    } else if (operation.op === "deleteRange") {
      if (operation.range.start.paragraphId !== operation.range.end.paragraphId) throw new Error("INVALID_RANGE");
      const paragraph = getDocumentParagraphsCanonical(next).find((p) => p.id === operation.range.start.paragraphId);
      if (!paragraph) throw new Error("NODE_NOT_FOUND");
      const text = getParagraphText(paragraph); const start = Math.max(0, Math.min(operation.range.start.offset, text.length)); const end = Math.max(start, Math.min(operation.range.end.offset, text.length));
      replaceParagraph(next, paragraph.id, (p) => ({ ...p, runs: [{ ...p.runs[0]!, text: text.slice(0, start) + text.slice(end) }] })); changedNodeIds.push(paragraph.id);
    } else if (operation.op === "setParagraphStyle") { const paragraph = resolveParagraph(next, operation.target); if (!paragraph) throw new Error("NODE_NOT_FOUND"); replaceParagraph(next, paragraph.id, (p) => ({ ...p, style: operation.style })); changedNodeIds.push(paragraph.id);
    } else if (operation.op === "setTextStyle") { const paragraph = resolveParagraph(next, operation.target); if (!paragraph) throw new Error("NODE_NOT_FOUND"); replaceParagraph(next, paragraph.id, (p) => ({ ...p, runs: p.runs.map((r) => ({ ...r, styles: { ...r.styles, ...operation.style } })) })); changedNodeIds.push(paragraph.id);
    } else if (operation.op === "insertParagraph" || operation.op === "insertBlocks" || operation.op === "insertTable") { const blocks = operation.op === "insertParagraph" ? [createEditorParagraph(operation.text ?? "")] : operation.op === "insertTable" ? [createTable(operation.rows)] : operation.blocks; next.sections[0]!.blocks.push(...blocks); blocks.forEach((b) => { createdNodeIds.push(b.id); changedNodeIds.push(b.id); });
    } else if (operation.op === "updateTableCell") { const table = allNodes(next).find((n) => n.id === operation.target.tableId && n.type === "table")?.node as any; const paragraph = table?.rows[operation.target.row]?.cells[operation.target.column]?.blocks.find((b: any) => b.type === "paragraph") as EditorParagraphNode | undefined; if (!paragraph) throw new Error("NODE_NOT_FOUND"); replaceParagraph(next, paragraph.id, (p) => ({ ...p, runs: [{ ...p.runs[0]!, text: operation.text }] })); changedNodeIds.push(paragraph.id, operation.target.tableId);
    } else if (operation.op === "deleteNode") {
      const target = "nodeId" in operation.target ? operation.target.nodeId : resolveParagraph(next, operation.target)?.id;
      if (!target) throw new Error("NODE_NOT_FOUND");
      const remove = (blocks: EditorBlockNode[]): boolean => { const index = blocks.findIndex((b) => b.id === target); if (index >= 0) { blocks.splice(index, 1); return true; } return blocks.some((b) => b.type === "table" && b.rows.some((r) => r.cells.some((c) => remove(c.blocks)))); };
      if (!next.sections.some((section) => remove(section.blocks))) throw new Error("NODE_NOT_FOUND");
      changedNodeIds.push(target);
    } else throw new Error("UNSUPPORTED_OPERATION");
  }
  const validation = validateDocument(next); if (!validation.ok) throw new Error("VALIDATION_FAILED");
  return { document: next, value: { changedNodeIds: [...new Set(changedNodeIds)], createdNodeIds } };
}
