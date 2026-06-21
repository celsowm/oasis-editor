import type { EditorEditingZone, EditorTextBoxData } from "@/core/model.js";
import { layoutStackedGlyphs } from "./verticalText.js";
import type {
  CanvasSnapshotInlineImage,
  CanvasSnapshotInlineTextBox,
  ResolveTextBoxRenderHeight,
} from "./canvasSnapshotTypes.js";

// Readers that recover inline image / text-box geometry from the painted canvas
// lines. Extracted from CanvasLayoutSnapshot.ts (S2).

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
        line.slots.find((candidate) => candidate.offset === imageStartOffset) ??
        line.slots.find((candidate) => candidate.offset >= imageStartOffset);
      if (!slot) {
        continue;
      }
      inlineImages.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset: imageStartOffset,
        endOffset: imageEndOffset,
        left: options.lineLeftOffset + slot.left,
        top:
          options.lineTopOffset +
          line.top +
          line.height -
          fragment.image.height,
        width: fragment.image.width,
        height: fragment.image.height,
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
        line.slots.find((candidate) => candidate.offset === startOffset) ??
        line.slots.find((candidate) => candidate.offset >= startOffset);
      if (!slot) {
        continue;
      }
      // Match the painter: an auto-fit box renders at its content height, not
      // its stored height, so the selection overlay must use the same value.
      const height = options.resolveHeight(
        fragment.textBox as unknown as EditorTextBoxData,
      );
      inlineTextBoxes.push({
        paragraphId: options.paragraphId,
        paragraphIndex: options.paragraphIndex,
        zone: options.zone,
        footnoteId: options.footnoteId,
        pageIndex: options.pageIndex,
        startOffset,
        endOffset,
        left: options.lineLeftOffset + slot.left,
        top: options.lineTopOffset + line.top + line.height - height,
        width: fragment.textBox.width,
        height,
        rotation: fragment.textBox.rotation,
      });
    }
  }
  return inlineTextBoxes;
}
