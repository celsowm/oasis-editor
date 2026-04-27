import { BlockNode } from "./BlockTypes.js";
import { LayoutFragment } from "../layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { IFontManager } from "../typography/FontManager.js";
import { SectionNode } from "./SectionTypes.js";

export interface BlockMeasurementResult {
  height: number;
  fragments: LayoutFragment[];
}

export interface BlockBehavior {
  measure(
    block: BlockNode,
    width: number,
    measure: TextMeasurer,
    section: SectionNode,
    fontManager: IFontManager,
    currentY: number
  ): BlockMeasurementResult;
}

const registry = new Map<string, BlockBehavior>();

export function registerBlockBehavior(kind: string, behavior: BlockBehavior): void {
  registry.set(kind, behavior);
}

export function getBlockBehavior(kind: string): BlockBehavior | undefined {
  return registry.get(kind);
}
