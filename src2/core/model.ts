export interface Editor2TextStyle {
  styleId?: string; // ID of the named character style
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: string | null;
  fontSize?: number | null;
  color?: string | null;
  highlight?: string | null;
  link?: string | null;
}

export interface Editor2TabStop {
  position: number; // in pt
  type: "left" | "center" | "right" | "decimal" | "bar" | "clear";
  leader?: "none" | "dot" | "hyphen" | "underscore" | "heavy" | "middleDot";
}

export interface Editor2ParagraphStyle {
  styleId?: string; // ID of the named paragraph style (e.g., "Heading1")
  align?: "left" | "center" | "right" | "justify";
  spacingBefore?: number | null;
  spacingAfter?: number | null;
  lineHeight?: number | null;
  indentLeft?: number | null;
  indentRight?: number | null;
  indentFirstLine?: number | null;
  indentHanging?: number | null;
  shading?: string | null; // background color
  borderTop?: Editor2BorderStyle | null;
  borderRight?: Editor2BorderStyle | null;
  borderBottom?: Editor2BorderStyle | null;
  borderLeft?: Editor2BorderStyle | null;
  tabs?: Editor2TabStop[] | null;
  pageBreakBefore?: boolean;
  keepWithNext?: boolean;
}

export interface Editor2NamedStyle {
  id: string;
  name: string;
  type: "paragraph" | "character";
  basedOn?: string; // ID of the parent style
  nextStyle?: string; // ID of the style for the next paragraph
  paragraphStyle?: Editor2ParagraphStyle;
  textStyle?: Editor2TextStyle;
}

export interface Editor2ParagraphListStyle {
  kind: "bullet" | "ordered";
  level?: number;
  format?: "decimal" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman" | "bullet";
  startAt?: number;
}

