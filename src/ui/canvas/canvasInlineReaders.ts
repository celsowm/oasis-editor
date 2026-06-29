import type { EditorEditingZone, EditorTextBoxData } from "@/core/model.js";
import type {
  CanvasSnapshotInlineImage,
  CanvasSnapshotInlineTextBox,
  ResolveTextBoxRenderHeight,
} from "./canvasSnapshotTypes.js";

// Readers that recover inline image / text-box geometry from the painted canvas
// lines. Extracted from CanvasLayoutSnapshot.ts (S2).

/**
 * Single source of truth for the on-canvas rectangle of an inline object
 * (image or text box) that occupies a line slot. The painter (rendering) and
 * the snapshot readers (hit-testing / selection overlays) MUST agree on this
 * geometry; computing it here prevents the two paths from drifting (audit #6).
 *
 * The object is bottom-aligned within the line: its top sits at the line
 * baseline minus the object height, mirroring how Word flows inline drawings.
 */
export function resolveInlineObjectRect(params: {
  originLeft: number;
  originTop: number;
  lineTop: number;
  lineHeight: number;
  slotLeft: number;
  objectWidth: number;
  objectHeight: number;
}): { left: number; top: number; width: number; height: number } {
  return {
    left: params.originLeft + params.slotLeft,
    top:
      params.originTop +
      params.lineTop +
      params.lineHeight -
      params.objectHeight,
    width: params.objectWidth,
    height: params.objectHeight,
  };
}

export function collectInlineImagesFromLines(options: {
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
        floating?: unknown;
      };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  lineTopOffset: number;
  lineLeftOffset: number;
}): CanvasSnapshotInlineImage[] {
  const inlineImages: CanvasSnapshotInlineImage[] = [];
  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      // Floating images are tracked separately; here we only collect images
      // that flow inline (occupy a slot in the line).
      if (!fragment.image || fragment.image.floating) {
        continue;
      }
      const imageStartOffset = fragment.startOffset;
      const imageEndOffset =
        fragment.endOffset > imageStartOffset
          ? fragment.endOffset
          : imageStartOffset + 1;
      const slot =
        line.slots.find((candidate): boolean => candidate.offset === imageStartOffset) ??
        line.slots.find((candidate): boolean => candidate.offset >= imageStartOffset);
      if (!slot) {
        continue;
      }
      const rect = resolveInlineObjectRect({
        originLeft: options.lineLeftOffset,
        originTop: options.lineTopOffset,
        lineTop: line.top,
        lineHeight: line.height,
        slotLeft: slot.left,
        objectWidth: fragment.image.width,
        objectHeight: fragment.image.height,
      });
      inlineImages.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: imageStartOffset,
        endOffset: imageEndOffset,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        rotation: fragment.image.rotation,
      });
    }
  }
  return inlineImages;
}

export function collectInlineTextBoxesFromLines(options: {
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
        floating?: unknown;
      };
    }>;
  }>;
  paragraphId: string;
  paragraphIndex: number;
  zone: EditorEditingZone;
  footnoteId?: string;
  pageIndex: number;
  lineTopOffset: number;
  lineLeftOffset: number;
  resolveHeight: ResolveTextBoxRenderHeight;
}): CanvasSnapshotInlineTextBox[] {
  const inlineTextBoxes: CanvasSnapshotInlineTextBox[] = [];
  for (const line of options.lines) {
    for (const fragment of line.fragments) {
      // Floating text boxes are tracked separately; here we only collect
      // text boxes that flow inline (occupy a slot like an inline image).
      if (!fragment.textBox || fragment.textBox.floating) {
        continue;
      }
      const startOffset = fragment.startOffset;
      const endOffset =
        fragment.endOffset > startOffset ? fragment.endOffset : startOffset + 1;
      const slot =
        line.slots.find((candidate): boolean => candidate.offset === startOffset) ??
        line.slots.find((candidate): boolean => candidate.offset >= startOffset);
      if (!slot) {
        continue;
      }
      // Match the painter: an auto-fit box renders at its content height, not
      // its stored height, so the selection overlay must use the same value.
      const height = options.resolveHeight(
        fragment.textBox as unknown as EditorTextBoxData,
      );
      const rect = resolveInlineObjectRect({
        originLeft: options.lineLeftOffset,
        originTop: options.lineTopOffset,
        lineTop: line.top,
        lineHeight: line.height,
        slotLeft: slot.left,
        objectWidth: fragment.textBox.width,
        objectHeight: height,
      });
      inlineTextBoxes.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset,
        endOffset,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        rotation: fragment.textBox.rotation,
      });
    }
  }
  return inlineTextBoxes;
}
