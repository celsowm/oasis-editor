import { createEditorStyledRun } from "../../core/editorState.js";
import type {
  EditorParagraphListStyle,
  EditorTextRun,
  EditorTextStyle,
} from "../../core/model.js";
import type { EditorClipboardParagraphSpec } from "../../core/commands/clipboard.js";
import {
  cloneStyle,
  parseInlineImage,
  parseInlineStyles,
  parseParagraphStyle,
} from "../../core/commands/utils.js";

export function parseEditorClipboardHtmlWithDom(
  html: string,
): EditorClipboardParagraphSpec[] {
  if (typeof document === "undefined" || html.trim().length === 0) {
    return [];
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const paragraphs: EditorClipboardParagraphSpec[] = [];
  const rootNodes = Array.from(template.content.childNodes);

  const appendParagraph = (
    element: Element | null,
    runs: EditorTextRun[],
    list?: EditorParagraphListStyle,
  ) => {
    const fallbackRuns = runs.length > 0 ? runs : [createEditorStyledRun("")];
    paragraphs.push({
      runs: fallbackRuns.map((run) => ({
        text: run.text,
        styles: cloneStyle(run.styles),
        image: run.image ? { ...run.image } : undefined,
      })),
      style: element ? parseParagraphStyle(element) : undefined,
      list,
    });
  };

  const collectInlineRuns = (
    node: Node,
    inheritedStyle: EditorTextStyle | undefined,
  ): EditorTextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      return text.length > 0
        ? [createEditorStyledRun(text, inheritedStyle)]
        : [];
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
      return [createEditorStyledRun("\uFFFC", inheritedStyle, image)];
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
  };

  const processList = (
    element: Element,
    kind: EditorParagraphListStyle["kind"],
  ) => {
    for (const child of Array.from(element.children)) {
      if (child.tagName !== "LI") {
        continue;
      }
      appendParagraph(child, collectInlineRuns(child, undefined), {
        kind,
        level: 0,
      });
    }
  };

  for (const node of rootNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim().length > 0) {
        appendParagraph(null, [createEditorStyledRun(text)]);
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node as Element;
    if (element.tagName === "UL") {
      processList(element, "bullet");
      continue;
    }

    if (element.tagName === "OL") {
      processList(element, "ordered");
      continue;
    }

    if (
      element.tagName === "P" ||
      element.tagName === "DIV" ||
      element.tagName === "LI" ||
      /^H[1-6]$/.test(element.tagName)
    ) {
      appendParagraph(
        element,
        collectInlineRuns(element, undefined),
        element.tagName === "LI" ? { kind: "bullet", level: 0 } : undefined,
      );
      continue;
    }

    const inlineRuns = collectInlineRuns(element, undefined);
    if (inlineRuns.length > 0) {
      appendParagraph(null, inlineRuns);
    }
  }

  return paragraphs;
}
