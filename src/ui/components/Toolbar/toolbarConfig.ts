import type { EditorParagraphListStyle, EditorParagraphStyle } from "../../../core/model.js";
import type { BooleanStyleKey } from "../../toolbarStyleState.js";

export interface BooleanButton {
  key: BooleanStyleKey;
  label: string;
  icon: string;
  testId: string;
}

export interface AlignButton {
  value: NonNullable<EditorParagraphStyle["align"]>;
  label: string;
  icon: string;
  testId: string;
}

export interface ListButton {
  kind: NonNullable<EditorParagraphListStyle["kind"]>;
  label: string;
  icon: string;
  testId: string;
}

export const booleanButtons: BooleanButton[] = [
  { key: "bold", label: "B", icon: "bold", testId: "editor-toolbar-bold" },
  { key: "italic", label: "I", icon: "italic", testId: "editor-toolbar-italic" },
  { key: "underline", label: "U", icon: "underline", testId: "editor-toolbar-underline" },
  { key: "strike", label: "S", icon: "strikethrough", testId: "editor-toolbar-strike" },
  { key: "superscript", label: "Sup", icon: "superscript", testId: "editor-toolbar-superscript" },
  { key: "subscript", label: "Sub", icon: "subscript", testId: "editor-toolbar-subscript" },
];

export const alignButtons: AlignButton[] = [
  { value: "left", label: "L", icon: "align-left", testId: "editor-toolbar-align-left" },
  { value: "center", label: "C", icon: "align-center", testId: "editor-toolbar-align-center" },
  { value: "right", label: "R", icon: "align-right", testId: "editor-toolbar-align-right" },
  { value: "justify", label: "J", icon: "align-justify", testId: "editor-toolbar-align-justify" },
];

export const listButtons: ListButton[] = [
  { kind: "bullet", label: "â€¢ List", icon: "list", testId: "editor-toolbar-list-bullet" },
  { kind: "ordered", label: "1. List", icon: "list-ordered", testId: "editor-toolbar-list-ordered" },
];
