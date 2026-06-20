import JSZip from "jszip";
import type {
  EditorBlockNode,
  EditorFootnotes,
  EditorFootnote,
  EditorNamedStyle,
} from "@/core/model.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseDocxNotesXml } from "./notes.js";

export interface ParsedFootnotes {
  /** Map from DOCX `w:id` (string) to the parsed footnote. */
  byDocxId: Map<string, EditorFootnote>;
  /** Final shape ready to be assigned to `EditorDocument.footnotes`. */
  footnotes: EditorFootnotes;
  /** Imported "separator" part, if any. */
  separator?: EditorBlockNode[];
  /** Imported "continuationSeparator" part, if any. */
  continuationSeparator?: EditorBlockNode[];
}

export async function parseFootnotesXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<ParsedFootnotes> {
  const parsed = await parseDocxNotesXml<EditorFootnote>(
    "footnote",
    xmlContent,
    numberingMaps,
    zip,
    relsMap,
    assets,
    theme,
    styles,
  );
  return {
    byDocxId: parsed.byDocxId,
    footnotes: parsed.notes,
    separator: parsed.separator,
    continuationSeparator: parsed.continuationSeparator,
  };
}
