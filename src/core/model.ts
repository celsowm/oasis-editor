export interface EditorTextStyle {
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

export interface EditorTabStop {
  position: number; // in pt
  type: "left" | "center" | "right" | "decimal" | "bar" | "clear";
  leader?: "none" | "dot" | "hyphen" | "underscore" | "heavy" | "middleDot";
}

export interface EditorParagraphStyle {
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
  borderTop?: EditorBorderStyle | null;
  borderRight?: EditorBorderStyle | null;
  borderBottom?: EditorBorderStyle | null;
  borderLeft?: EditorBorderStyle | null;
  tabs?: EditorTabStop[] | null;
  pageBreakBefore?: boolean;
  keepWithNext?: boolean;
}

export interface EditorNamedStyle {
  id: string;
  name: string;
  type: "paragraph" | "character";
  basedOn?: string; // ID of the parent style
  nextStyle?: string; // ID of the style for the next paragraph
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
}

export interface EditorParagraphListStyle {
  kind: "bullet" | "ordered";
  level?: number;
  format?: "decimal" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman" | "bullet";
  startAt?: number;
}

export interface EditorImageRunData {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface EditorFieldData {
  type: "PAGE" | "NUMPAGES";
}

export interface EditorRevision {
  id: string;
  type: "insert" | "delete";
  author: string;
  date: number;
}

export interface EditorTextRun {
  id: string;
  text: string;
  styles?: EditorTextStyle;
  image?: EditorImageRunData;
  field?: EditorFieldData;
  revision?: EditorRevision;
}

export interface EditorParagraphNode {
  id: string;
  type: "paragraph";
  runs: EditorTextRun[];
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
}

export interface EditorBorderStyle {
  width: number; // in pt
  type: "solid" | "dashed" | "dotted" | "none";
  color: string;
}

export interface EditorTableCellStyle {
  shading?: string; // background color (e.g., #f0f0f0)
  width?: number | string; // width in pt or percentage
  borderTop?: EditorBorderStyle;
  borderRight?: EditorBorderStyle;
  borderBottom?: EditorBorderStyle;
  borderLeft?: EditorBorderStyle;
  padding?: number; // uniform padding in pt
  verticalAlign?: "top" | "middle" | "bottom";
  horizontalAlign?: "left" | "center" | "right" | "justify";
}

export interface EditorTableCellNode {
  id: string;
  blocks: EditorParagraphNode[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: "restart" | "continue";
  style?: EditorTableCellStyle;
}

export interface EditorTableRowStyle {
  height?: number | string; // row height in pt
}

export interface EditorTableRowNode {
  id: string;
  cells: EditorTableCellNode[];
  isHeader?: boolean;
  style?: EditorTableRowStyle;
}

export interface EditorTableStyle {
  width?: number | string; // table width in pt or percentage
  align?: "left" | "center" | "right";
  indentLeft?: number; // pt (tblInd)
}

export interface EditorTableNode {
  id: string;
  type: "table";
  rows: EditorTableRowNode[];
  style?: EditorTableStyle;
}

export type EditorBlockNode = EditorParagraphNode | EditorTableNode;

export interface EditorPageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header: number;
  footer: number;
  gutter: number;
}

export interface EditorPageSettings {
  width: number;
  height: number;
  orientation?: "portrait" | "landscape";
  margins: EditorPageMargins;
}

export interface EditorSection {
  id: string;
  blocks: EditorBlockNode[];
  pageSettings: EditorPageSettings;
  header?: EditorBlockNode[];
  footer?: EditorBlockNode[];
  breakType?: "nextPage" | "continuous";
}

export interface EditorDocument {
  id: string;
  blocks: EditorBlockNode[];
  pageSettings?: EditorPageSettings;
  sections?: EditorSection[];
  styles?: Record<string, EditorNamedStyle>;
}

/**
 * Merge local overrides on top of resolved named styles, applying the policy:
 * - `undefined` in `local` → inherit from `resolved` (key is skipped)
 * - `null` in `local` → reset to system default (key is included as `null` for the caller to handle)
 * - any other value in `local` → override `resolved`
 */
function mergeTextStyles(resolved: EditorTextStyle, local: EditorTextStyle | undefined): EditorTextStyle {
  if (!local) {
    return { ...resolved };
  }
  const result = { ...resolved };
  for (const [key, value] of Object.entries(local) as [keyof EditorTextStyle, unknown][]) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

function mergeParagraphStyles(
  resolved: EditorParagraphStyle,
  local: EditorParagraphStyle | undefined,
): EditorParagraphStyle {
  if (!local) {
    return { ...resolved };
  }
  const result = { ...resolved };
  for (const [key, value] of Object.entries(local) as [keyof EditorParagraphStyle, unknown][]) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Default values for every field of EditorTextStyle.
 * Used when resolving "effective" styles (named + local + defaults).
 */
const DEFAULT_TEXT_STYLE: Required<EditorTextStyle> = {
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

export const EFFECTIVE_TEXT_STYLE_DEFAULTS: Required<EditorTextStyle> = DEFAULT_TEXT_STYLE;

const DEFAULT_PARAGRAPH_STYLE: Required<EditorParagraphStyle> = {
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
  borderTop: null as unknown as EditorBorderStyle | null,
  borderRight: null as unknown as EditorBorderStyle | null,
  borderBottom: null as unknown as EditorBorderStyle | null,
  borderLeft: null as unknown as EditorBorderStyle | null,
  tabs: null as unknown as EditorTabStop[] | null,
  pageBreakBefore: false,
  keepWithNext: false,
};

export const EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS: Required<EditorParagraphStyle> = DEFAULT_PARAGRAPH_STYLE;

export function resolveNamedTextStyle(
  styleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorTextStyle {
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
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle {
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
  style: EditorTextStyle | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorTextStyle> {
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
  style: EditorParagraphStyle | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorParagraphStyle> {
  const named = resolveNamedParagraphStyle(style?.styleId, styles);
  const merged = mergeParagraphStyles(named, style);
  return { ...DEFAULT_PARAGRAPH_STYLE, ...merged };
}

export interface EditorPosition {
  paragraphId: string;
  runId: string;
  offset: number;
}

export interface EditorSelection {
  anchor: EditorPosition;
  focus: EditorPosition;
}

export type EditorEditingZone = "main" | "header" | "footer";

export interface EditorState {
  document: EditorDocument;
  selection: EditorSelection;
  activeSectionIndex?: number;
  activeZone?: EditorEditingZone;
  trackChangesEnabled?: boolean;
}

export interface EditorCaretSlot {
  paragraphId: string;
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface EditorLayoutFragmentChar {
  char: string;
  paragraphOffset: number;
  runOffset: number;
}

export interface EditorLayoutFragment {
  paragraphId: string;
  runId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  styles?: EditorTextStyle;
  image?: EditorImageRunData;
  revision?: EditorRevision;
  chars: EditorLayoutFragmentChar[];
}

export interface EditorLayoutLine {
  paragraphId: string;
  index: number;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: EditorCaretSlot[];
  fragments: EditorLayoutFragment[];
}

export interface EditorLayoutParagraph {
  paragraphId: string;
  text: string;
  fragments: EditorLayoutFragment[];
  lines: EditorLayoutLine[];
  startOffset?: number;
  endOffset?: number;
}

export interface EditorLayoutBlock {
  blockId: string;
  blockType: EditorBlockNode["type"];
  paragraphId?: string;
  globalIndex: number;
  estimatedHeight: number;
  layout?: EditorLayoutParagraph;
  tableSegment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
  };
  sourceBlockId?: string;
  sourceBlock: EditorBlockNode;
}

export interface EditorLayoutPage {
  id: string;
  index: number;
  height: number;
  maxHeight: number;
  blocks: EditorLayoutBlock[];
  pageSettings: EditorPageSettings;
  headerBlocks?: EditorLayoutBlock[];
  footerBlocks?: EditorLayoutBlock[];
}

export interface EditorLayoutDocument {
  pages: EditorLayoutPage[];
}

export const DEFAULT_EDITOR_PAGE_SETTINGS: EditorPageSettings = {
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

export function normalizePageSettings(pageSettings: EditorPageSettings): EditorPageSettings {
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

export function getDocumentPageSettings(document: EditorDocument): EditorPageSettings {
  const pageSettings = document.pageSettings;
  return normalizePageSettings({
    width: pageSettings?.width ?? DEFAULT_EDITOR_PAGE_SETTINGS.width,
    height: pageSettings?.height ?? DEFAULT_EDITOR_PAGE_SETTINGS.height,
    orientation: pageSettings?.orientation ?? DEFAULT_EDITOR_PAGE_SETTINGS.orientation,
    margins: {
      top: pageSettings?.margins.top ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.top,
      right: pageSettings?.margins.right ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.right,
      bottom: pageSettings?.margins.bottom ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.bottom,
      left: pageSettings?.margins.left ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.left,
      header: pageSettings?.margins.header ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.header,
      footer: pageSettings?.margins.footer ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.footer,
      gutter: pageSettings?.margins.gutter ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.gutter,
    },
  });
}

export function getPageContentWidth(pageSettings: EditorPageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.width - pageSettings.margins.left - pageSettings.margins.right - pageSettings.margins.gutter),
  );
}

export function getPageContentHeight(pageSettings: EditorPageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.height - pageSettings.margins.top - pageSettings.margins.bottom),
  );
}

export function getDocumentSections(document: EditorDocument): EditorSection[] {
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

export function getBlockParagraphs(block: EditorBlockNode): EditorParagraphNode[] {
  if (block.type === "paragraph") {
    return [block];
  }

  return block.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks));
}

export function getDocumentParagraphs(document: EditorDocument): EditorParagraphNode[] {
  const sections = getDocumentSections(document);
  return sections.flatMap((section) => [
    ...(section.header?.flatMap(getBlockParagraphs) ?? []),
    ...section.blocks.flatMap(getBlockParagraphs),
    ...(section.footer?.flatMap(getBlockParagraphs) ?? []),
  ]);
}

export function getParagraphs(state: EditorState): EditorParagraphNode[] {
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

export function getActiveSectionIndex(state: EditorState): number {
  return state.activeSectionIndex ?? 0;
}

export function getActiveZone(state: EditorState): EditorEditingZone {
  return state.activeZone ?? "main";
}

export interface EditorParagraphLocation {
  sectionIndex: number;
  zone: EditorEditingZone;
  paragraphIndexInSection: number;
}

export function findParagraphLocation(
  document: EditorDocument,
  paragraphId: string,
): EditorParagraphLocation | null {
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
  blocks: EditorBlockNode[],
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
  document: EditorDocument,
  paragraphId: string,
  activeSectionIndex: number = 0,
): { blockIndex: number; rowIndex: number; cellIndex: number; paragraphIndex: number; zone: EditorEditingZone } | null {
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

export function getParagraphText(paragraph: EditorParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

export function getParagraphLength(paragraph: EditorParagraphNode): number {
  return getParagraphText(paragraph).length;
}

export function getRunIndex(paragraph: EditorParagraphNode, runId: string): number {
  const index = paragraph.runs.findIndex((run) => run.id === runId);
  return index === -1 ? 0 : index;
}

export function getRunStartOffset(paragraph: EditorParagraphNode, runId: string): number {
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
  paragraph: EditorParagraphNode,
  paragraphOffset: number,
): EditorPosition {
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
  paragraph: EditorParagraphNode,
  position: EditorPosition,
): number {
  const runIndex = getRunIndex(paragraph, position.runId);
  let offset = 0;

  for (let index = 0; index < runIndex; index += 1) {
    offset += paragraph.runs[index]?.text.length ?? 0;
  }

  const activeRun = paragraph.runs[runIndex];
  return offset + Math.max(0, Math.min(position.offset, activeRun?.text.length ?? 0));
}
