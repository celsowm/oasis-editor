import type { EditorUnderlineStyle } from "../../../core/model.js";

export interface UnderlineStyleOption {
  /** Word-style underline value (e.g. "single", "double", "dotted"). */
  value: EditorUnderlineStyle;
  /** Human-readable label. */
  label: string;
  /** CSS used by the menu preview stroke. */
  preview: {
    borderStyle: "solid" | "dashed" | "dotted" | "double" | "wavy";
    borderBottomWidth?: string;
    /** Optional inline SVG fallback for wavy patterns (canvas + PDF approximate this). */
    svg?: string;
  };
}

export const UNDERLINE_STYLE_OPTIONS: UnderlineStyleOption[] = [
  { value: "single", label: "Single", preview: { borderStyle: "solid" } },
  {
    value: "double",
    label: "Double",
    preview: { borderStyle: "double", borderBottomWidth: "3px" },
  },
  {
    value: "thick",
    label: "Thick",
    preview: { borderStyle: "solid", borderBottomWidth: "3px" },
  },
  { value: "dotted", label: "Dotted", preview: { borderStyle: "dotted" } },
  {
    value: "dottedHeavy",
    label: "Dotted (Heavy)",
    preview: { borderStyle: "dotted", borderBottomWidth: "3px" },
  },
  { value: "dash", label: "Dashed", preview: { borderStyle: "dashed" } },
  {
    value: "dashedHeavy",
    label: "Dashed (Heavy)",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "dashLong",
    label: "Long Dashes",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashLongHeavy",
    label: "Long Dashes (Heavy)",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  { value: "dotDash", label: "Dot-Dash", preview: { borderStyle: "dashed" } },
  {
    value: "dashDotHeavy",
    label: "Dot-Dash (Heavy)",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "dotDotDash",
    label: "Dot-Dot-Dash",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashDotDotHeavy",
    label: "Dot-Dot-Dash (Heavy)",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "wave",
    label: "Wave",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="6" viewBox="0 0 60 6" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 3 Q 5 0 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    },
  },
  {
    value: "wavyHeavy",
    label: "Wave (Heavy)",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="6" viewBox="0 0 60 6" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 3 Q 5 0 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    },
  },
  {
    value: "wavyDouble",
    label: "Wave (Double)",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="9" viewBox="0 0 60 9" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 2 Q 5 -1 10 2 T 20 2 T 30 2 T 40 2 T 50 2 T 60 2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M0 7 Q 5 4 10 7 T 20 7 T 30 7 T 40 7 T 50 7 T 60 7" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    },
  },
];