export interface Editor2ImageRunData {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Editor2FieldData {
  type: "PAGE" | "NUMPAGES";
}

export interface Editor2Revision {
  id: string;
  type: "insert" | "delete";
  author: string;
  date: number;
}

export interface Editor2TextRun {
  id: string;
  text: string;
  styles?: Editor2TextStyle;
  image?: Editor2ImageRunData;
  field?: Editor2FieldData;
  revision?: Editor2Revision;
}

export interface Editor2ParagraphNode {
  id: string;
  type: "paragraph";
  runs: Editor2TextRun[];
  style?: Editor2ParagraphStyle;
  list?: Editor2ParagraphListStyle;
}

export interface Editor2BorderStyle {
  width: number; // in pt
  type: "solid" | "dashed" | "dotted" | "none";
  color: string;
}

export interface Editor2TableCellStyle {
  shading?: string; // background color (e.g., #f0f0f0)
  width?: number | string; // width in pt or percentage
  borderTop?: Editor2BorderStyle;
  borderRight?: Editor2BorderStyle;
  borderBottom?: Editor2BorderStyle;
  borderLeft?: Editor2BorderStyle;
  padding?: number; // uniform padding in pt
  verticalAlign?: "top" | "middle" | "bottom";
  horizontalAlign?: "left" | "center" | "right" | "justify";
}

export interface Editor2TableCellNode {
  id: string;
  blocks: Editor2ParagraphNode[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: "restart" | "continue";
  style?: Editor2TableCellStyle;
}

export interface Editor2TableRowNode {
  id: string;
  cells: Editor2TableCellNode[];
  isHeader?: boolean;
}

export interface Editor2TableStyle {
  width?: number | string; // table width in pt or percentage
  align?: "left" | "center" | "right";
  indentLeft?: number; // pt (tblInd)
}

export interface Editor2TableNode {
  id: string;
  type: "table";
  rows: Editor2TableRowNode[];
  style?: Editor2TableStyle;
}

export type Editor2BlockNode = Editor2ParagraphNode | Editor2TableNode;

export interface Editor2PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header: number;
  footer: number;
  gutter: number;
}

export interface Editor2PageSettings {
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
  margins: Editor2PageMargins;
}

export interface Editor2Section {
  id: string;
  blocks: Editor2BlockNode[];
  pageSettings: Editor2PageSettings;
  header?: Editor2BlockNode[];
  footer?: Editor2BlockNode[];
  breakType?: "nextPage" | "continuous";
}

export interface Editor2Document {
  id: string;
  blocks: Editor2BlockNode[];
  pageSettings?: Editor2PageSettings;
  sections?: Editor2Section[];
  styles?: Record<string, Editor2NamedStyle>;
}

/**
 * Merge local overrides on top of resolved named styles, applying the policy:
 * - `undefined` in `local` → inherit from `resolved` (key is skipped)
 * - `null` in `local` → reset to system default (key is included as `null` for the caller to handle)
 * - any other value in `local` → override `resolved`
 */
function mergeTextStyles(resolved: Editor2TextStyle, local: Editor2TextStyle | undefined): Editor2TextStyle {
  if (!local) {
    return { ...resolved };
  }
  const result = { ...resolved };
  for (const [key, value] of Object.entries(local) as [keyof Editor2TextStyle, unknown][]) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

function mergeParagraphStyles(
  resolved: Editor2ParagraphStyle,
  local: Editor2ParagraphStyle | undefined,
): Editor2ParagraphStyle {
  if (!local) {
    return { ...resolved };
  }
  const result = { ...resolved };
  for (const [key, value] of Object.entries(local) as [keyof Editor2ParagraphStyle, unknown][]) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Default values for every field of Editor2TextStyle.
 * Used when resolving "effective" styles (named + local + defaults).
 */
const DEFAULT_TEXT_STYLE: Required<Editor2TextStyle> = {
  styleId: undefined as unknown as string,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  superscript: false,
  subscript: false,
  fontFamily: "Arial",
  fontSize: 20,
  color: "#000000",
  highlight: null as unknown as string | null,
  link: null as unknown as string | null,
};

export const EFFECTIVE_TEXT_STYLE_DEFAULTS: Required<Editor2TextStyle> = DEFAULT_TEXT_STYLE;

const DEFAULT_PARAGRAPH_STYLE: Required<Editor2ParagraphStyle> = {
  styleId: undefined as unknown as string,
  align: "left",
  spacingBefore: 0,
  spacingAfter: 0,
  lineHeight: 1.6,
  indentLeft: 0,
  indentRight: 0,
  indentFirstLine: 0,
  indentHanging: 0,
  shading: null as unknown as string | null,
  borderTop: null as unknown as Editor2BorderStyle | null,
  borderRight: null as unknown as Editor2BorderStyle | null,
  borderBottom: null as unknown as Editor2BorderStyle | null,
  borderLeft: null as unknown as Editor2BorderStyle | null,
  tabs: null as unknown as Editor2TabStop[] | null,
  pageBreakBefore: false,
  keepWithNext: false,
};

export const EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS: Required<Editor2ParagraphStyle> = DEFAULT_PARAGRAPH_STYLE;

export function resolveNamedTextStyle(
  styleId: string | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Editor2TextStyle {
  if (!styleId || !styles || !styles[styleId]) {
    return {};
  }

  const namedStyle = styles[styleId];
  const baseStyle = namedStyle.basedOn ? resolveNamedTextStyle(namedStyle.basedOn, styles) : {};
  
  return {
    ...baseStyle,
    ...(namedStyle.textStyle ?? {}),
  };
}

export function resolveNamedParagraphStyle(
  styleId: string | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Editor2ParagraphStyle {
  if (!styleId || !styles || !styles[styleId]) {
    return {};
  }

  const namedStyle = styles[styleId];
  const baseStyle = namedStyle.basedOn ? resolveNamedParagraphStyle(namedStyle.basedOn, styles) : {};

  return {
    ...baseStyle,
    ...(namedStyle.paragraphStyle ?? {}),
  };
}

/**
 * Resolve the effective text style for a run:
 * 1. Resolve named style via styleId + basedOn chain
 * 2. Apply local overrides (undefined → inherit, null → keep as null for reset)
 * 3. Fill in system defaults for any remaining undefined values
 */
export function resolveEffectiveTextStyle(
  style: Editor2TextStyle | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Required<Editor2TextStyle> {
  const named = resolveNamedTextStyle(style?.styleId, styles);
  const merged = mergeTextStyles(named, style);
  return { ...DEFAULT_TEXT_STYLE, ...merged };
}

/**
 * Resolve the effective paragraph style:
 * 1. Resolve named style via styleId + basedOn chain
 * 2. Apply local overrides (undefined → inherit, null → keep as null for reset)
 * 3. Fill in system defaults for any remaining undefined values
 */
export function resolveEffectiveParagraphStyle(
  style: Editor2ParagraphStyle | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Required<Editor2ParagraphStyle> {
  const named = resolveNamedParagraphStyle(style?.styleId, styles);
  const merged = mergeParagraphStyles(named, style);
  return { ...DEFAULT_PARAGRAPH_STYLE, ...merged };
}

export interface Editor2Position {
  paragraphId: string;
  runId: string;
  offset: number;
}

export interface Editor2Selection {
  anchor: Editor2Position;
  focus: Editor2Position;
}

export type Editor2EditingZone = "main" | "header" | "footer";

export interface Editor2State {
  document: Editor2Document;
  selection: Editor2Selection;
  activeSectionIndex?: number;
  activeZone?: Editor2EditingZone;
  trackChangesEnabled?: boolean;
}

export interface Editor2CaretSlot {
  paragraphId: string;
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface Editor2LayoutFragmentChar {
  char: string;
  paragraphOffset: number;
  runOffset: number;
}

export interface Editor2LayoutFragment {
  paragraphId: string;
  runId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  styles?: Editor2TextStyle;
  image?: Editor2ImageRunData;
  revision?: Editor2Revision;
  chars: Editor2LayoutFragmentChar[];
}

export interface Editor2LayoutLine {
  paragraphId: string;
  index: number;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: Editor2CaretSlot[];
  fragments: Editor2LayoutFragment[];
}

export interface Editor2LayoutParagraph {
  paragraphId: string;
  text: string;
  fragments: Editor2LayoutFragment[];
  lines: Editor2LayoutLine[];
  startOffset?: number;
  endOffset?: number;
}

export interface Editor2LayoutBlock {
  blockId: string;
  blockType: Editor2BlockNode["type"];
  paragraphId?: string;
  globalIndex: number;
  estimatedHeight: number;
  layout?: Editor2LayoutParagraph;
  tableSegment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
  };
  sourceBlockId?: string;
  sourceBlock: Editor2BlockNode;
}

export interface Editor2LayoutPage {
  id: string;
  index: number;
  height: number;
  maxHeight: number;
  blocks: Editor2LayoutBlock[];
  pageSettings: Editor2PageSettings;
  headerBlocks?: Editor2LayoutBlock[];
  footerBlocks?: Editor2LayoutBlock[];
}

export interface Editor2LayoutDocument {
  pages: Editor2LayoutPage[];
}

export const DEFAULT_EDITOR2_PAGE_SETTINGS: Editor2PageSettings = {
  width: 816,
  height: 1056,
  orientation: "portrait",
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

function inferPageOrientation(width: number, height: number): "portrait" | "landscape" {
  return width > height ? "landscape" : "portrait";
}

export function normalizePageSettings(pageSettings: Editor2PageSettings): Editor2PageSettings {
  const orientation = pageSettings.orientation ?? inferPageOrientation(pageSettings.width, pageSettings.height);
  const shouldSwap =
    (orientation === "landscape" && pageSettings.width < pageSettings.height) ||
    (orientation === "portrait" && pageSettings.width > pageSettings.height);
  const width = shouldSwap ? pageSettings.height : pageSettings.width;
  const height = shouldSwap ? pageSettings.width : pageSettings.height;

  return {
    width,
    height,
    orientation,
    margins: {
      top: pageSettings.margins.top,
      right: pageSettings.margins.right,
      bottom: pageSettings.margins.bottom,
      left: pageSettings.margins.left,
      header: pageSettings.margins.header,
      footer: pageSettings.margins.footer,
      gutter: pageSettings.margins.gutter,
    },
  };
}

export function getDocumentPageSettings(document: Editor2Document): Editor2PageSettings {
  const pageSettings = document.pageSettings;
  return normalizePageSettings({
    width: pageSettings?.width ?? DEFAULT_EDITOR2_PAGE_SETTINGS.width,
    height: pageSettings?.height ?? DEFAULT_EDITOR2_PAGE_SETTINGS.height,
    orientation: pageSettings?.orientation ?? DEFAULT_EDITOR2_PAGE_SETTINGS.orientation,
    margins: {
      top: pageSettings?.margins.top ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.top,
      right: pageSettings?.margins.right ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.right,
      bottom: pageSettings?.margins.bottom ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.bottom,
      left: pageSettings?.margins.left ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.left,
      header: pageSettings?.margins.header ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.header,
      footer: pageSettings?.margins.footer ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.footer,
      gutter: pageSettings?.margins.gutter ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.gutter,
    },
  });
}

export function getPageContentWidth(pageSettings: Editor2PageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.width - pageSettings.margins.left - pageSettings.margins.right - pageSettings.margins.gutter),
  );
}

export function getPageContentHeight(pageSettings: Editor2PageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.height - pageSettings.margins.top - pageSettings.margins.bottom),
  );
}

export function getDocumentSections(document: Editor2Document): Editor2Section[] {
  if (document.sections && document.sections.length > 0) {
    return document.sections.map((section) => ({
      ...section,
      pageSettings: normalizePageSettings(section.pageSettings),
    }));
  }

  return [
    {
      id: "section:default",
      blocks: document.blocks,
      pageSettings: getDocumentPageSettings(document),
    },
  ];
}

export function getBlockParagraphs(block: Editor2BlockNode): Editor2ParagraphNode[] {
  if (block.type === "paragraph") {
    return [block];
  }

  return block.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks));
}

export function getDocumentParagraphs(document: Editor2Document): Editor2ParagraphNode[] {
  const sections = getDocumentSections(document);
  return sections.flatMap((section) => [
    ...(section.header?.flatMap(getBlockParagraphs) ?? []),
    ...section.blocks.flatMap(getBlockParagraphs),
    ...(section.footer?.flatMap(getBlockParagraphs) ?? []),
  ]);
}

export function getParagraphs(state: Editor2State): Editor2ParagraphNode[] {
  // When document has sections, return paragraphs from the active zone only
  if (state.document.sections && state.document.sections.length > 0) {
    const sectionIndex = getActiveSectionIndex(state);
    const zone = getActiveZone(state);
    const section = state.document.sections[sectionIndex];
    if (!section) {
      // Fallback to all paragraphs if section index is invalid
      return getDocumentParagraphs(state.document);
    }

    const headerParagraphs = zone === "header" ? (section.header?.flatMap(getBlockParagraphs) ?? []) : [];
    const footerParagraphs = zone === "footer" ? (section.footer?.flatMap(getBlockParagraphs) ?? []) : [];
    const mainParagraphs = zone === "main"
      ? section.blocks.flatMap(getBlockParagraphs)
      : [];

    return [...headerParagraphs, ...mainParagraphs, ...footerParagraphs];
  }

  // Legacy: no sections, return flat from document.blocks
  return getDocumentParagraphs(state.document);
}

export function getActiveSectionIndex(state: Editor2State): number {
  return state.activeSectionIndex ?? 0;
}

export function getActiveZone(state: Editor2State): Editor2EditingZone {
  return state.activeZone ?? "main";
}

export interface Editor2ParagraphLocation {
  sectionIndex: number;
  zone: Editor2EditingZone;
  paragraphIndexInSection: number;
}

export function findParagraphLocation(
  document: Editor2Document,
  paragraphId: string,
): Editor2ParagraphLocation | null {
  const sections = getDocumentSections(document);

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];

    // Check header
    if (section.header) {
      for (let i = 0; i < section.header.length; i += 1) {
        if (section.header[i].id === paragraphId) {
          return { sectionIndex, zone: "header", paragraphIndexInSection: i };
        }
      }
    }

    // Check main blocks
    let mainIndex = 0;
    for (const block of section.blocks) {
      const paragraphs = getBlockParagraphs(block);
      for (const p of paragraphs) {
        if (p.id === paragraphId) {
          return { sectionIndex, zone: "main", paragraphIndexInSection: mainIndex };
        }
        mainIndex += 1;
      }
    }

    // Check footer
    if (section.footer) {
      for (let i = 0; i < section.footer.length; i += 1) {
        if (section.footer[i].id === paragraphId) {
          return { sectionIndex, zone: "footer", paragraphIndexInSection: i };
        }
      }
    }
  }

