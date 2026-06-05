import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorBorderStyle } from "../../core/model.js";
import {
  WORD_NS,
  getAttributeValue,
  getFirstChildByTagNameNS,
} from "./xmlHelpers.js";
import { normalizeImportedHexColor } from "./units.js";

/**
 * Parses a single OOXML border element (`<w:top>`, `<w:left>`, ...) into the
 * editor's `EditorBorderStyle`. Shared by table-cell borders (`w:tcBorders`) and
 * paragraph borders (`w:pBdr`) so both stay in sync.
 *
 * `w:sz` is in eighths of a point; an explicit `nil`/`none` value yields a
 * zero-width "none" border so callers can distinguish "no border" from "absent".
 */
export function parseDocxBorder(
  borderNode: XmlElement | null,
): EditorBorderStyle | undefined {
  if (!borderNode) {
    return undefined;
  }

  const value = getAttributeValue(borderNode, "val");
  if (value === "nil" || value === "none") {
    return { width: 0, type: "none", color: "transparent" };
  }

  const size = Number(getAttributeValue(borderNode, "sz"));
  const width =
    Number.isFinite(size) && size > 0
      ? Math.round((size / 8) * 10000) / 10000
      : 0.75;
  const color =
    normalizeImportedHexColor(getAttributeValue(borderNode, "color")) ??
    "#000000";
  const normalizedValue = value?.toLowerCase() ?? "single";
  const type =
    normalizedValue.includes("dotted") || normalizedValue.includes("dot")
      ? "dotted"
      : normalizedValue.includes("dash")
        ? "dashed"
        : "solid";

  return { width, type, color };
}

export interface EditorBoxBorders {
  borderTop?: EditorBorderStyle;
  borderRight?: EditorBorderStyle;
  borderBottom?: EditorBorderStyle;
  borderLeft?: EditorBorderStyle;
}

/**
 * Parses the four edges of a border container (`w:tcBorders` for cells or
 * `w:pBdr` for paragraphs) into the editor's four `border*` fields.
 */
export function parseDocxBoxBorders(
  container: XmlElement | null,
): EditorBoxBorders {
  if (!container) {
    return {};
  }

  return {
    borderTop: parseDocxBorder(
      getFirstChildByTagNameNS(container, WORD_NS, "top"),
    ),
    borderRight: parseDocxBorder(
      getFirstChildByTagNameNS(container, WORD_NS, "right"),
    ),
    borderBottom: parseDocxBorder(
      getFirstChildByTagNameNS(container, WORD_NS, "bottom"),
    ),
    borderLeft: parseDocxBorder(
      getFirstChildByTagNameNS(container, WORD_NS, "left"),
    ),
  };
}
