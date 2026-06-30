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
    mirrorIndents: effective.mirrorIndents,
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
    suppressLineNumbers: effective.suppressLineNumbers,
    suppressAutoHyphens: effective.suppressAutoHyphens,
    bidi: effective.bidi,
    kinsoku: effective.kinsoku,
    wordWrap: effective.wordWrap,
    overflowPunct: effective.overflowPunct,
    topLinePunct: effective.topLinePunct,
    autoSpaceDE: effective.autoSpaceDE,
    autoSpaceDN: effective.autoSpaceDN,
    adjustRightInd: effective.adjustRightInd,
    textAlignment: effective.textAlignment,
    textboxTightWrap: effective.textboxTightWrap,
    divId: effective.divId,
    conditionalStyle: effective.conditionalStyle,
    borderBetween: effective.borderBetween,
    borderBar: effective.borderBar,
    framePrXml: effective.framePrXml,
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
    rtl: effective.rtl,
    complexScript: effective.complexScript,
    snapToGrid: effective.snapToGrid,
    fitText: effective.fitText,
    emphasisMark: effective.emphasisMark,
    textBorder: effective.textBorder,
    outline: effective.outline,
    shadow: effective.shadow,
    emboss: effective.emboss,
    imprint: effective.imprint,
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
    textFill: effective.textFill,
    textOutline: effective.textOutline,
    textShadow: effective.textShadow,
    glow: effective.glow,
    reflection: effective.reflection,
    scene3dXml: effective.scene3dXml,
    props3dXml: effective.props3dXml,
    highlight: effective.highlight,
    shading: effective.shading,
    language: effective.language,
  };

  if (run.styles?.link) {
    materialized.link = run.styles.link;
  }

  return materialized;
}
