import { BinaryReader } from "./BinaryReader.js";
import { TrueTypeParseError } from "./TrueTypeParseError.js";

export interface SfntTableRecord {
  offset: number;
  length: number;
}

const TTC_TAG = "ttcf";

/**
 * The sfnt table directory: the 12-byte offset table plus the 16-byte table
 * records that locate every table (`head`, `hhea`, `cmap`, ...) within the
 * font. TrueType Collections (`ttcf`) are unwrapped to their first font.
 */
export class SfntTableDirectory {
  private readonly tables = new Map<string, SfntTableRecord>();

  private constructor() {}

  static parse(reader: BinaryReader): SfntTableDirectory {
    reader.seek(0);
    let sfntStart = 0;

    const firstTag = reader.tag();
    if (firstTag === TTC_TAG) {
      reader.skip(4); // majorVersion (u16) + minorVersion (u16)
      const numFonts = reader.u32();
      if (numFonts === 0) {
        throw new TrueTypeParseError("font collection contains no fonts");
      }
      sfntStart = reader.u32(); // offset of the first font's offset table
      reader.seek(sfntStart);
      reader.skip(4); // sfntVersion of the embedded font
    }
    // For a plain sfnt we already consumed sfntVersion via the first tag.

    const numTables = reader.u16();
    reader.skip(6); // searchRange (u16) + entrySelector (u16) + rangeShift (u16)

    const directory = new SfntTableDirectory();
    for (let index = 0; index < numTables; index += 1) {
      const tag = reader.tag();
      reader.skip(4); // checksum
      const offset = reader.u32();
      const length = reader.u32();
      directory.tables.set(tag, { offset, length });
    }
    return directory;
  }

  getTable(tag: string): SfntTableRecord | undefined {
    return this.tables.get(tag);
  }

  requireTable(tag: string): SfntTableRecord {
    const record = this.tables.get(tag);
    if (!record) {
      throw new TrueTypeParseError(`required table "${tag}" is missing`);
    }
    return record;
  }
}
