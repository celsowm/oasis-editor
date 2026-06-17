/**
 * Page geometry: orientation inference, margin normalization and derived
 * region helpers (body / header / footer zones) used by the layout engine.
 */
import type { EditorDocument } from "./types/document.js";
import type { EditorPageSettings } from "./types/document.js";

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

function inferPageOrientation(
  width: number,
  height: number,
): "portrait" | "landscape" {
  return width > height ? "landscape" : "portrait";
}

export function normalizePageSettings(
  pageSettings: EditorPageSettings,
): EditorPageSettings {
  const orientation =
    pageSettings.orientation ??
    inferPageOrientation(pageSettings.width, pageSettings.height);
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
    ...(pageSettings.columns ? { columns: pageSettings.columns } : {}),
  };
}

export function getDocumentPageSettings(
  document: EditorDocument,
): EditorPageSettings {
  const pageSettings = document.pageSettings;
  return normalizePageSettings({
    width: pageSettings?.width ?? DEFAULT_EDITOR_PAGE_SETTINGS.width,
    height: pageSettings?.height ?? DEFAULT_EDITOR_PAGE_SETTINGS.height,
    orientation:
      pageSettings?.orientation ?? DEFAULT_EDITOR_PAGE_SETTINGS.orientation,
    margins: {
      top:
        pageSettings?.margins.top ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.top,
      right:
        pageSettings?.margins.right ??
        DEFAULT_EDITOR_PAGE_SETTINGS.margins.right,
      bottom:
        pageSettings?.margins.bottom ??
        DEFAULT_EDITOR_PAGE_SETTINGS.margins.bottom,
      left:
        pageSettings?.margins.left ?? DEFAULT_EDITOR_PAGE_SETTINGS.margins.left,
      header:
        pageSettings?.margins.header ??
        DEFAULT_EDITOR_PAGE_SETTINGS.margins.header,
      footer:
        pageSettings?.margins.footer ??
        DEFAULT_EDITOR_PAGE_SETTINGS.margins.footer,
      gutter:
        pageSettings?.margins.gutter ??
        DEFAULT_EDITOR_PAGE_SETTINGS.margins.gutter,
    },
    ...(pageSettings?.columns ? { columns: pageSettings.columns } : {}),
  });
}

export function getPageContentWidth(pageSettings: EditorPageSettings): number {
  return Math.max(
    24,
    Math.floor(
      pageSettings.width -
        pageSettings.margins.left -
        pageSettings.margins.right -
        pageSettings.margins.gutter,
    ),
  );
}

export interface PageColumnRect {
  /** Page-relative left edge of the column's content. */
  left: number;
  /** Column content width. */
  width: number;
}

/**
 * Page-relative left/width for each text column. A single-column page (no
 * `columns` or `count <= 1`) yields one rect spanning the full content width,
 * so existing callers are unaffected. Unequal `<w:col>` widths are honored when
 * present; otherwise columns are equal with a uniform `space` gap.
 */
export function getPageColumnRects(
  pageSettings: EditorPageSettings,
): PageColumnRect[] {
  const contentLeft = pageSettings.margins.left + pageSettings.margins.gutter;
  const contentWidth = getPageContentWidth(pageSettings);
  const columns = pageSettings.columns;
  const count = columns?.count ?? 1;
  if (!columns || count <= 1) {
    return [{ left: contentLeft, width: contentWidth }];
  }

  // Explicit unequal columns: lay out using each column's own width and the
  // trailing space that follows it.
  if (columns.equalWidth === false && columns.columns?.length) {
    const rects: PageColumnRect[] = [];
    let cursor = contentLeft;
    for (let i = 0; i < count; i += 1) {
      const col = columns.columns[i];
      const width = Math.max(1, col?.width ?? 0);
      rects.push({ left: cursor, width });
      cursor += width + (col?.space ?? columns.space);
    }
    return rects;
  }

  const space = columns.space;
  const colWidth = Math.max(
    1,
    Math.floor((contentWidth - space * (count - 1)) / count),
  );
  const rects: PageColumnRect[] = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ left: contentLeft + i * (colWidth + space), width: colWidth });
  }
  return rects;
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

export function getPageFooterReferenceTop(
  pageSettings: EditorPageSettings,
): number {
  return (
    pageSettings.height -
    clampPageOffset(pageSettings.margins.footer, pageSettings.height)
  );
}

export function getPageBodyBottom(pageSettings: EditorPageSettings): number {
  const marginBottomTop =
    pageSettings.height -
    clampPageOffset(pageSettings.margins.bottom, pageSettings.height);
  return Math.min(
    pageSettings.height,
    Math.max(
      getPageBodyTop(pageSettings),
      Math.min(marginBottomTop, getPageFooterReferenceTop(pageSettings)),
    ),
  );
}

export function getPageHeaderZoneHeight(
  pageSettings: EditorPageSettings,
): number {
  return Math.max(
    0,
    getPageBodyTop(pageSettings) - getPageHeaderZoneTop(pageSettings),
  );
}

export function getPageFooterZoneTop(pageSettings: EditorPageSettings): number {
  return getPageBodyBottom(pageSettings);
}

export function getPageFooterZoneHeight(
  pageSettings: EditorPageSettings,
): number {
  return Math.max(0, pageSettings.height - getPageFooterZoneTop(pageSettings));
}

export function getPageContentHeight(pageSettings: EditorPageSettings): number {
  return Math.max(
    24,
    Math.floor(getPageBodyBottom(pageSettings) - getPageBodyTop(pageSettings)),
  );
}
