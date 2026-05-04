import { DomHitTester } from "./DomHitTester.js";

export interface DropTargetInfo {
  blockId: string;
  isBefore: boolean;
  rect: DOMRect;
  pageId: string;
  pageX: number;
  pageY: number;
}

export class DropTargetService {
  constructor(private domHitTester: DomHitTester) {}

  findDropTarget(
    event: MouseEvent | DragEvent,
    pagesContainer: HTMLElement,
  ): DropTargetInfo | null {
    const element = this.domHitTester.elementFromPoint(event.clientX, event.clientY);

    // 1. Direct hit on a fragment.
    const directFragment = element
      ? (this.domHitTester.closest(".oasis-fragment", element) as HTMLElement | null)
      : null;
    
    if (directFragment) {
      const blockId = directFragment.getAttribute("data-block-id");
      if (blockId) {
        const rect = directFragment.getBoundingClientRect();
        const isBefore = event.clientY < rect.top + rect.height / 2;
        const pageId = directFragment.parentElement?.getAttribute("data-page-id") || "";
        const pageX = parseFloat(directFragment.style.left) || 0;
        const pageY = parseFloat(directFragment.style.top) || 0;
        return { blockId, isBefore, rect, pageId, pageX, pageY };
      }
    }

    // 2. Fallback to nearest fragment on page
    const pageEl =
      (element && (this.domHitTester.closest("[data-page-id]", element) as HTMLElement | null)) ||
      this.findClosestPage(event.clientX, event.clientY, pagesContainer);
    
    if (!pageEl) return null;

    const fragments = Array.from(
      pageEl.querySelectorAll<HTMLElement>(".oasis-fragment[data-block-id]"),
    );
    if (fragments.length === 0) return null;

    let bestFragment: HTMLElement | null = null;
    let bestDistance = Infinity;
    let bestIsBefore = false;

    for (const frag of fragments) {
      const rect = frag.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(event.clientY - midY);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestFragment = frag;
        bestIsBefore = event.clientY < midY;
      }
    }

    if (bestFragment) {
      const blockId = bestFragment.getAttribute("data-block-id")!;
      const rect = bestFragment.getBoundingClientRect();
      const pageId = pageEl.getAttribute("data-page-id") || "";
      const pageX = parseFloat(bestFragment.style.left) || 0;
      const pageY = parseFloat(bestFragment.style.top) || 0;
      return { blockId, isBefore: bestIsBefore, rect, pageId, pageX, pageY };
    }

    return null;
  }

  private findClosestPage(
    clientX: number,
    clientY: number,
    container: HTMLElement,
  ): HTMLElement | null {
    const pages = Array.from(container.querySelectorAll(".oasis-page"));
    if (pages.length === 0) return null;

    let closest: HTMLElement | null = null;
    let bestDistance = Infinity;

    for (const page of pages) {
      const rect = page.getBoundingClientRect();
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        closest = page as HTMLElement;
      }
    }
    return closest;
  }
}
