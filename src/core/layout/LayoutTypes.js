/**
 * @typedef {{
 *   id: string,
 *   sectionId: string,
 *   pageIndex: number,
 *   pageNumber: string,
 *   rect: import('./LayoutFragment.js').Rect,
 *   contentRect: import('./LayoutFragment.js').Rect,
 *   templateId: string,
 *   headerRect: import('./LayoutFragment.js').Rect | null,
 *   footerRect: import('./LayoutFragment.js').Rect | null,
 *   fragments: import('./LayoutFragment.js').LayoutFragment[],
 * }} PageLayout
 *
 * @typedef {{ pages: PageLayout[], fragmentsByBlockId: Record<string, import('./LayoutFragment.js').LayoutFragment[]> }} LayoutState
 */
