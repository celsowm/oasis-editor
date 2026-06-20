import JSZip from "jszip";
import type {
  EditorBlockNode,
  EditorEndnotes,
  EditorEndnote,
  EditorNamedStyle,
} from "@/core/model.js";
import { type AssetRegistry } from "./assetRegistry.js";
import { type DocxImportTheme } from "./theme.js";
import { type NumberingMaps } from "./numbering.js";
import { parseDocxNotesXml } from "./notes.js";

export interface ParsedEndnotes {
  /** Map from DOCX `w:id` (string) to the parsed endnote. */
  byDocxId: Map<string, EditorEndnote>;
  /** Final shape ready to be assigned to `EditorDocument.endnotes`. */
  endnotes: EditorEndnotes;
  /** Imported "separator" part, if any. */
  separator?: EditorBlockNode[];
  /** Imported "continuationSeparator" part, if any. */
  continuationSeparator?: EditorBlockNode[];
}

export async function parseEndnotesXml(
  xmlContent: string | null,
  numberingMaps: NumberingMaps,
  zip: JSZip,
  relsMap: Map<string, string>,
  assets: AssetRegistry,
  theme: DocxImportTheme,
  styles?: Record<string, EditorNamedStyle>,
): Promise<ParsedEndnotes> {
  const parsed = await parseDocxNotesXml<EditorEndnote>(
    "endnote",
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
    endnotes: parsed.notes,
    separator: parsed.separator,
    continuationSeparator: parsed.continuationSeparator,
  };
}
