import type { EditorParagraphListStyle, EditorParagraphStyle } from "../../../core/model.js";
import type { BooleanStyleKey } from "../../toolbarStyleState.js";

export interface BooleanButton {
  key: BooleanStyleKey;
  label: string;
  icon: string;
  testId: string;
  tooltip: string;
}

export interface AlignButton {
  value: NonNullable<EditorParagraphStyle["align"]>;
  label: string;
  icon: string;
  testId: string;
  tooltip: string;
}

export interface ListButton {
  kind: NonNullable<EditorParagraphListStyle["kind"]>;
  label: string;
  icon: string;
  testId: string;
  tooltip: string;
}

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

export const booleanButtons: BooleanButton[] = [
  { key: "bold", label: "B", icon: "bold", testId: "editor-toolbar-bold", tooltip: `Bold (${mod}+B)` },
  { key: "italic", label: "I", icon: "italic", testId: "editor-toolbar-italic", tooltip: `Italic (${mod}+I)` },
  { key: "strike", label: "S", icon: "strikethrough", testId: "editor-toolbar-strike", tooltip: "Strikethrough" },
  { key: "superscript", label: "Sup", icon: "superscript", testId: "editor-toolbar-superscript", tooltip: "Superscript" },
  { key: "subscript", label: "Sub", icon: "subscript", testId: "editor-toolbar-subscript", tooltip: "Subscript" },
];

export const UNDERLINE_BUTTON_TOOLTIP = `Underline (${mod}+U)`;

export const alignButtons: AlignButton[] = [
  { value: "left", label: "L", icon: "align-left", testId: "editor-toolbar-align-left", tooltip: "Align left" },
  { value: "center", label: "C", icon: "align-center", testId: "editor-toolbar-align-center", tooltip: "Align center" },
  { value: "right", label: "R", icon: "align-right", testId: "editor-toolbar-align-right", tooltip: "Align right" },
  { value: "justify", label: "J", icon: "align-justify", testId: "editor-toolbar-align-justify", tooltip: "Justify" },
];

export const listButtons: ListButton[] = [
  { kind: "bullet", label: "• List", icon: "list", testId: "editor-toolbar-list-bullet", tooltip: `Bulleted list (${mod}+Shift+8)` },
  { kind: "ordered", label: "1. List", icon: "list-ordered", testId: "editor-toolbar-list-ordered", tooltip: `Numbered list (${mod}+Shift+7)` },
];

