export interface PageSize {
  width: number;
  height: number;
}

export interface HeaderFooterTemplate {
  enabled: boolean;
  height: number;
}

export interface PageTemplate {
  id: string;
  name: string;
  size: PageSize;
  margins: { top: number; right: number; bottom: number; left: number };
  header: HeaderFooterTemplate;
  footer: HeaderFooterTemplate;
  firstPageDifferent: boolean;
}

export const BLOCK_SPACING = 12;
