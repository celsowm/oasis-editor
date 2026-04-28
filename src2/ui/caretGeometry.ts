export interface CaretSlotRect {
  left: number;
  top: number;
  height: number;
}

interface CaretSlotCandidate extends CaretSlotRect {
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

function normalizeHeight(height: number): number {
  return height > 0 ? height : 28;
}

function isWrappedBoundary(previousRect: CharRect, nextRect: CharRect): boolean {
  return nextRect.top > previousRect.top + 1 || nextRect.left < previousRect.left - 1;
}

export function getCaretSlotRects(charRects: CharRect[]): CaretSlotRect[] {
  if (charRects.length === 0) {
    return [{ left: 0, top: 0, height: 28 }];
  }

  const slots: CaretSlotRect[] = [];
  for (let offset = 0; offset <= charRects.length; offset += 1) {
    if (offset === 0) {
      slots.push({
        left: charRects[0].left,
        top: charRects[0].top,
        height: normalizeHeight(charRects[0].height),
      });
      continue;
    }

    if (offset === charRects.length) {
      const lastRect = charRects[charRects.length - 1];
      slots.push({
        left: lastRect.right,
        top: lastRect.top,
        height: normalizeHeight(lastRect.height),
      });
      continue;
    }

    const rect = charRects[offset];
    slots.push({
      left: rect.left,
      top: rect.top,
      height: normalizeHeight(rect.height),
    });
  }

  return slots;
}

function getCaretSlotCandidates(charRects: CharRect[]): CaretSlotCandidate[] {
  if (charRects.length === 0) {
    return [{ offset: 0, left: 0, top: 0, height: 28 }];
  }

  const candidates: CaretSlotCandidate[] = [];
  candidates.push({
    offset: 0,
    left: charRects[0].left,
    top: charRects[0].top,
    height: normalizeHeight(charRects[0].height),
  });

  for (let offset = 1; offset < charRects.length; offset += 1) {
    const previousRect = charRects[offset - 1];
    const currentRect = charRects[offset];

    if (isWrappedBoundary(previousRect, currentRect)) {
      candidates.push({
        offset,
        left: previousRect.right,
        top: previousRect.top,
        height: normalizeHeight(previousRect.height),
      });
    }

    candidates.push({
      offset,
      left: currentRect.left,
      top: currentRect.top,
      height: normalizeHeight(currentRect.height),
    });
  }

  const lastRect = charRects[charRects.length - 1];
  candidates.push({
    offset: charRects.length,
    left: lastRect.right,
    top: lastRect.top,
    height: normalizeHeight(lastRect.height),
  });

  return candidates;
}

export function resolveClosestOffsetForBoundaryLine(
  charRects: CharRect[],
  clientX: number,
  boundary: LineBoundary,
): number {
  if (charRects.length === 0) {
    return 0;
  }

  const candidates = getCaretSlotCandidates(charRects);
  const boundaryTop =
    boundary === "first"
      ? Math.min(...candidates.map((candidate) => candidate.top))
      : Math.max(...candidates.map((candidate) => candidate.top));
  const boundaryCandidates = candidates.filter(
    (candidate) => Math.abs(candidate.top - boundaryTop) <= 1,
  );

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

  const candidates = getCaretSlotCandidates(charRects);
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