  return null;
}

function findInBlocks(
  blocks: Editor2BlockNode[],
  paragraphId: string,
): { blockIndex: number; rowIndex: number; cellIndex: number; paragraphIndex: number } | null {
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex]!;
    if (block.type !== "table") {
      continue;
    }

    for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
      const row = block.rows[rowIndex]!;
      for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
        const cell = row.cells[cellIndex]!;
        const paragraphIndex = cell.blocks.findIndex((paragraph) => paragraph.id === paragraphId);
        if (paragraphIndex !== -1) {
          return { blockIndex, rowIndex, cellIndex, paragraphIndex };
        }
      }
    }
  }

  return null;
}

export function findParagraphTableLocation(
  document: Editor2Document,
  paragraphId: string,
  activeSectionIndex: number = 0,
): { blockIndex: number; rowIndex: number; cellIndex: number; paragraphIndex: number; zone: Editor2EditingZone } | null {
  const hasSections = document.sections && document.sections.length > 0;
  const section = hasSections ? document.sections![activeSectionIndex] : null;

  if (section) {
    // Search in header
    const headerLoc = findInBlocks(section.header ?? [], paragraphId);
    if (headerLoc) return { ...headerLoc, zone: "header" };

    // Search in main blocks
    const mainLoc = findInBlocks(section.blocks, paragraphId);
    if (mainLoc) return { ...mainLoc, zone: "main" };

    // Search in footer
    const footerLoc = findInBlocks(section.footer ?? [], paragraphId);
    if (footerLoc) return { ...footerLoc, zone: "footer" };
  } else {
    // No sections, search in top-level blocks
    const mainLoc = findInBlocks(document.blocks, paragraphId);
    if (mainLoc) return { ...mainLoc, zone: "main" };
  }

  return null;
}

