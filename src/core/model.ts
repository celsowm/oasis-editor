export type EditorUnderlineStyle =
  | "single"
  | "double"
  | "thick"
  | "dotted"
  | "dottedHeavy"
  | "dash"
  | "dashedHeavy"
  | "dashLong"
  | "dashLongHeavy"
  | "dotDash"
  | "dashDotHeavy"
  | "dotDotDash"
  | "dashDotDotHeavy"
  | "wave"
  | "wavyHeavy"
  | "wavyDouble"
  | "words";

export interface EditorTextStyle {
  styleId?: string; // ID of the named character style
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  underlineStyle?: EditorUnderlineStyle | null;
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
  lineGridPitch?: number | null;
  lineGridType?: "lines" | "linesAndChars" | "snapToChars" | "implicit" | null;
  snapToGrid?: boolean;
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
  keepLinesTogether?: boolean;
  widowControl?: boolean;
}

export interface EditorNamedStyle {
  id: string;
  name: string;
  type: "paragraph" | "character" | "table";
  basedOn?: string; // ID of the parent style
  nextStyle?: string; // ID of the style for the next paragraph
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
  tableStyle?: EditorTableStyle;
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
  paddingTop?: number; // pt
  paddingRight?: number; // pt
  paddingBottom?: number; // pt
  paddingLeft?: number; // pt
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
  styleId?: string; // ID of the named table style (e.g., "TableGrid")
  width?: number | string; // table width in pt or percentage
  align?: "left" | "center" | "right";
  indentLeft?: number; // pt (tblInd)
  pageBreakBefore?: boolean;
}

export interface EditorTableNode {
  id: string;
  type: "table";
  rows: EditorTableRowNode[];
  gridCols?: number[]; // column widths in pt (tblGrid)
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
  firstPageHeader?: EditorBlockNode[];
  evenPageHeader?: EditorBlockNode[];
  footer?: EditorBlockNode[];
  firstPageFooter?: EditorBlockNode[];
  evenPageFooter?: EditorBlockNode[];
  breakType?: "nextPage" | "continuous";
}

/**
 * An out-of-band asset bundled with the document (e.g. an embedded image).
 * Heavy binary data (data URLs) lives here exactly once; runs reference it
 * via `image.src = "asset:<id>"`. Keeping payloads off the per-paragraph
 * state lets equality checks, signatures and clones stay cheap on every
 * keystroke even when a document embeds large images.
 */
export interface EditorAsset {
  id: string;
  /** Full data URL (e.g. `data:image/png;base64,...`) or remote URL. */
  url: string;
}

export const EDITOR_ASSET_REF_PREFIX = "asset:";

export interface EditorDocument {
  id: string;
  pageSettings?: EditorPageSettings;
  sections?: EditorSection[];
  styles?: Record<string, EditorNamedStyle>;
  /**
   * Out-of-band asset registry. Image runs reference entries here using
   * `src = "asset:<id>"`. The map itself is treated as append-only and is
   * deliberately excluded from per-keystroke equality checks/signatures.
   */
  assets?: Record<string, EditorAsset>;
  metadata?: {
    title?: string;
    [key: string]: any;
  };
}

/**
 * Resolve an `asset:<id>` reference (or pass through any other src) to the
 * actual URL using the document's asset registry.
 */
export function resolveImageSrc(
  document: Pick<EditorDocument, "assets"> | undefined,
  src: string | undefined,
): string {
  if (!src) {
    return "";
  }
  if (!src.startsWith(EDITOR_ASSET_REF_PREFIX)) {
    return src;
  }
  const id = src.slice(EDITOR_ASSET_REF_PREFIX.length);
  const asset = document?.assets?.[id];
  return asset?.url ?? src;
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
  underlineStyle: null as unknown as EditorUnderlineStyle | null,
  strike: false,
  superscript: false,
  subscript: false,
  fontFamily: "Calibri, sans-serif",
  fontSize: 15,
  color: "#000000",
  highlight: null as unknown as string | null,
  link: null as unknown as string | null,
};

