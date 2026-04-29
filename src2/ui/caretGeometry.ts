export interface CaretSlotRect {
  left: number;
  top: number;
  height: number;
}

export interface CaretSlotCandidate extends CaretSlotRect {
  offset: number;
}

type LineBoundary = "first" | "last";

export interface CharRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}

export interface MeasuredLine {
  index: number;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  charRects: CharRect[];
  slots: CaretSlotCandidate[];
}

function normalizeHeight(height: number): number {
  return height > 0 ? height : 28;
}

function isWrappedBoundary(previousRect: CharRect, nextRect: CharRect): boolean {
  return nextRect.top > previousRect.top + 1 || nextRect.left < previousRect.left - 1;
}

function getCaretSlotCandidates(charRects: CharRect[], startOffset = 0): CaretSlotCandidate[] {
  if (charRects.length === 0) {
    return [{ offset: startOffset, left: 0, top: 0, height: 28 }];
  }

  const candidates: CaretSlotCandidate[] = [];
  candidates.push({
    offset: startOffset,
    left: charRects[0].left,
    top: charRects[0].top,
    height: normalizeHeight(charRects[0].height),
  });

  for (let offset = 1; offset < charRects.length; offset += 1) {
    const previousRect = charRects[offset - 1];
    const currentRect = charRects[offset];

    if (isWrappedBoundary(previousRect, currentRect)) {
      candidates.push({
        offset: startOffset + offset,
        left: previousRect.right,
        top: previousRect.top,
        height: normalizeHeight(previousRect.height),
      });
    }

    candidates.push({
      offset: startOffset + offset,
      left: currentRect.left,
      top: currentRect.top,
      height: normalizeHeight(currentRect.height),
    });
  }

  const lastRect = charRects[charRects.length - 1];
  candidates.push({
    offset: startOffset + charRects.length,
    left: lastRect.right,
    top: lastRect.top,
    height: normalizeHeight(lastRect.height),
  });

  return candidates;
}

export function measureLinesFromRects(charRects: CharRect[]): MeasuredLine[] {
  if (charRects.length === 0) {
    return [
      {
        index: 0,
        startOffset: 0,
        endOffset: 0,
        top: 0,
        height: 28,
        charRects: [],
        slots: [{ offset: 0, left: 0, top: 0, height: 28 }],
      },
    ];
  }

  const lines: MeasuredLine[] = [];
  let lineStart = 0;

  for (let index = 1; index <= charRects.length; index += 1) {
    const atEnd = index === charRects.length;
    const wrapped = !atEnd && isWrappedBoundary(charRects[index - 1]!, charRects[index]!);

    if (!atEnd && !wrapped) {
      continue;
    }

    const lineRects = charRects.slice(lineStart, index);
    const firstRect = lineRects[0]!;
    const height = lineRects.reduce((maxHeight, rect) => Math.max(maxHeight, normalizeHeight(rect.height)), 0);
    lines.push({
      index: lines.length,
      startOffset: lineStart,
      endOffset: index,
      top: firstRect.top,
      height,
      charRects: lineRects,
      slots: getCaretSlotCandidates(lineRects, lineStart),
    });
    lineStart = index;
  }

  return lines;
}

export function getCaretSlotRects(charRects: CharRect[]): CaretSlotRect[] {
  return measureLinesFromRects(charRects).flatMap((line, lineIndex, lines) => {
    if (lineIndex === lines.length - 1) {
      return line.slots.map(({ left, top, height }) => ({ left, top, height }));
    }
    return line.slots.slice(0, -1).map(({ left, top, height }) => ({ left, top, height }));
  });
}

export function resolveClosestOffsetForBoundaryLine(
  charRects: CharRect[],
  clientX: number,
  boundary: LineBoundary,
): number {
  if (charRects.length === 0) {
    return 0;
  }

  const lines = measureLinesFromRects(charRects);
  const boundaryLine = boundary === "first" ? lines[0] : lines[lines.length - 1];
  const boundaryCandidates = boundaryLine?.slots ?? [];

  let bestOffset = boundaryCandidates[0]?.offset ?? 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of boundaryCandidates) {
    const distance = Math.abs(clientX - candidate.left);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = candidate.offset;
    }
  }

  return bestOffset;
}

export function resolveClosestOffsetFromRects(
  charRects: CharRect[],
  clientX: number,
  clientY: number,
): number {
  if (charRects.length === 0) {
    return 0;
  }

  const candidates = measureLinesFromRects(charRects).flatMap((line) => line.slots);
  let bestOffset = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < candidates.length; index += 1) {
    const slot = candidates[index];
    const verticalDelta =
      clientY < slot.top ? slot.top - clientY : clientY > slot.top + slot.height ? clientY - (slot.top + slot.height) : 0;
    const horizontalDelta = Math.abs(clientX - slot.left);
    const score = verticalDelta * 1000 + horizontalDelta;

    if (score < bestScore) {
      bestScore = score;
      bestOffset = slot.offset;
    }
  }

  return bestOffset;
}
