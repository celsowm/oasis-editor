import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";

export function materializeParagraphStyle(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle {
  const effective = resolveEffectiveParagraphStyle(paragraph.style, styles);
  return {
    align: effective.align,
    spacingBefore: effective.spacingBefore,
    spacingAfter: effective.spacingAfter,
    contextualSpacing: effective.contextualSpacing,
    lineHeight: effective.lineHeight,
    lineRule: effective.lineRule,
    indentLeft: effective.indentLeft,
    indentRight: effective.indentRight,
    indentFirstLine: effective.indentFirstLine,
    indentHanging: effective.indentHanging,
    pageBreakBefore: effective.pageBreakBefore,
    keepWithNext: effective.keepWithNext,
    keepLinesTogether: effective.keepLinesTogether,
    widowControl: effective.widowControl,
    shading: effective.shading,
    borderTop: effective.borderTop,
    borderRight: effective.borderRight,
    borderBottom: effective.borderBottom,
    borderLeft: effective.borderLeft,
    tabs: effective.tabs,
    textDirection: effective.textDirection,
    outlineLevel: effective.outlineLevel,
  };
}

export function materializeRunStyle(
  run: EditorTextRun,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorTextStyle | undefined {
  const effective = resolveEffectiveTextStyleForParagraph(
    run.styles,
    paragraphStyleId,
    styles,
  );

  const materialized: EditorTextStyle = {
    bold: effective.bold,
    italic: effective.italic,
    underline: effective.underline,
    underlineStyle: effective.underlineStyle,
    underlineColor: effective.underlineColor,
    strike: effective.strike,
    doubleStrike: effective.doubleStrike,
    superscript: effective.superscript,
    subscript: effective.subscript,
    smallCaps: effective.smallCaps,
    allCaps: effective.allCaps,
    hidden: effective.hidden,
    noProof: effective.noProof,
    webHidden: effective.webHidden,
    specVanish: effective.specVanish,
    textEffect: effective.textEffect,
    characterScale: effective.characterScale,
    characterSpacing: effective.characterSpacing,
    baselineShift: effective.baselineShift,
    kerningThreshold: effective.kerningThreshold,
    ligatures: effective.ligatures,
    numberSpacing: effective.numberSpacing,
    numberForm: effective.numberForm,
    stylisticSet: effective.stylisticSet,
    contextualAlternates: effective.contextualAlternates,
    fontFamily: effective.fontFamily,
    fontSize: effective.fontSize,
    color: effective.color,
    highlight: effective.highlight,
    shading: effective.shading,
    language: effective.language,
  };

  if (run.styles?.link) {
    materialized.link = run.styles.link;
  }

  return materialized;
}
