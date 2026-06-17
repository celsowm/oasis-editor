import { createEditorStyledRun } from "@/core/editorState.js";
import type {
  EditorParagraphListStyle,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import { parseInlineImage } from "./inlineImageParser.js";
import { parseInlineStyles } from "./inlineStyleParser.js";

/**
 * Recursively collects inline runs from a DOM node, propagating inherited text
 * styles down the tree. Shared between the clipboard paste parser and the HTML
 * document importer so both treat inline formatting identically.
 *
 * - Text nodes become styled runs.
 * - `<br>` becomes a newline run.
 * - `<img>` becomes an object-replacement run carrying the parsed image data.
 * - Any other element merges its inline styles and recurses into its children.
 */
export function collectInlineRuns(
  node: Node,
  inheritedStyle: EditorTextStyle | undefined,
): EditorTextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text.length > 0 ? [createEditorStyledRun(text, inheritedStyle)] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as Element;
  if (element.tagName === "BR") {
    return [createEditorStyledRun("\n", inheritedStyle)];
  }

  const image = parseInlineImage(element);
  if (image) {
    return [createEditorStyledRun("￼", inheritedStyle, image)];
  }

  const nextStyle = {
    ...(inheritedStyle ?? {}),
    ...(parseInlineStyles(element) ?? {}),
  } as EditorTextStyle;
  const childRuns: EditorTextRun[] = [];
  for (const child of Array.from(element.childNodes)) {
    childRuns.push(...collectInlineRuns(child, nextStyle));
  }
  return childRuns;
}

/** Tags that map to a single editor paragraph. */
export function isParagraphTag(tagName: string): boolean {
  return (
    tagName === "P" ||
    tagName === "DIV" ||
    tagName === "LI" ||
    /^H[1-6]$/.test(tagName)
  );
}

/** Returns the list kind for `<ul>`/`<ol>`, or `null` for other tags. */
export function listKindForTag(
  tagName: string,
): EditorParagraphListStyle["kind"] | null {
  if (tagName === "UL") return "bullet";
  if (tagName === "OL") return "ordered";
  return null;
}
