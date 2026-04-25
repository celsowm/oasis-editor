import { LayoutFragment } from "../layout/LayoutFragment.js";
import { PageLayout } from "../layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { SectionNode } from "../document/SectionTypes.js";
import { measureTextBlocks } from "./BlockLayoutEngine.js";

export function applyHeaderFooterToPage(
  page: PageLayout,
  section: SectionNode,
  measure: TextMeasurer,
  fragmentsByBlockId: Record<string, LayoutFragment[]>,
): void {
  if (page.headerRect && section.header) {
    const { fragments } = measureTextBlocks(
      section.header,
      page.headerRect.width,
      measure,
      section,
    );
    for (const f of fragments) {
      f.rect.x += page.headerRect.x;
      f.rect.y += page.headerRect.y;
      f.pageId = page.id;
      for (const l of f.lines) {
        l.y += page.headerRect.y;
      }
      page.headerFragments.push(f);
      if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
      fragmentsByBlockId[f.blockId].push(f);
    }
  }

  if (page.footerRect && section.footer) {
    const { fragments } = measureTextBlocks(
      section.footer,
      page.footerRect.width,
      measure,
      section,
    );
    for (const f of fragments) {
      f.rect.x += page.footerRect.x;
      f.rect.y += page.footerRect.y;
      f.pageId = page.id;
      for (const l of f.lines) {
        l.y += page.footerRect.y;
      }
      page.footerFragments.push(f);
      if (!fragmentsByBlockId[f.blockId]) fragmentsByBlockId[f.blockId] = [];
      fragmentsByBlockId[f.blockId].push(f);
    }
  }
}
