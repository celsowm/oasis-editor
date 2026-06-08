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
