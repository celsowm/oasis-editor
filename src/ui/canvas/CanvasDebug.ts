import type { SurfaceHit } from "./CanvasHitTestService.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotLine,
  CanvasSnapshotPage,
  CanvasSnapshotParagraph,
  CanvasSnapshotSlot,
} from "./CanvasLayoutSnapshot.js";

export interface CanvasDebugFallbackEvent {
  timestamp: number;
  reason: string;
  clientX: number;
  clientY: number;
}

export interface CanvasDebugHitSnapshot {
  timestamp: number;
  zone: SurfaceHit["zone"];
  paragraphId: string;
  paragraphOffset: number;
  source: SurfaceHit["source"];
  fallbackReason?: string;
  resolvedFromParagraph: boolean;
}

export interface CanvasDebugLayoutSnapshot {
  surfaceRect: { left: number; top: number; width: number; height: number };
  pages: Array<{
    index: number;
    left: number;
    top: number;
    width: number;
    height: number;
    bodyTop: number;
    bodyBottom: number;
  }>;
  paragraphs: Array<{
    paragraphId: string;
    paragraphIndex: number;
    zone: CanvasSnapshotParagraph["zone"];
    pageIndex: number;
    startOffset: number;
    endOffset: number;
    textLength: number;
    left: number;
    top: number;
    width: number;
    height: number;
    lines: Array<{
      startOffset: number;
      endOffset: number;
      top: number;
      height: number;
      slots: Array<{ offset: number; left: number; top: number; height: number }>;
    }>;
    tableCell?: {
      tableId: string;
      rowIndex: number;
      cellIndex: number;
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
  unsupportedRegions: Array<{
    pageIndex: number;
    zone: "main" | "header" | "footer";
    left: number;
    top: number;
    width: number;
    height: number;
    reason: string;
  }>;
}

export interface OasisCanvasDebugApi {
  getLastHit: () => CanvasDebugHitSnapshot | null;
  getLayoutSnapshot: () => CanvasDebugLayoutSnapshot | null;
  getFallbackEvents: () => CanvasDebugFallbackEvent[];
  clearFallbackEvents: () => void;
}

declare global {
  interface Window {
    __oasisCanvasDebug?: OasisCanvasDebugApi;
  }
}

let installed = false;
let lastHit: CanvasDebugHitSnapshot | null = null;
let lastLayoutSnapshot: CanvasDebugLayoutSnapshot | null = null;
let fallbackEvents: CanvasDebugFallbackEvent[] = [];

function cloneSlots(slots: CanvasSnapshotSlot[]) {
  return slots.map((slot) => ({
    offset: slot.offset,
    left: slot.left,
    top: slot.top,
    height: slot.height,
  }));
}

function cloneLines(lines: CanvasSnapshotLine[]) {
  return lines.map((line) => ({
    startOffset: line.startOffset,
    endOffset: line.endOffset,
    top: line.top,
    height: line.height,
    slots: cloneSlots(line.slots),
  }));
}

function clonePages(pages: CanvasSnapshotPage[]) {
  return pages.map((page) => ({
    index: page.index,
    left: page.left,
    top: page.top,
    width: page.width,
    height: page.height,
    bodyTop: page.bodyTop,
    bodyBottom: page.bodyBottom,
  }));
}

function cloneLayoutSnapshot(snapshot: CanvasLayoutSnapshot): CanvasDebugLayoutSnapshot {
  return {
    surfaceRect: {
      left: snapshot.surfaceRect.left,
      top: snapshot.surfaceRect.top,
      width: snapshot.surfaceRect.width,
      height: snapshot.surfaceRect.height,
    },
    pages: clonePages(snapshot.pages),
    paragraphs: snapshot.paragraphs.map((paragraph) => ({
      paragraphId: paragraph.paragraphId,
      paragraphIndex: paragraph.paragraphIndex,
      zone: paragraph.zone,
      pageIndex: paragraph.pageIndex,
      startOffset: paragraph.startOffset,
      endOffset: paragraph.endOffset,
      textLength: paragraph.textLength,
      left: paragraph.left,
      top: paragraph.top,
      width: paragraph.width,
      height: paragraph.height,
      lines: cloneLines(paragraph.lines),
      tableCell: paragraph.tableCell
        ? {
            tableId: paragraph.tableCell.tableId,
            rowIndex: paragraph.tableCell.rowIndex,
            cellIndex: paragraph.tableCell.cellIndex,
            left: paragraph.tableCell.left,
            top: paragraph.tableCell.top,
            width: paragraph.tableCell.width,
            height: paragraph.tableCell.height,
          }
        : undefined,
    })),
    unsupportedRegions: snapshot.unsupportedRegions.map((region) => ({ ...region })),
  };
}

function isCanvasDebugEnabled(): boolean {
  const viteEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
  const processEnv = (globalThis as any)?.process?.env ?? {};
  return (
    viteEnv.DEV === true ||
    viteEnv.MODE === "test" ||
    processEnv.NODE_ENV === "test" ||
    viteEnv.VITE_OASIS_CANVAS_DEBUG === "1"
  );
}

function buildApi(): OasisCanvasDebugApi {
  return {
    getLastHit: () => (lastHit ? { ...lastHit } : null),
    getLayoutSnapshot: () =>
      lastLayoutSnapshot
        ? {
            ...lastLayoutSnapshot,
            surfaceRect: { ...lastLayoutSnapshot.surfaceRect },
            pages: lastLayoutSnapshot.pages.map((page) => ({ ...page })),
            paragraphs: lastLayoutSnapshot.paragraphs.map((paragraph) => ({
              ...paragraph,
              lines: paragraph.lines.map((line) => ({
                ...line,
                slots: line.slots.map((slot) => ({ ...slot })),
              })),
              tableCell: paragraph.tableCell ? { ...paragraph.tableCell } : undefined,
            })),
            unsupportedRegions: lastLayoutSnapshot.unsupportedRegions.map((region) => ({
              ...region,
            })),
          }
        : null,
    getFallbackEvents: () => fallbackEvents.map((entry) => ({ ...entry })),
    clearFallbackEvents: () => {
      fallbackEvents = [];
    },
  };
}

export function syncCanvasDebugApiVisibility(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!isCanvasDebugEnabled()) {
    if (installed) {
      delete window.__oasisCanvasDebug;
      installed = false;
    }
    return;
  }
  if (!installed) {
    window.__oasisCanvasDebug = buildApi();
    installed = true;
  }
}

export function recordCanvasDebugHit(hit: SurfaceHit | null): void {
  if (!installed || !hit) {
    return;
  }
  lastHit = {
    timestamp: Date.now(),
    zone: hit.zone,
    paragraphId: hit.paragraphId,
    paragraphOffset: hit.paragraphOffset,
    source: hit.source,
    fallbackReason: hit.fallbackReason,
    resolvedFromParagraph: hit.resolvedFromParagraph,
  };
}

export function recordCanvasDebugLayoutSnapshot(snapshot: CanvasLayoutSnapshot | null): void {
  if (!installed) {
    return;
  }
  lastLayoutSnapshot = snapshot ? cloneLayoutSnapshot(snapshot) : null;
}

export function recordCanvasDebugFallbackEvent(reason: string, details: { clientX: number; clientY: number }): void {
  if (!installed) {
    return;
  }
  fallbackEvents = [
    ...fallbackEvents,
    {
      timestamp: Date.now(),
      reason,
      clientX: details.clientX,
      clientY: details.clientY,
    },
  ];
}
