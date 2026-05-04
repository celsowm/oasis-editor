import { BlockNode } from "./BlockTypes.js";

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SectionBreakPolicy {
  startOnNewPage: boolean;
  startOnOddPage: boolean;
}

export interface SectionNode {
  id: string;
  pageTemplateId: string;
  margins: Margins;
  orientation: "portrait" | "landscape";
  children: BlockNode[];
  header?: BlockNode[];
  footer?: BlockNode[];
  breakPolicy: SectionBreakPolicy;
}

export const createDefaultMargins = (): Margins => ({
  top: 96,
  right: 96,
  bottom: 96,
  left: 96,
});

export const createDefaultBreakPolicy = (): SectionBreakPolicy => ({
  startOnNewPage: false,
  startOnOddPage: false,
});
