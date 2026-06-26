import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextStyle,
} from "@/core/model.js";
import { resolveTableParagraphInheritance } from "@/core/model.js";

/**
 * Table-cell paragraph resolution is identity-sensitive.
 *
 * `projectParagraphLayout` caches the (expensive) text-shaping result in a
 * `WeakMap` keyed on the `EditorParagraphNode` *object identity*. Body
 * paragraphs benefit from this directly because immutable edits only replace
 * the edited paragraph's node — every other paragraph keeps its identity and
 * stays cache-hot.
 *
 * Table cells, however, must apply table-level style inheritance (table style,
 * conditional formatting, row/cell formatting) on top of each cell paragraph.
 * Both the pagination measure path and the canvas render path used to rebuild a
 * fresh paragraph/run object via object spread on *every* layout pass, which
 * gave those clones a brand-new identity and therefore *always* missed the
 * paragraph layout cache. In documents with many tables this re-shaped every
 * table-cell paragraph on every keystroke and dominated edit latency.
 *
 * This helper memoizes the resolved clone so the *same* object identity is
 * reused across passes (restoring the WeakMap cache hit), while still
 * invalidating correctly when the source paragraph, the resolved formatting, or
 * the document's named styles change.
 */

interface TableParagraphFormatting {
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
}

interface PerParagraphCache {
  // Used when no `styles` map is available (rare). Keyed by formatting signature.
  noStyles: Map<string, EditorParagraphNode>;
  // Keyed by the document `styles` object identity, then by formatting signature.
  // Named-style edits replace the styles object (immutable update), which
  // discards the stale bucket here.
  byStyles: WeakMap<
    Record<string, EditorNamedStyle>,
    Map<string, EditorParagraphNode>
  >;
}

const cache = new WeakMap<EditorParagraphNode, PerParagraphCache>();

function getOrCreateStylesBucket(
  byStyles: PerParagraphCache["byStyles"],
  styles: Record<string, EditorNamedStyle>,
): Map<string, EditorParagraphNode> {
  let bucket = byStyles.get(styles);
  if (!bucket) {
    bucket = new Map();
    byStyles.set(styles, bucket);
  }
  return bucket;
}

/**
 * Returns a stable, formatting-resolved clone of a table-cell paragraph.
 *
 * The returned object keeps a consistent identity for the same
 * (source paragraph, resolved formatting, styles) combination so that
 * `projectParagraphLayout`'s identity-keyed cache can hit across layout passes.
 * Both the measure path (`tablePagination`) and the render path
 * (`CanvasTableLayout`) must call this so they share the same clone identity.
 */
export function resolveCachedTableCellParagraph(
  source: EditorParagraphNode,
  formatting: TableParagraphFormatting | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphNode {
  const inherited = resolveTableParagraphInheritance(
    formatting?.paragraphStyle,
    source.style?.styleId,
    styles,
  );

  const signature = JSON.stringify([
    inherited ?? null,
    formatting?.textStyle ?? null,
  ]);

  let perParagraph = cache.get(source);
  if (!perParagraph) {
    perParagraph = { noStyles: new Map(), byStyles: new WeakMap() };
    cache.set(source, perParagraph);
  }

  const bucket = styles
    ? getOrCreateStylesBucket(perParagraph.byStyles, styles)
    : perParagraph.noStyles;

  const cached = bucket.get(signature);
  if (cached) {
    return cached;
  }

  const resolved: EditorParagraphNode = {
    ...source,
    style: {
      ...inherited,
      ...source.style,
    },
    runs: source.runs.map((run) => ({
      ...run,
      styles: { ...formatting?.textStyle, ...run.styles },
    })),
  };

  bucket.set(signature, resolved);
  return resolved;
}
