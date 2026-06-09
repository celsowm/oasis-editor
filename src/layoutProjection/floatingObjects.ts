import type {
  EditorImageFloatingLayout,
  EditorImageRunData,
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorPageSettings,
  EditorTextBoxData,
} from "../core/model.js";

const EMU_PER_PX = 9525;

export interface FloatingObjectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingExclusionRect extends FloatingObjectRect {
  wrap: NonNullable<EditorImageFloatingLayout["wrap"]>;
  sourceRunId: string;
}

export interface FloatingObjectGeometry {
  width: number;
  height: number;
  floating: EditorImageFloatingLayout;
}

function emuToPx(value: number | undefined): number {
  return value === undefined ? 0 : value / EMU_PER_PX;
}

function clampFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function resolveAlignedOffset(
  align: string | undefined,
  containerSize: number,
  boxSize: number,
): number | null {
  switch (align) {
    case "left":
    case "top":
      return 0;
    case "center":
    case "ctr":
      return (containerSize - boxSize) / 2;
    case "right":
    case "bottom":
      return containerSize - boxSize;
    default:
      return null;
  }
}

export type ResolveTextBoxHeight = (textBox: EditorTextBoxData) => number;

export function getTextBoxFloatingGeometry(
  textBox: EditorTextBoxData,
  heightOverride?: number,
): FloatingObjectGeometry {
  return {
    width: textBox.width,
    height: Math.max(1, heightOverride ?? textBox.height),
    floating: textBox.floating!,
  };
}

export function getImageFloatingGeometry(
  image: EditorImageRunData,
): FloatingObjectGeometry {
  return {
    width: image.width,
    height: image.height,
    floating: image.floating!,
  };
}

function shouldExclude(
  floating: EditorImageFloatingLayout | undefined,
): boolean {
  if (!floating) return false;
  if (floating.behindDoc) return false;
  if (!floating.wrap || floating.wrap === "none") return false;
  return true;
}

function expandForWrap(
  rect: FloatingObjectRect,
  floating: EditorImageFloatingLayout,
): FloatingObjectRect {
  const left = emuToPx(floating.distL);
  const right = emuToPx(floating.distR);
  const top = emuToPx(floating.distT);
  const bottom = emuToPx(floating.distB);

  return {
    x: rect.x - left,
    y: rect.y - top,
    width: rect.width + left + right,
    height: rect.height + top + bottom,
  };
}

export function resolveFloatingObjectRect(options: {
  object: FloatingObjectGeometry;
  pageSettings: EditorPageSettings;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  paragraphTop: number;
  lineTop: number;
  anchorLeft: number;
}): FloatingObjectRect {
  const {
    object,
    pageSettings,
    contentLeft,
    contentTop,
    contentWidth,
    paragraphTop,
    lineTop,
    anchorLeft,
  } = options;

  const width = Math.max(1, object.width);
  const height = Math.max(1, object.height);
  const floating = object.floating;

  const h = floating?.positionH;
  const hRelativeFrom = h?.relativeFrom ?? "column";

  let hBase = contentLeft;
  let hContainerWidth = contentWidth;

  if (hRelativeFrom === "page") {
    hBase = 0;
    hContainerWidth = pageSettings.width;
  } else if (hRelativeFrom === "character") {
    hBase = anchorLeft;
    hContainerWidth = Math.max(1, pageSettings.width - anchorLeft);
  } else if (hRelativeFrom === "margin" || hRelativeFrom === "column") {
    hBase = contentLeft;
    hContainerWidth = contentWidth;
  }

  const alignedX = resolveAlignedOffset(h?.align, hContainerWidth, width);
  const x = hBase + (alignedX !== null ? alignedX : emuToPx(h?.offset));

  const v = floating?.positionV;
  const vRelativeFrom = v?.relativeFrom ?? "paragraph";

  let vBase = paragraphTop;
  let vContainerHeight = pageSettings.height;

  if (vRelativeFrom === "page") {
    vBase = 0;
    vContainerHeight = pageSettings.height;
  } else if (vRelativeFrom === "margin") {
    vBase = contentTop;
    vContainerHeight = Math.max(1, pageSettings.height - contentTop);
  } else if (vRelativeFrom === "line") {
    vBase = lineTop;
    vContainerHeight = Math.max(1, pageSettings.height - lineTop);
  } else if (vRelativeFrom === "paragraph") {
    vBase = paragraphTop;
    vContainerHeight = Math.max(1, pageSettings.height - paragraphTop);
  }

  const alignedY = resolveAlignedOffset(v?.align, vContainerHeight, height);
  const y = vBase + (alignedY !== null ? alignedY : emuToPx(v?.offset));

  return {
    x: clampFinite(x, contentLeft),
    y: clampFinite(y, paragraphTop),
    width,
    height,
  };
}

export function collectParagraphFloatingExclusions(options: {
  fragments: EditorLayoutFragment[];
  preliminaryLines: EditorLayoutLine[];
  pageSettings: EditorPageSettings;
  contentWidth: number;
  resolveTextBoxHeight?: ResolveTextBoxHeight;
}): FloatingExclusionRect[] {
  const {
    fragments,
    preliminaryLines,
    pageSettings,
    contentWidth,
    resolveTextBoxHeight,
  } = options;

  const slotByOffset = new Map<number, { left: number; top: number }>();

  for (const line of preliminaryLines) {
    for (const slot of line.slots) {
      slotByOffset.set(slot.offset, {
        left: slot.left,
        top: line.top,
      });
    }
  }

  const exclusions: FloatingExclusionRect[] = [];

  for (const fragment of fragments) {
    const textBox = fragment.textBox;
    const image = fragment.image;
    const floating = textBox?.floating ?? image?.floating;

    if (!floating || !shouldExclude(floating)) {
      continue;
    }

    const geom: FloatingObjectGeometry = textBox
      ? getTextBoxFloatingGeometry(
          textBox,
          resolveTextBoxHeight?.(textBox),
        )
      : getImageFloatingGeometry(image!);

    const anchorSlot = slotByOffset.get(fragment.startOffset);
    const anchorLeft = anchorSlot?.left ?? 0;
    const lineTop = anchorSlot?.top ?? 0;

    const rawRect = resolveFloatingObjectRect({
      object: geom,
      pageSettings,
      contentLeft: 0,
      contentTop: 0,
      contentWidth,
      paragraphTop: 0,
      lineTop,
      anchorLeft,
    });

    const expanded = expandForWrap(rawRect, floating);

    exclusions.push({
      ...expanded,
      wrap: floating.wrap ?? "square",
      sourceRunId: fragment.runId,
    });
  }

  return exclusions;
}
