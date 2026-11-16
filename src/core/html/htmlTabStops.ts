import type { EditorDocument, EditorParagraphNode, EditorTabStop } from "@/core/model.js";
import { getParagraphText, resolveEffectiveParagraphStyle } from "@/core/model.js";
import { escapeHtml } from "./htmlEscape.js";
import { paragraphStyleToCssText } from "./styleCss.js";

const MAX_STOPS = 64;
const MAX_POSITION = 1584;
const TYPES = new Set(["left", "center", "right", "decimal", "bar", "clear"]);
const LEADERS = new Set(["none", "dot", "hyphen", "underscore", "heavy", "middleDot"]);

/** Treat clipboard metadata as untrusted; accept only the small tab schema. */
export function parseHtmlTabStops(raw: string | null): EditorTabStop[] | undefined {
  if (!raw || raw.length > 16384) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_STOPS) return undefined;
    const stops = new Map<number, EditorTabStop>();
    for (const t of parsed) {
      if (!t || typeof t !== "object" || typeof t.position !== "number" ||
          !Number.isFinite(t.position) || Math.abs(t.position) > MAX_POSITION ||
          !TYPES.has(t.type) || (t.leader !== undefined && !LEADERS.has(t.leader))) return undefined;
      const stop: EditorTabStop = {position: t.position, type: t.type};
      if (t.leader !== undefined) stop.leader = t.leader;
      stops.set(stop.position, stop);
    }
    return [...stops.values()].sort((a,b) => a.position-b.position);
  } catch {
    return undefined;
  }
}

/** Native HTML can express only a regular tab interval; native metadata carries
 * the explicit positions/alignment/leader for an Oasis-to-Oasis round trip. */
export function paragraphHtmlAttributes(
  paragraph: EditorParagraphNode,
  document: EditorDocument,
  selectedText = getParagraphText(paragraph),
): string {
  const effective = resolveEffectiveParagraphStyle(paragraph.style, document.styles);
  const tabs = effective.tabs ?? [];
  const hasTab = selectedText.includes("\t");
  const configured = document.settings?.defaultTabStop;
  const interval = typeof configured === "number" && Number.isFinite(configured) && configured > 0 ? configured : 36;
  const css = [paragraphStyleToCssText(paragraph.style),
    hasTab ? "white-space:pre-wrap" : "",
    hasTab ? "tab-size:" + interval + "pt" : ""].filter(Boolean).join(";");
  let attrs = css ? ' style="' + escapeHtml(css) + '"' : "";
  const visible = tabs.filter(t => t.type !== "clear");
  if (visible.length) {
    attrs += ' data-oasis-tab-stops="' + escapeHtml(JSON.stringify(visible)) + '"';
  }
  return attrs;
}
