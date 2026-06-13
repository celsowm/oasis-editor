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
    const offsets = SfntTableDirectory.collectionOffsets(reader);
    if (offsets && offsets.length === 0) {
      throw new TrueTypeParseError("font collection contains no fonts");
    }
    return SfntTableDirectory.parseAt(reader, offsets ? offsets[0]! : 0);
  }

  /**
   * Sub-font sfnt offsets when the bytes are a TrueType Collection (`ttcf`), or
   * `null` for a plain single-face sfnt. Lets callers pick a specific face
   * (regular/bold/italic) rather than always unwrapping to the first font.
   */
  static collectionOffsets(reader: BinaryReader): number[] | null {
    reader.seek(0);
    if (reader.tag() !== TTC_TAG) {
      return null;
    }
    reader.skip(4); // majorVersion (u16) + minorVersion (u16)
    const numFonts = reader.u32();
    const offsets: number[] = [];
    for (let index = 0; index < numFonts; index += 1) {
      offsets.push(reader.u32());
    }
    return offsets;
  }

  /** Parses the table directory whose offset table begins at `sfntOffset`. */
  static parseAt(reader: BinaryReader, sfntOffset: number): SfntTableDirectory {
    reader.seek(sfntOffset);
    reader.skip(4); // sfntVersion
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
