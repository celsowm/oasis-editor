import type {
  EditorBlockNode,
  EditorDocument,
  EditorFootnote,
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { getDocumentSections } from "../../core/model.js";
import { iterateFootnoteReferenceRuns } from "../../core/footnotes.js";
import type { DocContext, ExportBuildState, NumberingContext } from "./docxTypes.js";
import { serializeParagraphXml } from "./textXml.js";
import { serializeTableXml } from "./tableXml.js";
import { OFFICE_REL_NS, WORD_NS } from "./xmlUtils.js";

/**
 * The DOCX `w:id` value to use when materializing footnotes. Real footnote
 * ids start at 1; -1 / 0 are reserved for `separator` /
 * `continuationSeparator`.
 */
const FIRST_FOOTNOTE_DOCX_ID = 1;

export interface ReferencedFootnote {
  /** Local editor id. */
  footnoteId: string;
  /** DOCX numeric id used in `w:footnoteReference w:id="N"` and `w:footnote w:id="N"`. */
  docxId: number;
  /** Footnote body. */
  footnote: EditorFootnote;
}

/**
 * Walks the document in reading order and returns one entry per distinct
 * footnote id that is actually referenced by an inline run. Unreferenced
 * footnotes in the registry are skipped.
 *
 * Returns an empty list when the document has no footnotes.
 */
export function collectReferencedFootnotesForExport(document: EditorDocument): ReferencedFootnote[] {
  const items = document.footnotes?.items;
  if (!items) return [];

  const seen = new Map<string, ReferencedFootnote>();
  let nextDocxId = FIRST_FOOTNOTE_DOCX_ID;
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    const ref = run.footnoteReference;
    if (!ref) continue;
    if (seen.has(ref.footnoteId)) continue;
    const footnote = items[ref.footnoteId];
    if (!footnote) continue;
    seen.set(ref.footnoteId, {
      footnoteId: ref.footnoteId,
      docxId: nextDocxId,
      footnote,
    });
    nextDocxId += 1;
  }
  return Array.from(seen.values());
}

export function buildFootnoteIdMap(referenced: ReferencedFootnote[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of referenced) {
    map.set(entry.footnoteId, entry.docxId);
  }
  return map;
}

/**
 * Inject a `<w:footnoteRef/>` marker at the start of the first run of the
 * first paragraph of the body. This is the convention Word uses to render
 * the visible marker (e.g. "1") inside the footnote body.
 *
 * The marker is reinjected at serialization time only — the in-memory model
 * never stores it (per MVP plan).
 */
function withInjectedFootnoteRef(blocks: EditorBlockNode[]): EditorBlockNode[] {
  if (blocks.length === 0) {
    return [createEmptyFootnoteBodyParagraph()];
  }
  const [first, ...rest] = blocks;
  if (first.type !== "paragraph") {
    // Tables in the first slot are rare; prepend an empty paragraph carrying
    // the marker so Word still sees one.
    return [createEmptyFootnoteBodyParagraph(true), first, ...rest];
  }
  return [prependFootnoteRefMarker(first), ...rest];
}

function createEmptyFootnoteBodyParagraph(withMarker = true): EditorParagraphNode {
  return {
    id: "synthetic:footnote-body-empty",
    type: "paragraph",
    runs: [
      ...(withMarker ? [makeFootnoteRefMarkerRun()] : []),
      { id: "synthetic:footnote-body-empty-text", text: "" },
    ],
    style: { styleId: "FootnoteText" },
  };
}

function prependFootnoteRefMarker(paragraph: EditorParagraphNode): EditorParagraphNode {
  return {
    ...paragraph,
    runs: [makeFootnoteRefMarkerRun(), ...paragraph.runs],
    style: paragraph.style?.styleId
      ? paragraph.style
      : { ...(paragraph.style ?? {}), styleId: "FootnoteText" },
  };
}

/**
 * Synthetic run that will be serialized as `<w:footnoteRef/>` by
 * `serializeFootnoteRefRun` below. We use a sentinel property to recognize
 * it at serialization time.
 */
function makeFootnoteRefMarkerRun(): EditorParagraphNode["runs"][number] {
  return {
    id: "synthetic:footnoteRef",
    text: "",
    styles: { styleId: "FootnoteReference", superscript: true },
    // Tag the run so the special serializer below can intercept it.
    __isFootnoteRefMarker: true,
  } as EditorParagraphNode["runs"][number] & { __isFootnoteRefMarker: true };
}

/**
 * Serialize the footnote bodies into the `<w:footnotes>` part XML, including
 * the conventional special entries (`separator` and `continuationSeparator`).
 *
 * `bodyContext` is the parent `DocContext`. We need it only to share the
 * footnoteIdMap; image/hyperlink relationships specific to the footnotes
 * part are returned via `partContext` (separate rels file).
 */
export interface FootnotesPartResult {
  xml: string;
  partContext: DocContext;
}

export function buildFootnotesXml(
  document: EditorDocument,
  referenced: ReferencedFootnote[],
  numberingContext: NumberingContext,
  state: ExportBuildState,
  buildContext: (blocks: EditorBlockNode[]) => DocContext,
  styles: Record<string, EditorNamedStyle> | undefined,
  footnoteIdMap: Map<string, number>,
): FootnotesPartResult {
  // Aggregate every block from every referenced footnote so we can build a
  // single DocContext (shared image/hyperlink registry for the part).
  const allBlocks = referenced.flatMap((entry) =>
    withInjectedFootnoteRef(entry.footnote.blocks),
  );
  const partContext = buildContext(allBlocks);
  partContext.footnoteIdMap = footnoteIdMap;

  const specials = `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>` +
    `<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`;

  const footnoteEntries = referenced
    .map((entry) => {
      const augmentedBlocks = withInjectedFootnoteRef(entry.footnote.blocks);
      const innerXml = augmentedBlocks
        .map((block) => {
          if (block.type === "paragraph") {
            // serializeParagraphXml passes each run through serializeRun,
            // which recognizes the synthetic `__isFootnoteRefMarker` flag.
            return serializeParagraphXml(block, partContext, styles);
          }
          return serializeTableXml(block, (paragraph, cell) =>
            serializeParagraphXml(paragraph, partContext, styles, {
              align: cell.style?.horizontalAlign,
            }),
          );
        })
        .join("");
      return `<w:footnote w:id="${entry.docxId}">${innerXml}</w:footnote>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:footnotes xmlns:w="${WORD_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="${OFFICE_REL_NS}">` +
    `${specials}${footnoteEntries}` +
    `</w:footnotes>`;

  return { xml, partContext };
}

/**
 * Convenience: figure out if the document has at least one referenced
 * footnote — used by callers to decide whether to emit the part at all.
 */
export function hasReferencedFootnotes(document: EditorDocument): boolean {
  if (!document.footnotes?.items) return false;
  for (const { run } of iterateFootnoteReferenceRuns(document)) {
    if (run.footnoteReference && document.footnotes.items[run.footnoteReference.footnoteId]) {
      return true;
    }
  }
  return false;
}

/** Re-export to keep the public surface small. */
export type { DocContext, NumberingContext, ExportBuildState };
// Avoid an unused-import warning for getDocumentSections when tree-shaking
// keeps the file as-is.
void getDocumentSections;
