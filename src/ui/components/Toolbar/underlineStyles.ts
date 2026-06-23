import type { EditorUnderlineStyle } from "@/core/model.js";
import type { TranslationKey } from "@/i18n/index.js";

export interface UnderlineStyleOption {
  /** Word-style underline value (e.g. "single", "double", "dotted"). */
  value: EditorUnderlineStyle;
  /** i18n key for the human-readable label. */
  labelKey: TranslationKey;
  /** CSS used by the menu preview stroke. */
  preview: {
    borderStyle: "solid" | "dashed" | "dotted" | "double" | "wavy";
    borderBottomWidth?: string;
    /** Optional inline SVG fallback for wavy patterns (canvas + PDF approximate this). */
    svg?: string;
  };
}

export const UNDERLINE_STYLE_OPTIONS: UnderlineStyleOption[] = [
  {
    value: "single",
    labelKey: "underline.style.single",
    preview: { borderStyle: "solid" },
  },
  {
    value: "double",
    labelKey: "underline.style.double",
    preview: { borderStyle: "double", borderBottomWidth: "3px" },
  },
  {
    value: "thick",
    labelKey: "underline.style.thick",
    preview: { borderStyle: "solid", borderBottomWidth: "3px" },
  },
  {
    value: "dotted",
    labelKey: "underline.style.dotted",
    preview: { borderStyle: "dotted" },
  },
  {
    value: "dottedHeavy",
    labelKey: "underline.style.dottedHeavy",
    preview: { borderStyle: "dotted", borderBottomWidth: "3px" },
  },
  {
    value: "dash",
    labelKey: "underline.style.dashed",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashedHeavy",
    labelKey: "underline.style.dashedHeavy",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "dashLong",
    labelKey: "underline.style.longDashes",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashLongHeavy",
    labelKey: "underline.style.longDashesHeavy",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "dotDash",
    labelKey: "underline.style.dotDash",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashDotHeavy",
    labelKey: "underline.style.dotDashHeavy",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "dotDotDash",
    labelKey: "underline.style.dotDotDash",
    preview: { borderStyle: "dashed" },
  },
  {
    value: "dashDotDotHeavy",
    labelKey: "underline.style.dotDotDashHeavy",
    preview: { borderStyle: "dashed", borderBottomWidth: "3px" },
  },
  {
    value: "wave",
    labelKey: "underline.style.wave",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="6" viewBox="0 0 60 6" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 3 Q 5 0 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    },
  },
  {
    value: "wavyHeavy",
    labelKey: "underline.style.waveHeavy",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="6" viewBox="0 0 60 6" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 3 Q 5 0 10 3 T 20 3 T 30 3 T 40 3 T 50 3 T 60 3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    },
  },
  {
    value: "wavyDouble",
    labelKey: "underline.style.waveDouble",
    preview: {
      borderStyle: "wavy",
      svg: `<svg width="100%" height="9" viewBox="0 0 60 9" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 2 Q 5 -1 10 2 T 20 2 T 30 2 T 40 2 T 50 2 T 60 2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M0 7 Q 5 4 10 7 T 20 7 T 30 7 T 40 7 T 50 7 T 60 7" fill="none" stroke="currentColor" stroke-width="1"/></svg>`,
    },
  },
];
