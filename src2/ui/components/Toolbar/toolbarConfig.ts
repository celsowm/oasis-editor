import type { Editor2ParagraphListStyle, Editor2ParagraphStyle } from "../../../core/model.js";
import type { BooleanStyleKey } from "../../toolbarStyleState.js";

export interface BooleanButton {
  key: BooleanStyleKey;
  label: string;
  icon: string;
  testId: string;
}

export interface AlignButton {
  value: NonNullable<Editor2ParagraphStyle["align"]>;
  label: string;
  icon: string;
  testId: string;
}

export interface ListButton {
  kind: NonNullable<Editor2ParagraphListStyle["kind"]>;
  label: string;
  icon: string;
  testId: string;
}

export const booleanButtons: BooleanButton[] = [
  { key: "bold", label: "B", icon: "bold", testId: "editor-2-toolbar-bold" },
  { key: "italic", label: "I", icon: "italic", testId: "editor-2-toolbar-italic" },
  { key: "underline", label: "U", icon: "underline", testId: "editor-2-toolbar-underline" },
  { key: "strike", label: "S", icon: "strikethrough", testId: "editor-2-toolbar-strike" },
  { key: "superscript", label: "Sup", icon: "superscript", testId: "editor-2-toolbar-superscript" },
  { key: "subscript", label: "Sub", icon: "subscript", testId: "editor-2-toolbar-subscript" },
];

export const alignButtons: AlignButton[] = [
  { value: "left", label: "L", icon: "align-left", testId: "editor-2-toolbar-align-left" },
  { value: "center", label: "C", icon: "align-center", testId: "editor-2-toolbar-align-center" },
  { value: "right", label: "R", icon: "align-right", testId: "editor-2-toolbar-align-right" },
  { value: "justify", label: "J", icon: "align-justify", testId: "editor-2-toolbar-align-justify" },
];

export const listButtons: ListButton[] = [
  { kind: "bullet", label: "• List", icon: "list", testId: "editor-2-toolbar-list-bullet" },
  { kind: "ordered", label: "1. List", icon: "list-ordered", testId: "editor-2-toolbar-list-ordered" },
];