export function getParagraphText(paragraph: Editor2ParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

export function getParagraphLength(paragraph: Editor2ParagraphNode): number {
  return getParagraphText(paragraph).length;
}

export function getRunIndex(paragraph: Editor2ParagraphNode, runId: string): number {
  const index = paragraph.runs.findIndex((run) => run.id === runId);
  return index === -1 ? 0 : index;
}

export function getRunStartOffset(paragraph: Editor2ParagraphNode, runId: string): number {
  let offset = 0;
  for (const run of paragraph.runs) {
    if (run.id === runId) {
      return offset;
    }
    offset += run.text.length;
  }
  return 0;
}

export function paragraphOffsetToPosition(
  paragraph: Editor2ParagraphNode,
  paragraphOffset: number,
): Editor2Position {
  const maxOffset = Math.max(0, Math.min(paragraphOffset, getParagraphLength(paragraph)));
  let consumed = 0;

  for (const run of paragraph.runs) {
    const nextConsumed = consumed + run.text.length;
    if (maxOffset <= nextConsumed) {
      return {
        paragraphId: paragraph.id,
        runId: run.id,
        offset: maxOffset - consumed,
      };
    }
    consumed = nextConsumed;
  }

  const fallbackRun = paragraph.runs[paragraph.runs.length - 1];
  return {
    paragraphId: paragraph.id,
    runId: fallbackRun.id,
    offset: fallbackRun.text.length,
  };
}

export function positionToParagraphOffset(
  paragraph: Editor2ParagraphNode,
  position: Editor2Position,
): number {
  const runIndex = getRunIndex(paragraph, position.runId);
  let offset = 0;

  for (let index = 0; index < runIndex; index += 1) {
    offset += paragraph.runs[index]?.text.length ?? 0;
  }

  const activeRun = paragraph.runs[runIndex];
  return offset + Math.max(0, Math.min(position.offset, activeRun?.text.length ?? 0));
}
