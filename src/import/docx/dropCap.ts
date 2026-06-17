import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorDropCap } from "@/core/model.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
} from "./xmlHelpers.js";
import { type ImportedRun } from "./runs.js";

/**
 * Detect a Word drop cap frame (`w:pPr/w:framePr/@dropCap`). Word stores the
 * large initial letter in its own frame paragraph that precedes the wrapping
 * body paragraph; the import driver merges the returned descriptor onto that
 * following paragraph so the per-paragraph layout owns the cap.
 *
 * Returns null for any paragraph that is not a drop cap frame.
 */
export function parseDropCapFrame(
  paragraphProperties: XmlElement | null,
  runs: ImportedRun[],
): EditorDropCap | null {
  const framePr = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "framePr",
  );
  if (!framePr) {
    return null;
  }
  const dropCap = getAttributeValue(framePr, "dropCap");
  if (!dropCap || dropCap === "none") {
    return null;
  }

  const text = runs.map((run) => run.text).join("");
  if (text.length === 0) {
    return null;
  }

  const lines = Number(getAttributeValue(framePr, "lines"));

  return {
    text,
    lines: Number.isFinite(lines) && lines > 0 ? lines : 3,
    type: dropCap === "margin" ? "margin" : "drop",
    style: runs[0]?.styles,
  };
}
