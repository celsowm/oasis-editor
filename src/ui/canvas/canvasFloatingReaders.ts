import type { EditorEditingZone, EditorTextBoxData } from "@/core/model.js";
import { EMU_PER_PX } from "@/core/units.js";
import type {
  CanvasSnapshotFloatingImage,
  CanvasSnapshotFloatingTextBox,
  ResolveTextBoxRenderHeight,
} from "./canvasSnapshotTypes.js";

// Readers that recover floating image / text-box geometry from the painted
// canvas lines, mirroring the painter's floating-object positioning. Extracted
// from CanvasLayoutSnapshot.ts (S2).

interface FloatingPositionInfo {
  behindDoc?: boolean;
  positionH?: { relativeFrom?: string; offset?: number; align?: string };
  positionV?: { relativeFrom?: string; offset?: number; align?: string };
}

interface FloatingTopLeftOptions {
  pageLeft: number;
  pageTop: number;
  contentLeft: number;
  contentTop: number;
  paragraphTop: number;
  lineTopOffset: number;
  lineLeftOffset: number;
  lineTop: number;
  slotLeft: number;
}

/**
 * Resolves the painted top-left of a floating object from its `positionH/V`,
 * mirroring the offsets the painter applies via `resolveFloatingObjectRect`.
 */
function resolveFloatingTopLeft(
  floating: FloatingPositionInfo,
  opts: FloatingTopLeftOptions,
): { left: number; top: number } {
  const emuToPx = (value: number | undefined) =>
    value === undefined ? 0 : value / EMU_PER_PX;

  const h = floating.positionH;
  const v = floating.positionV;

  const hBase =
    h?.relativeFrom === "page"
      ? opts.pageLeft
      : h?.relativeFrom === "character"
        ? opts.lineLeftOffset + opts.slotLeft
        : opts.contentLeft;

  const vBase =
    v?.relativeFrom === "page"
      ? opts.pageTop
      : v?.relativeFrom === "line"
        ? opts.lineTopOffset + opts.lineTop
        : v?.relativeFrom === "margin"
          ? opts.contentTop
          : opts.paragraphTop;

  return {
    left: hBase + emuToPx(h?.offset),
    top: vBase + emuToPx(v?.offset),
  };
}

export function collectFloatingImagesFromLines(options: {
  lines: Array<{
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
    fragments: Array<{
      startOffset: number;
      endOffset: number;
      image?: {
        width: number;
        height: number;
        rotation?: number;
        floating?: FloatingPositionInfo;
      };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  pageLeft: number;
  pageTop: number;
  contentLeft: number;
  contentTop: number;
  paragraphTop: number;
  lineTopOffset: number;
  lineLeftOffset: number;
}): CanvasSnapshotFloatingImage[] {
  const result: CanvasSnapshotFloatingImage[] = [];

  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      const image = fragment.image;
      if (!image?.floating) {
        continue;
      }

      const slot =
        line.slots.find(
          (candidate) => candidate.offset === fragment.startOffset,
        ) ??
        line.slots.find(
          (candidate) => candidate.offset >= fragment.startOffset,
        );
      if (!slot) {
        continue;
      }

      const { left, top } = resolveFloatingTopLeft(image.floating, {
        pageLeft: options.pageLeft,
        pageTop: options.pageTop,
        contentLeft: options.contentLeft,
        contentTop: options.contentTop,
        paragraphTop: options.paragraphTop,
        lineTopOffset: options.lineTopOffset,
        lineLeftOffset: options.lineLeftOffset,
        lineTop: line.top,
        slotLeft: slot.left,
      });

      result.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: fragment.startOffset,
        endOffset:
          fragment.endOffset > fragment.startOffset
            ? fragment.endOffset
            : fragment.startOffset + 1,
        left,
        top,
        width: image.width,
        height: image.height,
        rotation: image.rotation,
        behindDoc: image.floating.behindDoc,
      });
    }
  }

  return result;
}

export function collectFloatingTextBoxesFromLines(options: {
  lines: Array<{
    top: number;
    height: number;
    slots: Array<{ offset: number; left: number; top: number; height: number }>;
    fragments: Array<{
      startOffset: number;
      endOffset: number;
      textBox?: {
        width: number;
        height: number;
        rotation?: number;
        floating?: FloatingPositionInfo;
      };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  pageLeft: number;
  pageTop: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  lineTopOffset: number;
  lineLeftOffset: number;
  resolveHeight: ResolveTextBoxRenderHeight;
}): CanvasSnapshotFloatingTextBox[] {
  const result: CanvasSnapshotFloatingTextBox[] = [];

  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      const textBox = fragment.textBox;

      if (!textBox?.floating) {
        continue;
      }

      const slot =
        line.slots.find(
          (candidate) => candidate.offset === fragment.startOffset,
        ) ??
        line.slots.find(
          (candidate) => candidate.offset >= fragment.startOffset,
        );

      if (!slot) {
        continue;
      }

      const { left, top } = resolveFloatingTopLeft(textBox.floating, {
        pageLeft: options.pageLeft,
        pageTop: options.pageTop,
        contentLeft: options.contentLeft,
        contentTop: options.contentTop,
        paragraphTop: options.paragraphTop,
        lineTopOffset: options.lineTopOffset,
        lineLeftOffset: options.lineLeftOffset,
        lineTop: line.top,
        slotLeft: slot.left,
      });

      result.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: fragment.startOffset,
        endOffset:
          fragment.endOffset > fragment.startOffset
            ? fragment.endOffset
            : fragment.startOffset + 1,
        left,
        top,
        width: textBox.width,
        // Match the painter's auto-fit height so the overlay tracks the box.
        height: options.resolveHeight(textBox as unknown as EditorTextBoxData),
        rotation: textBox.rotation,
        behindDoc: textBox.floating.behindDoc,
      });
    }
  }

  return result;
}
