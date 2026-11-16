import type {
  EditorNamedStyle, EditorParagraphNode, EditorResolvedTab, EditorTabStop,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { PX_PER_POINT, COLUMN_BREAK_MARKER } from "@/core/units.js";
import type { MeasuredChar } from "./types.js";

const DEFAULT_TAB_STOP_POINTS = 36;
const STOP_EPS_PX = 0.01;

type AdvancingStop = EditorResolvedTab;
interface TabField { width: number; beforeDecimal: number }

function decimalSeparator(locale?: string | null): string | undefined {
  if (!locale) return undefined;
  try {
    return new Intl.NumberFormat(locale).formatToParts(1.1)
      .find(part => part.type === "decimal")?.value;
  } catch {
    return undefined;
  }
}

/** Prepare the segment widths once; each measured character is visited at
 * most once by the disjoint post-tab segment scans. */
function measureFields(chars: readonly MeasuredChar[]): Map<number, TabField> {
  const result = new Map<number, TabField>();
  for (let i = 0; i < chars.length; i++) {
    const tab = chars[i]!;
    if (tab.char !== "\t") continue;
    const separator = decimalSeparator(chars[i + 1]?.style?.language?.value ?? tab.style?.language?.value);
    let width = 0;
    let beforeDecimal: number | undefined;
    for (let j = i + 1; j < chars.length; j++) {
      const char = chars[j]!;
      if (char.char === "\t" || char.char === "\n" || char.char === COLUMN_BREAK_MARKER) break;
      if (beforeDecimal === undefined &&
          (separator ? char.char === separator : char.char === "." || char.char === ",")) {
        beforeDecimal = width;
      }
      width += char.width;
    }
    result.set(tab.offset, { width, beforeDecimal: beforeDecimal ?? width });
  }
  return result;
}

export interface PreparedTabLayout {
  barPositionsPx: number[];
  resolve: (currentLeftPx: number, offset: number) => { advancePx: number; stop: EditorResolvedTab };
}

/** All coordinates are relative to the column/cell text margin, in CSS px.
 * A bar never advances text. The same selected stop identity is passed to both
 * painters; neither painter is permitted to choose a stop independently. */
export function prepareTabLayout(
  tabs: readonly EditorTabStop[],
  defaultTabStop: number | undefined,
  chars: readonly MeasuredChar[],
): PreparedTabLayout {
  const explicit: AdvancingStop[] = [];
  const bars = new Set<number>();
  for (const tab of tabs) {
    if (!Number.isFinite(tab.position) || tab.type === "clear") continue;
    const stopPositionPx = tab.position * PX_PER_POINT;
    if (!Number.isFinite(stopPositionPx)) continue;
    if (tab.type === "bar") {
      bars.add(stopPositionPx);
      continue;
    }
    explicit.push({
      stopPositionPx,
      type: tab.type,
      ...(tab.leader && tab.leader !== "none" ? { leader: tab.leader } : {}),
    });
  }
  explicit.sort((a, b) => a.stopPositionPx - b.stopPositionPx);
  const configured = (defaultTabStop ?? DEFAULT_TAB_STOP_POINTS) * PX_PER_POINT;
  const intervalPx = Number.isFinite(configured) && configured > 0
    ? configured : DEFAULT_TAB_STOP_POINTS * PX_PER_POINT;
  const fields = measureFields(chars);
  return {
    barPositionsPx: [...bars].sort((a, b) => a - b),
    resolve(currentLeftPx, offset) {
      const chosen = explicit.find(stop => stop.stopPositionPx > currentLeftPx + STOP_EPS_PX);
      const stop: EditorResolvedTab = chosen ?? {
        type: "left",
        stopPositionPx: Math.ceil((currentLeftPx + STOP_EPS_PX) / intervalPx) * intervalPx,
      };
      const field = fields.get(offset);
      const adjustment = stop.type === "right" ? (field?.width ?? 0)
        : stop.type === "center" ? (field?.width ?? 0) / 2
        : stop.type === "decimal" ? (field?.beforeDecimal ?? 0) : 0;
      // Crowded alignment fallback remains provisional pending Word fixtures.
      return { stop, advancePx: Math.max(1, stop.stopPositionPx - currentLeftPx - adjustment) };
    },
  };
}

export function resolveTabAdvancePx(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  defaultTabStop: number | undefined,
  lineStartInset: number,
  lineWidth: number,
  tabOffset: number,
  measuredChars: MeasuredChar[],
): number {
  const style = resolveEffectiveParagraphStyle(paragraph.style, styles);
  return prepareTabLayout(style.tabs ?? [], defaultTabStop, measuredChars)
    .resolve(lineStartInset + lineWidth, tabOffset).advancePx;
}
