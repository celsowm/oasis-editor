import { LayoutFragment } from "../layout/LayoutFragment.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { BlockNode } from "../document/BlockTypes.js";
import { SectionNode } from "../document/SectionTypes.js";
import { IFontManager } from "../typography/FontManager.js";
import { getBlockBehavior } from "../document/BlockBehavior.js";

export interface MeasuredBlockResult {
  height: number;
  fragments: LayoutFragment[];
}

/**
 * Measures a list of blocks using the strategy pattern (BlockBehavior).
 * Open for extension, closed for modification.
 */
export function measureTextBlocks(
  blocks: BlockNode[],
  width: number,
  measure: TextMeasurer,
  section: SectionNode,
  fontManager: IFontManager,
): MeasuredBlockResult {
  let localY = 0;
  const fragments: LayoutFragment[] = [];

  for (const block of blocks) {
    const behavior = getBlockBehavior(block.kind);
    
    if (behavior) {
      const result = behavior.measure(block, width, measure, section, fontManager, localY);
      
      // Update fragment metadata that behavior might not know about
      for (const fragment of result.fragments) {
        fragment.sectionId = section.id;
        fragments.push(fragment);
      }
      
      localY += result.height + 12; // 12px spacing between blocks
    } else {
      // Fallback for unknown block types
      console.warn(`[LayoutEngine] No behavior registered for block kind: ${block.kind}`);
    }
  }

  return { height: localY, fragments };
}
