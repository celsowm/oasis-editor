import { MarkSet } from "./BlockTypes.js";

export interface InlineNode {
  id: string;
  text: string;
  marks: MarkSet;
}
