// --- Phase 1 perf refactor ----------------------------------------------
//
// The previous implementation invoked `range.getBoundingClientRect()` ONCE
// PER CHARACTER. With ~5k chars across an imported document that meant
// thousands of forced layout flushes per measurement pass — the actual
// cause of the 75s deferred sync after import.
//
// The new implementation uses two sources of geometry:
//   1) `range.getClientRects()` over the WHOLE text node (one DOM read)
//      → returns one rect per visual line within that text node.
//   2) Canvas `measureText` (no DOM hits) to derive per-character left/
//      right within each line rect.
//
// We still emit the same `CharRect[]` contract that
// `measureLinesFromRects` / `measureParagraphLayoutFromRects` consume, so
// no caller changes are required for Phase 1. Total DOM reads drop from
// O(chars) to O(text-segments * lines + atoms).
// -----------------------------------------------------------------------

let sharedMeasureCanvasContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (sharedMeasureCanvasContext !== undefined) {
    return sharedMeasureCanvasContext;
  }
  if (typeof document === "undefined") {
    sharedMeasureCanvasContext = null;
    return null;
  }
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    sharedMeasureCanvasContext = null;
    return null;
  }
  try {
    const canvas = document.createElement("canvas");
    sharedMeasureCanvasContext = canvas.getContext("2d");
  } catch {
    sharedMeasureCanvasContext = null;
  }
  return sharedMeasureCanvasContext;
}

const segmentFontCache = new WeakMap<HTMLElement, string>();

function getSegmentFont(seg: HTMLElement): string {
  const cached = segmentFontCache.get(seg);
  if (cached) {
    return cached;
  }
  const cs = window.getComputedStyle(seg);
  let font = cs.font;
  if (!font) {
    const style = cs.fontStyle || "normal";
    const weight = cs.fontWeight || "400";
    const size = cs.fontSize || "15px";
    const family = cs.fontFamily || "Calibri, sans-serif";
    font = `${style} ${weight} ${size} ${family}`;
  }
  segmentFontCache.set(seg, font);
  return font;
}

const fallbackCharWidthCache = new Map<string, number>();

function fallbackCharWidth(char: string, fontSizePx: number): number {
  const key = `${fontSizePx}|${char}`;
  const cached = fallbackCharWidthCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  let ratio: number;
  if (char === " ") ratio = 0.35;
  else if (".,;:!'`|ilI".includes(char)) ratio = 0.3;
  else if ("mwMW@#%&".includes(char)) ratio = 0.92;
  else if ("0123456789".includes(char)) ratio = 0.6;
  else if (/[A-Z]/.test(char)) ratio = 0.72;
  else if (/[a-z]/.test(char)) ratio = 0.62;
  else ratio = 0.66;
  const width = ratio * fontSizePx;
  fallbackCharWidthCache.set(key, width);
  return width;
}

function getCharWidth(
  ctx: CanvasRenderingContext2D | null,
  char: string,
  fontSizePx: number,
): number {
  if (ctx) {
    return ctx.measureText(char).width;
  }
  return fallbackCharWidth(char, fontSizePx);
}

function parseFontSizePx(font: string): number {
  // font shorthand contains "<size>px" somewhere.
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  return match ? Number(match[1]) : 15;
}

interface CharRectOut {
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}

function emitCharRectsForTextSegment(
  seg: HTMLElement,
  rects: CharRectOut[],
  ctx: CanvasRenderingContext2D | null,
): void {
  const textNode = seg.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }
  const text = textNode.nodeValue ?? "";
  if (text.length === 0) {
    return;
  }

  // ONE DOM read for the whole text node: one DOMRect per visual line.
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const lineRects = Array.from(range.getClientRects());
  if (lineRects.length === 0) {
    return;
  }

  // ONE getComputedStyle per segment (cached via WeakMap) → font for canvas.
  const font = getSegmentFont(seg);
  const fontSizePx = parseFontSizePx(font);
  if (ctx) {
    ctx.font = font;
  }

  // Walk chars in order, distributing them across line rects by cumulative
  // canvas width. No further DOM reads required for the text content.
  let charIdx = 0;
  for (let li = 0; li < lineRects.length; li += 1) {
    const lineRect = lineRects[li]!;
    const isLast = li === lineRects.length - 1;
    const lineStart = charIdx;
    let lineEnd: number;

    if (isLast) {
      lineEnd = text.length;
    } else {
      // Find where this line wraps using cumulative canvas measure.
      const lineWidth = lineRect.right - lineRect.left;
      let lo = lineStart + 1;
      let hi = text.length;
      // Largest end such that substring fits in lineWidth.
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const sub = text.substring(lineStart, mid);
        const w = ctx
          ? ctx.measureText(sub).width
          : (() => {
              let acc = 0;
              for (let k = 0; k < sub.length; k += 1) {
                acc += fallbackCharWidth(sub[k]!, fontSizePx);
              }
              return acc;
            })();
        if (w <= lineWidth + 0.5) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      lineEnd = Math.max(lineStart + 1, lo);
      // Prefer wrapping at a whitespace boundary (browser break behavior).
      let breakAt = lineEnd;
      while (breakAt > lineStart && text[breakAt - 1] !== " ") {
        breakAt -= 1;
      }
      if (breakAt > lineStart) {
        lineEnd = breakAt;
      }
    }

    // Emit per-char rects for [lineStart, lineEnd) inside this line rect.
    let cumX = 0;
    for (let i = lineStart; i < lineEnd; i += 1) {
      const ch = text[i]!;
      const w = getCharWidth(ctx, ch, fontSizePx);
      rects.push({
        left: lineRect.left + cumX,
        right: lineRect.left + cumX + w,
        top: lineRect.top,
        bottom: lineRect.bottom,
        height: lineRect.height,
      });
      cumX += w;
    }

    charIdx = lineEnd;
  }
}

export function collectCharRects(blockElement: HTMLElement): CharRectOut[] {
  const segmentEls = Array.from(
    blockElement.querySelectorAll<HTMLElement>(
      '[data-segment], [data-testid="editor-char-phantom"]',
    ),
  );

  segmentEls.sort((a, b) => {
    const sa = Number(a.dataset.segmentStart ?? a.dataset.charIndex ?? "0");
    const sb = Number(b.dataset.segmentStart ?? b.dataset.charIndex ?? "0");
    return sa - sb;
  });

  const rects: CharRectOut[] = [];
  const ctx = getMeasureContext();

  for (const seg of segmentEls) {
    const kind = seg.dataset.segment;
    if (kind === "text") {
      emitCharRectsForTextSegment(seg, rects, ctx);
    } else {
      // Atom (tab/image) or phantom: ONE getBoundingClientRect per element.
      const r = seg.getBoundingClientRect();
      rects.push({
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
      });
    }
  }

  return rects;
}

export function getParagraphElements(surface: HTMLElement, paragraphId: string): HTMLElement[] {
  return Array.from(
    surface.querySelectorAll<HTMLElement>(`[data-paragraph-id="${paragraphId}"]`),
  ).sort((left, right) => {
    const leftOffset = Number(left.dataset.startOffset ?? "0");
    const rightOffset = Number(right.dataset.startOffset ?? "0");
    return leftOffset - rightOffset;
  });
}

export function collectParagraphCharRects(
  surface: HTMLElement,
  paragraphId: string,
): Array<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}> {
  return getParagraphElements(surface, paragraphId).flatMap((element) => collectCharRects(element));
}
