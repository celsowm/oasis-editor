import type { EditorNamedStyle } from "../model.js";
import { DEFAULT_FONT_SIZE_PX } from "../units.js";

export const DEFAULT_EDITOR_STYLES: Record<string, EditorNamedStyle> = {
  normal: {
    id: "normal",
    name: "Normal",
    type: "paragraph",
    qFormat: true,
    uiPriority: 0,
    paragraphStyle: {
      spacingAfter: 8,
      lineHeight: 1.15,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: DEFAULT_FONT_SIZE_PX, // 11pt
    },
  },
  header: {
    id: "header",
    name: "Header",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "header",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  footer: {
    id: "footer",
    name: "Footer",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footer",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  heading1: {
    id: "heading1",
    name: "Heading 1",
    type: "paragraph",
    qFormat: true,
    uiPriority: 10,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 24,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 27,
      color: "#2e74b5",
    },
  },
  heading2: {
    id: "heading2",
    name: "Heading 2",
    type: "paragraph",
    qFormat: true,
    uiPriority: 11,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 17,
      color: "#2e74b5",
    },
  },
  heading3: {
    id: "heading3",
    name: "Heading 3",
    type: "paragraph",
    qFormat: true,
    uiPriority: 12,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 16,
      color: "#1f4d78",
    },
  },
  footnoteText: {
    id: "footnoteText",
    name: "Footnote Text",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footnoteText",
    paragraphStyle: {
      spacingAfter: 0,
      lineHeight: 1.0,
    },
    textStyle: {
      fontSize: 10,
    },
  },
  footnoteReference: {
    id: "footnoteReference",
    name: "Footnote Reference",
    type: "character",
    semiHidden: true,
    basedOn: "normal",
    textStyle: {
      superscript: true,
    },
  },
  Caption: {
    id: "Caption",
    name: "Caption",
    type: "paragraph",
    qFormat: true,
    uiPriority: 35,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      align: "center",
      spacingBefore: 4,
      spacingAfter: 8,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: 12,
      italic: true,
    },
  },
};
