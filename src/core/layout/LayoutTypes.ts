import { Rect, LayoutFragment } from "./LayoutFragment.js";

export interface PageLayout {
  id: string;
  sectionId: string;
  pageIndex: number;
  pageNumber: string;
  rect: Rect;
  contentRect: Rect;
  templateId: string;
  headerRect: Rect | null;
  footerRect: Rect | null;
  fragments: LayoutFragment[];
  headerFragments: LayoutFragment[];
  footerFragments: LayoutFragment[];
}

export interface LayoutState {
  pages: PageLayout[];
  fragmentsByBlockId: Record<string, LayoutFragment[]>;
}