export const EFFECTIVE_TEXT_STYLE_DEFAULTS: Required<EditorTextStyle> = DEFAULT_TEXT_STYLE;

const DEFAULT_PARAGRAPH_STYLE: Required<EditorParagraphStyle> = {
  styleId: undefined as unknown as string,
  align: "left",
  spacingBefore: 0,
  spacingAfter: 8,
  lineHeight: 1.15,
  lineGridPitch: null as unknown as number | null,
  lineGridType: null as unknown as "lines" | "linesAndChars" | "snapToChars" | "implicit" | null,
  snapToGrid: true,
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
  keepLinesTogether: false,
  widowControl: true,
};

export const EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS: Required<EditorParagraphStyle> = DEFAULT_PARAGRAPH_STYLE;

function resolveDefaultParagraphStyleId(
  styles: Record<string, EditorNamedStyle> | undefined,
): string | undefined {
  if (!styles) {
    return undefined;
  }

  const exactNormal = Object.values(styles).find(
    (style) => style.type === "paragraph" && style.id.toLowerCase() === "normal",
  );
  if (exactNormal) {
    return exactNormal.id;
  }

  const namedNormal = Object.values(styles).find(
    (style) => style.type === "paragraph" && style.name.toLowerCase() === "normal",
  );
  if (namedNormal) {
    return namedNormal.id;
  }

  return undefined;
}

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
 * Resolve the effective text style for a run, inheriting textStyle from the
 * paragraph named style when the run does not override it locally.
 */
export function resolveEffectiveTextStyleForParagraph(
  style: EditorTextStyle | undefined,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Required<EditorTextStyle> {
  const effectiveParagraphStyleId =
    paragraphStyleId ?? resolveDefaultParagraphStyleId(styles);
  const paragraphNamed = resolveNamedTextStyle(effectiveParagraphStyleId, styles);
  const runNamed = resolveNamedTextStyle(style?.styleId, styles);
  const inherited = mergeTextStyles(paragraphNamed, runNamed);
  const merged = mergeTextStyles(inherited, style);
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
  const effectiveStyleId = style?.styleId ?? resolveDefaultParagraphStyleId(styles);
  const named = resolveNamedParagraphStyle(effectiveStyleId, styles);
  const merged = mergeParagraphStyles(named, {
    ...style,
    styleId: effectiveStyleId,
  });
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
  showMargins?: boolean;
  showParagraphMarks?: boolean;
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
  contentWidth?: number;
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
  bodyTop?: number;
  bodyBottom?: number;
  headerTop?: number;
  footerTop?: number;
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

function clampPageOffset(value: number, limit: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(0, value), limit);
}

export function getPageHeaderZoneTop(pageSettings: EditorPageSettings): number {
  return clampPageOffset(pageSettings.margins.header, pageSettings.height);
}

export function getPageBodyTop(pageSettings: EditorPageSettings): number {
  return Math.max(
    clampPageOffset(pageSettings.margins.top, pageSettings.height),
    getPageHeaderZoneTop(pageSettings),
  );
}

export function getPageFooterReferenceTop(pageSettings: EditorPageSettings): number {
  return pageSettings.height - clampPageOffset(pageSettings.margins.footer, pageSettings.height);
}

export function getPageBodyBottom(pageSettings: EditorPageSettings): number {
  const marginBottomTop = pageSettings.height - clampPageOffset(pageSettings.margins.bottom, pageSettings.height);
  return Math.min(
    pageSettings.height,
    Math.max(getPageBodyTop(pageSettings), Math.min(marginBottomTop, getPageFooterReferenceTop(pageSettings))),
  );
}

export function getPageHeaderZoneHeight(pageSettings: EditorPageSettings): number {
  return Math.max(0, getPageBodyTop(pageSettings) - getPageHeaderZoneTop(pageSettings));
}

export function getPageFooterZoneTop(pageSettings: EditorPageSettings): number {
  return getPageBodyBottom(pageSettings);
}

export function getPageFooterZoneHeight(pageSettings: EditorPageSettings): number {
  return Math.max(0, pageSettings.height - getPageFooterZoneTop(pageSettings));
}

export function getPageContentHeight(pageSettings: EditorPageSettings): number {
  return Math.max(
    24,
    Math.floor(getPageBodyBottom(pageSettings) - getPageBodyTop(pageSettings)),
  );
}

export function getDocumentSectionsCanonical(document: EditorDocument): EditorSection[] {
  if (document.sections && document.sections.length > 0) {
    return document.sections.map((section) => ({
      ...section,
      pageSettings: normalizePageSettings(section.pageSettings),
    }));
  }

  return [
    {
      id: "section:default",
      blocks: [],
      pageSettings: getDocumentPageSettings(document),
    },
  ];
}

export function getDocumentSections(document: EditorDocument): EditorSection[] {
  return getDocumentSectionsCanonical(document);
}

export function getEditableBlocksForZone(
  state: EditorState,
  zone: EditorEditingZone,
): EditorBlockNode[] {
  const sections = getDocumentSectionsCanonical(state.document);
  const sectionIndex = Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
  const section = sections[sectionIndex];
  if (!section) {
    return [];
  }
  if (zone === "header") {
    return section.header ?? [];
  }
  if (zone === "footer") {
    return section.footer ?? [];
  }
  return section.blocks;
}

export function getActiveSectionBlocks(state: EditorState): EditorBlockNode[] {
  return getEditableBlocksForZone(state, "main");
}

export function getBlockParagraphs(block: EditorBlockNode): EditorParagraphNode[] {
  if (block.type === "paragraph") {
    return [block];
  }

  return block.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks));
}

