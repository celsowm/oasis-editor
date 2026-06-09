import { type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorBlockNode,
  EditorTextStyle,
  EditorImageRunData,
  EditorTextBoxData,
} from "../../../core/model.js";

export type ParseNestedBlocks = (
  container: XmlElement,
) => Promise<EditorBlockNode[]>;

export interface ImportedRun {
  text: string;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  styles?: EditorTextStyle;
  field?: { type: "PAGE" | "NUMPAGES" };
  footnoteReference?: { docxId: string; customMark?: string };
}
