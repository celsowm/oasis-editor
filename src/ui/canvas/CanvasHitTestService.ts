import {
  paragraphOffsetToPosition,
  type EditorEditingZone,
  type EditorPosition,
  type EditorState,
} from "../../core/model.js";
import type {
  CanvasLayoutSnapshot,
  CanvasSnapshotInlineImage,
  CanvasSnapshotLine,
  CanvasSnapshotPage,
  CanvasSnapshotParagraph,
} from "./CanvasLayoutSnapshot.js";

export interface SurfaceHitImage {
  paragraphId: string;
  paragraphOffset: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SurfaceHitTextBox {
  paragraphId: string;
  paragraphOffset: number;
  startOffset: number;
  endOffset: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SurfaceHit {
  zone: EditorEditingZone;
  footnoteId?: string;
  paragraphId: string;
  paragraphOffset: number;
  position: EditorPosition;
  source: "canvas-layout";
  missReason?: string;
  resolvedFromParagraph: boolean;
  tableCellAnchorPosition?: EditorPosition;
  caretViewport?: { left: number; top: number; height: number };
  image?: SurfaceHitImage;
  textBox?: SurfaceHitTextBox;
}

export interface ResolveCanvasHitOptions {
  snapshot: CanvasLayoutSnapshot;
  state: EditorState;
  clientX: number;
  clientY: number;
}

function scoreRectDistance(
  left: number,
  top: number,
  width: number,
  height: number,
  clientX: number,
  clientY: number,
): number {
  const right = left + width;
  const bottom = top + height;
  const verticalDelta =
    clientY < top ? top - clientY : clientY > bottom ? clientY - bottom : 0;
  const horizontalDelta =
    clientX < left ? left - clientX : clientX > right ? clientX - right : 0;
  return verticalDelta * 1000 + horizontalDelta;
}

function resolveZoneFromPage(
  page: CanvasSnapshotPage,
  clientY: number,
): EditorEditingZone {
  const localY = clientY - page.top;
  if (localY < page.bodyTop) return "header";
  if (
    page.footnoteSeparatorTop !== undefined &&
    localY >= page.footnoteSeparatorTop &&
    localY < (page.footerTop ?? page.height)
  ) {
    return "footnote";
  }
  if (localY >= page.bodyBottom) return "footer";
  return "main";
}

function resolveNearestPage(
  pages: CanvasSnapshotPage[],
  clientX: number,
  clientY: number,
): CanvasSnapshotPage | null {
  if (pages.length === 0) return null;
  let bestPage = pages[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const page of pages) {
    const score = scoreRectDistance(
      page.left,
      page.top,
      page.width,
      page.height,
      clientX,
      clientY,
    );
    if (score < bestScore) {
      bestScore = score;
      bestPage = page;
    }
  }
  return bestPage;
}

function resolveClosestOffsetInLine(
  line: CanvasSnapshotLine,
  clientX: number,
  clientY: number,
): {
  offset: number;
  score: number;
  slotLeft?: number;
  slotTop?: number;
  slotHeight?: number;
} {
  if (line.slots.length === 0) {
    return { offset: line.startOffset, score: Number.POSITIVE_INFINITY };
  }
  let bestOffset = line.slots[0]!.offset;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestSlotLeft = line.slots[0]!.left;
  let bestSlotTop = line.slots[0]!.top;
  let bestSlotHeight = line.slots[0]!.height;
  for (const slot of line.slots) {
    const verticalDelta =
      clientY < slot.top
        ? slot.top - clientY
        : clientY > slot.top + slot.height
          ? clientY - (slot.top + slot.height)
          : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;
    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
      bestSlotLeft = slot.left;
      bestSlotTop = slot.top;
      bestSlotHeight = slot.height;
    }
  }
  return {
    offset: bestOffset,
    score: bestScore,
    slotLeft: bestSlotLeft,
    slotTop: bestSlotTop,
    slotHeight: bestSlotHeight,
  };
}

function resolveClosestOffsetInParagraph(
  paragraph: CanvasSnapshotParagraph,
  clientX: number,
  clientY: number,
): number {
  let bestOffset = paragraph.startOffset;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const line of paragraph.lines) {
    const { offset, score } = resolveClosestOffsetInLine(
      line,
      clientX,
      clientY,
    );
    if (score < bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return Math.max(
    paragraph.startOffset,
    Math.min(bestOffset, paragraph.endOffset),
  );
}

function resolveParagraphHit(
  paragraphs: CanvasSnapshotParagraph[],
  clientX: number,
  clientY: number,
): {
  paragraph: CanvasSnapshotParagraph;
  offset: number;
  caretViewport?: { left: number; top: number; height: number };
} | null {
  if (paragraphs.length === 0) return null;

  let bestLineHit: {
    paragraph: CanvasSnapshotParagraph;
    offset: number;
    score: number;
    caretViewport?: { left: number; top: number; height: number };
  } | null = null;

  for (const paragraph of paragraphs) {
    for (const line of paragraph.lines) {
      const lineTop = line.top - 2;
      const lineBottom = line.top + line.height + 2;
      if (clientY < lineTop || clientY > lineBottom) continue;
      const { offset, score, slotLeft, slotTop, slotHeight } =
        resolveClosestOffsetInLine(line, clientX, clientY);
      if (!bestLineHit || score < bestLineHit.score) {
        bestLineHit = {
          paragraph,
          offset,
          score,
          caretViewport:
            slotLeft !== undefined &&
            slotTop !== undefined &&
            slotHeight !== undefined
              ? { left: slotLeft, top: slotTop, height: slotHeight }
              : undefined,
        };
      }
    }
  }

  if (bestLineHit) {
    return {
      paragraph: bestLineHit.paragraph,
      offset: bestLineHit.offset,
      caretViewport: bestLineHit.caretViewport,
    };
  }

  let nearestParagraph: CanvasSnapshotParagraph | null = null;
  let nearestScore = Number.POSITIVE_INFINITY;
  for (const paragraph of paragraphs) {
    const score = scoreRectDistance(
      paragraph.left,
      paragraph.top,
      Math.max(1, paragraph.width),
      Math.max(1, paragraph.height),
      clientX,
      clientY,
    );
    if (score < nearestScore) {
      nearestScore = score;
      nearestParagraph = paragraph;
    }
  }
  if (!nearestParagraph) {
    return null;
  }
  return {
    paragraph: nearestParagraph,
    offset: resolveClosestOffsetInParagraph(nearestParagraph, clientX, clientY),
    caretViewport: {
      left: nearestParagraph.left,
      top: nearestParagraph.top,
      height: Math.max(16, Math.min(32, nearestParagraph.height || 24)),
    },
  };
}

function resolveUnsupportedReasonAtPoint(
  snapshot: CanvasLayoutSnapshot,
  pageIndex: number,
  zone: EditorEditingZone,
  clientX: number,
  clientY: number,
): string | null {
  const region = snapshot.unsupportedRegions.find(
    (candidate) =>
      candidate.pageIndex === pageIndex &&
      candidate.zone === zone &&
      clientX >= candidate.left &&
      clientX <= candidate.left + candidate.width &&
      clientY >= candidate.top &&
      clientY <= candidate.top + candidate.height,
  );
  return region?.reason ?? null;
}

function isPointInsideRect(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.left + rect.width &&
    clientY >= rect.top &&
    clientY <= rect.top + rect.height
  );
}

function resolveTextBoxAtPoint(
  snapshot: CanvasLayoutSnapshot,
  pageIndex: number,
  zone: EditorEditingZone,
  clientX: number,
  clientY: number,
): CanvasLayoutSnapshot["floatingTextBoxes"][number] | null {
  for (let i = snapshot.floatingTextBoxes.length - 1; i >= 0; i -= 1) {
    const box = snapshot.floatingTextBoxes[i]!;

    if (box.pageIndex !== pageIndex || box.zone !== zone) {
      continue;
    }

    if (
      clientX >= box.left &&
      clientX <= box.left + box.width &&
      clientY >= box.top &&
      clientY <= box.top + box.height
    ) {
      return box;
    }
  }

  return null;
}

function resolveImageAtPoint(
  snapshot: CanvasLayoutSnapshot,
  pageIndex: number,
  zone: EditorEditingZone,
  clientX: number,
  clientY: number,
): CanvasSnapshotInlineImage | null {
  for (const image of snapshot.inlineImages) {
    if (image.pageIndex !== pageIndex || image.zone !== zone) {
      continue;
    }
    if (isPointInsideRect(clientX, clientY, image)) {
      return image;
    }
  }
  return null;
}

export function resolveCanvasSurfaceHitAtPoint(
  options: ResolveCanvasHitOptions,
): SurfaceHit | null {
  const { snapshot, state, clientX, clientY } = options;
  const page = resolveNearestPage(snapshot.pages, clientX, clientY);
  if (!page) {
    return null;
  }

  const zone = resolveZoneFromPage(page, clientY);
  const textBoxHit = resolveTextBoxAtPoint(
    snapshot,
    page.index,
    zone,
    clientX,
    clientY,
  );
  if (textBoxHit) {
    const paragraphSegments =
      snapshot.paragraphsById.get(textBoxHit.paragraphId) ?? [];

    const paragraphSegment =
      paragraphSegments.find(
        (segment) =>
          segment.pageIndex === page.index &&
          segment.zone === zone &&
          textBoxHit.startOffset >= segment.startOffset &&
          textBoxHit.startOffset <= segment.endOffset,
      ) ?? paragraphSegments[0];

    if (paragraphSegment) {
      const paragraphOffset = Math.max(
        paragraphSegment.startOffset,
        Math.min(textBoxHit.startOffset, paragraphSegment.endOffset),
      );

      const position = paragraphOffsetToPosition(
        paragraphSegment.paragraph,
        paragraphOffset,
      );

      return {
        zone,
        footnoteId: paragraphSegment.footnoteId,
        paragraphId: textBoxHit.paragraphId,
        paragraphOffset,
        position,
        source: "canvas-layout",
        resolvedFromParagraph: true,
        tableCellAnchorPosition: paragraphSegment.tableCell?.anchorPosition,
        caretViewport: {
          left: textBoxHit.left,
          top: textBoxHit.top,
          height: textBoxHit.height,
        },
        textBox: {
          paragraphId: textBoxHit.paragraphId,
          paragraphOffset,
          startOffset: textBoxHit.startOffset,
          endOffset: textBoxHit.endOffset,
          left: textBoxHit.left,
          top: textBoxHit.top,
          width: textBoxHit.width,
          height: textBoxHit.height,
        },
      };
    }
  }

  const imageHit = resolveImageAtPoint(
    snapshot,
    page.index,
    zone,
    clientX,
    clientY,
  );
  if (imageHit) {
    const paragraphSegments =
      snapshot.paragraphsById.get(imageHit.paragraphId) ?? [];
    const paragraphSegment =
      paragraphSegments.find(
        (segment) =>
          segment.pageIndex === page.index &&
          segment.zone === zone &&
          imageHit.startOffset >= segment.startOffset &&
          imageHit.startOffset <= segment.endOffset,
      ) ?? paragraphSegments[0];
    if (paragraphSegment) {
      const paragraphOffset = Math.max(
        paragraphSegment.startOffset,
        Math.min(imageHit.startOffset, paragraphSegment.endOffset),
      );
      const position = paragraphOffsetToPosition(
        paragraphSegment.paragraph,
        paragraphOffset,
      );
      return {
        zone,
        footnoteId: paragraphSegment.footnoteId,
        paragraphId: imageHit.paragraphId,
        paragraphOffset,
        position,
        source: "canvas-layout",
        resolvedFromParagraph: true,
        tableCellAnchorPosition: paragraphSegment.tableCell?.anchorPosition,
        caretViewport: {
          left: imageHit.left,
          top: imageHit.top,
          height: imageHit.height,
        },
        image: {
          paragraphId: imageHit.paragraphId,
          paragraphOffset,
          startOffset: imageHit.startOffset,
          endOffset: imageHit.endOffset,
          left: imageHit.left,
          top: imageHit.top,
          width: imageHit.width,
          height: imageHit.height,
        },
      };
    }
  }

  const zoneParagraphs = snapshot.paragraphs.filter(
    (paragraph) =>
      paragraph.pageIndex === page.index && paragraph.zone === zone,
  );
  const paragraphHit = resolveParagraphHit(zoneParagraphs, clientX, clientY);
  if (!paragraphHit) {
    const focusParagraph = state.selection.focus.paragraphId;
    const focusOffset = state.selection.focus.offset;
    const unsupportedReason = resolveUnsupportedReasonAtPoint(
      snapshot,
      page.index,
      zone,
      clientX,
      clientY,
    );
    return {
      zone,
      paragraphId: focusParagraph,
      paragraphOffset: focusOffset,
      position: { ...state.selection.focus },
      source: "canvas-layout",
      resolvedFromParagraph: false,
      missReason: unsupportedReason ?? "zone-without-paragraph",
    };
  }

  const paragraph = paragraphHit.paragraph;
  const offset = Math.max(
    0,
    Math.min(paragraphHit.offset, paragraph.textLength),
  );
  const position = paragraphOffsetToPosition(paragraph.paragraph, offset);
  return {
    zone,
    footnoteId: paragraph.footnoteId,
    paragraphId: paragraph.paragraphId,
    paragraphOffset: offset,
    position,
    source: "canvas-layout",
    resolvedFromParagraph: true,
    tableCellAnchorPosition: paragraph.tableCell?.anchorPosition,
    caretViewport: paragraphHit.caretViewport,
  };
}
