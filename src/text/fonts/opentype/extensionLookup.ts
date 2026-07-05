import { BinaryReader } from "@/text/truetype/BinaryReader.js";

/**
 * Unwraps a GSUB/GPOS "Extension" subtable (format 1) to the real subtable
 * it points to, then delegates to the caller's own `parseSubtable` for that
 * lookup type. GSUB lookupType 7 and GPOS lookupType 9 share this exact
 * indirection layout — only the meaning of `lookupType` differs per table.
 */
export function parseExtensionLookup<TSubtable>(
  reader: BinaryReader,
  offset: number,
  parseSubtable: (
    reader: BinaryReader,
    offset: number,
    lookupType: number,
  ) => TSubtable | null,
): TSubtable | null {
  reader.seek(offset);
  const format = reader.u16();
  if (format !== 1) return null;
  const extensionType = reader.u16();
  const extensionOffset = offset + reader.u32();
  return parseSubtable(reader, extensionOffset, extensionType);
}