export function getDocumentParagraphsCanonical(document: EditorDocument): EditorParagraphNode[] {
  let paragraphs = documentParagraphsCache.get(document);
  if (paragraphs) {
    return paragraphs;
  }

  const sections = getDocumentSectionsCanonical(document);
  paragraphs = sections.flatMap((section) => [
    ...(section.header?.flatMap(getBlockParagraphs) ?? []),
    ...(section.firstPageHeader?.flatMap(getBlockParagraphs) ?? []),
    ...(section.evenPageHeader?.flatMap(getBlockParagraphs) ?? []),
    ...section.blocks.flatMap(getBlockParagraphs),
    ...(section.footer?.flatMap(getBlockParagraphs) ?? []),
    ...(section.firstPageFooter?.flatMap(getBlockParagraphs) ?? []),
    ...(section.evenPageFooter?.flatMap(getBlockParagraphs) ?? []),
  ]);

  documentParagraphsCache.set(document, paragraphs);
  return paragraphs;
}

export function getDocumentParagraphs(document: EditorDocument): EditorParagraphNode[] {
  return getDocumentParagraphsCanonical(document);
}

export function getParagraphs(state: EditorState): EditorParagraphNode[] {
  return getEditableBlocksForZone(state, getActiveZone(state)).flatMap(getBlockParagraphs);
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

export interface DocumentParagraphIndexEntry {
  paragraph: EditorParagraphNode;
  location: EditorParagraphLocation;
  tableLocation: {
    blockIndex: number;
    rowIndex: number;
    cellIndex: number;
    paragraphIndex: number;
  } | null;
}

const documentIndexCache = new WeakMap<EditorDocument, Map<string, DocumentParagraphIndexEntry>>();
const documentParagraphsCache = new WeakMap<EditorDocument, EditorParagraphNode[]>();

export function getDocumentParagraphIndex(document: EditorDocument): Map<string, DocumentParagraphIndexEntry> {
  let index = documentIndexCache.get(document);
  if (index) {
    return index;
  }
  
  index = new Map();
  const sections = getDocumentSections(document);
  
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    
    // Header
    if (section.header) {
      let paraIndex = 0;
      for (let blockIndex = 0; blockIndex < section.header.length; blockIndex += 1) {
        const block = section.header[blockIndex];
        if (block.type === "paragraph") {
          index.set(block.id, {
            paragraph: block,
            location: { sectionIndex, zone: "header", paragraphIndexInSection: paraIndex },
            tableLocation: null,
          });
          paraIndex += 1;
        } else if (block.type === "table") {
          for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
            const row = block.rows[rowIndex];
            for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
              const cell = row.cells[cellIndex];
              for (let cpIndex = 0; cpIndex < cell.blocks.length; cpIndex += 1) {
                const cp = cell.blocks[cpIndex];
                index.set(cp.id, {
                  paragraph: cp,
                  location: { sectionIndex, zone: "header", paragraphIndexInSection: paraIndex },
                  tableLocation: { blockIndex, rowIndex, cellIndex, paragraphIndex: cpIndex },
                });
                paraIndex += 1;
              }
            }
          }
        }
      }
    }
    
    // Main blocks
    let paraIndex = 0;
    for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
      const block = section.blocks[blockIndex];
      if (block.type === "paragraph") {
        index.set(block.id, {
          paragraph: block,
          location: { sectionIndex, zone: "main", paragraphIndexInSection: paraIndex },
          tableLocation: null,
        });
        paraIndex += 1;
      } else if (block.type === "table") {
        for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
          const row = block.rows[rowIndex];
          for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
            const cell = row.cells[cellIndex];
            for (let cpIndex = 0; cpIndex < cell.blocks.length; cpIndex += 1) {
              const cp = cell.blocks[cpIndex];
              index.set(cp.id, {
                paragraph: cp,
                location: { sectionIndex, zone: "main", paragraphIndexInSection: paraIndex },
                tableLocation: { blockIndex, rowIndex, cellIndex, paragraphIndex: cpIndex },
              });
              paraIndex += 1;
            }
          }
        }
      }
    }
    
    // Footer
    if (section.footer) {
      let paraIndex = 0;
      for (let blockIndex = 0; blockIndex < section.footer.length; blockIndex += 1) {
        const block = section.footer[blockIndex];
        if (block.type === "paragraph") {
          index.set(block.id, {
            paragraph: block,
            location: { sectionIndex, zone: "footer", paragraphIndexInSection: paraIndex },
            tableLocation: null,
          });
          paraIndex += 1;
        } else if (block.type === "table") {
          for (let rowIndex = 0; rowIndex < block.rows.length; rowIndex += 1) {
            const row = block.rows[rowIndex];
            for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
              const cell = row.cells[cellIndex];
              for (let cpIndex = 0; cpIndex < cell.blocks.length; cpIndex += 1) {
                const cp = cell.blocks[cpIndex];
                index.set(cp.id, {
                  paragraph: cp,
                  location: { sectionIndex, zone: "footer", paragraphIndexInSection: paraIndex },
                  tableLocation: { blockIndex, rowIndex, cellIndex, paragraphIndex: cpIndex },
                });
                paraIndex += 1;
              }
            }
          }
        }
      }
    }
  }
  
  documentIndexCache.set(document, index);
  return index;
}

export function getParagraphById(document: EditorDocument, paragraphId: string): EditorParagraphNode | undefined {
  return getDocumentParagraphIndex(document).get(paragraphId)?.paragraph;
}

export function findParagraphLocation(
  document: EditorDocument,
  paragraphId: string,
): EditorParagraphLocation | null {
  const entry = getDocumentParagraphIndex(document).get(paragraphId);
  return entry ? entry.location : null;
}

export function findParagraphTableLocation(
  document: EditorDocument,
  paragraphId: string,
  activeSectionIndex: number = 0,
): { blockIndex: number; rowIndex: number; cellIndex: number; paragraphIndex: number; zone: EditorEditingZone } | null {
  const entry = getDocumentParagraphIndex(document).get(paragraphId);
  if (!entry || !entry.tableLocation) return null;
  
  if (document.sections && document.sections.length > 0) {
    if (entry.location.sectionIndex !== activeSectionIndex) return null;
  }
  
  return { ...entry.tableLocation, zone: entry.location.zone };
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
