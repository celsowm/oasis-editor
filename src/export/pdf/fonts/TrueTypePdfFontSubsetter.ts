import type {
  FontSubset,
  FontSubsetter,
  GlyphInfo,
  ParsedFontProgram,
} from "@/text/fonts/core/types.js";
import { buildSfnt } from "@/text/fonts/vendor/woff2/sfnt-builder.js";

interface GlyphRange {
  start: number;
  end: number;
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function u16(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint16(offset);
}

function i16(bytes: Uint8Array, offset: number): number {
  return view(bytes).getInt16(offset);
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  view(target).setUint16(offset, value, false);
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
  view(target).setUint32(offset, value, false);
}

function pad4(length: number): number {
  return (length + 3) & ~3;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce(
    (sum, chunk): number => sum + pad4(chunk.byteLength),
    0,
  );
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += pad4(chunk.byteLength);
  }
  return result;
}

function readLoca(loca: Uint8Array, indexToLocFormat: number): number[] {
  const offsets: number[] = [];
  const table = view(loca);
  if (indexToLocFormat === 0) {
    for (let offset = 0; offset + 1 < loca.byteLength; offset += 2) {
      offsets.push(table.getUint16(offset) * 2);
    }
  } else {
    for (let offset = 0; offset + 3 < loca.byteLength; offset += 4) {
      offsets.push(table.getUint32(offset));
    }
  }
  return offsets;
}

function glyphRange(offsets: number[], glyphId: number): GlyphRange | null {
  const start = offsets[glyphId];
  const end = offsets[glyphId + 1];
  return start === undefined || end === undefined ? null : { start, end };
}

function collectCompositeGlyphs(
  glyph: Uint8Array,
  addGlyph: (glyphId: number, offset: number) => void,
): void {
  if (glyph.byteLength < 10 || i16(glyph, 0) >= 0) {
    return;
  }

  let offset = 10;
  let flags = 0;
  do {
    if (offset + 4 > glyph.byteLength) throw new Error("Truncated composite glyph");
    flags = u16(glyph, offset);
    addGlyph(u16(glyph, offset + 2), offset + 2);
    offset += 4;
    offset += flags & 0x0001 ? 4 : 2;
    if (flags & 0x0008) offset += 2;
    else if (flags & 0x0040) offset += 4;
    else if (flags & 0x0080) offset += 8;
  } while (flags & 0x0020);
}

function subsetClosure(
  font: ParsedFontProgram,
  initialGlyphs: Iterable<number>,
): number[] {
  const glyf = font.getRawTableData("glyf");
  const loca = font.getRawTableData("loca");
  const head = font.getRawTableData("head");
  if (!glyf || !loca || !head) {
    return Array.from(new Set([0, ...initialGlyphs])).sort(
      (a, b): number => a - b,
    );
  }

  const offsets = readLoca(loca, u16(head, 50));
  const used = new Set<number>([0, ...initialGlyphs]);
  const stack = Array.from(used);

  while (stack.length > 0) {
    const glyphId = stack.pop()!;
    const range = glyphRange(offsets, glyphId);
    if (!range || glyphId >= font.glyphCount || range.end < range.start || range.end > glyf.byteLength) {
      throw new Error("Invalid subset glyph range");
    }
    if (range.end === range.start) continue;
    const glyph = glyf.slice(range.start, range.end);
    collectCompositeGlyphs(glyph, (componentId): void => {
      if (!used.has(componentId)) {
        used.add(componentId);
        stack.push(componentId);
      }
    });
  }

  return Array.from(used).sort((a, b): number => a - b);
}

function buildLoca(offsets: number[]): Uint8Array {
  const loca = new Uint8Array(offsets.length * 4);
  offsets.forEach((offset, index): void => writeU32(loca, index * 4, offset));
  return loca;
}

/** Build compact horizontal metrics, preserving original side bearings. */
function buildHmtx(font: ParsedFontProgram, glyphIds: number[], hhea: Uint8Array): Uint8Array {
  const source=font.getRawTableData("hmtx");
  const longCount=u16(hhea,34);
  if(!source||longCount<1||longCount>font.glyphCount)throw new Error("Invalid source hmtx");
  const hmtx=new Uint8Array(glyphIds.length*4);
  glyphIds.forEach((gid,index)=>{
    const lsbOffset=gid<longCount?gid*4+2:longCount*4+(gid-longCount)*2;
    writeU16(hmtx,index*4,font.advanceWidthForGlyph(gid));
    view(hmtx).setInt16(index*4+2,i16(source,lsbOffset));
  });
  return hmtx;
}

/** Map only source Unicode mappings represented by this subset. Shaped
 * alternates/ligatures are addressed through PDF CIDToGIDMap and ToUnicode,
 * never by inventing a misleading Unicode cmap mapping. */
function buildCmap(font: ParsedFontProgram, unicode: Map<number,number[]>, gidMap: Map<number,number>): Uint8Array {
  const values=new Map<number,number>();
  for(const points of unicode.values())for(const cp of points){
    if(!Number.isInteger(cp)||cp<=0||cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))continue;
    const dense=gidMap.get(font.glyphForCodePoint(cp));
    if(dense)values.set(cp,dense);
  }
  const entries=[...values].sort(([a],[b])=>a-b);
  const groups:{start:number;end:number;gid:number}[]=[];
  for(const [cp,gid] of entries){
    const last=groups[groups.length-1];
    if(last&&cp===last.end+1&&gid===last.gid+cp-last.start)last.end=cp;
    else groups.push({start:cp,end:cp,gid});
  }
  const format12=new Uint8Array(16+groups.length*12);
  writeU16(format12,0,12);writeU32(format12,4,format12.length);writeU32(format12,12,groups.length);
  groups.forEach((g,i)=>{const at=16+i*12;writeU32(format12,at,g.start);writeU32(format12,at+4,g.end);writeU32(format12,at+8,g.gid);});
  // Provide a Windows BMP subtable as well where its uint16 length permits.
  const bmp=groups.filter(g=>g.start<0xffff).map(g=>({...g,end:Math.min(g.end,0xfffe)}));
  bmp.push({start:0xffff,end:0xffff,gid:0});
  const n=bmp.length,length=16+8*n;
  const format4=length<=0xffff?new Uint8Array(length):null;
  if(format4){
    const power=2**Math.floor(Math.log2(n));
    writeU16(format4,0,4);writeU16(format4,2,length);writeU16(format4,6,n*2);
    writeU16(format4,8,power*2);writeU16(format4,10,Math.log2(power));writeU16(format4,12,n*2-power*2);
    bmp.forEach((g,i)=>{
      writeU16(format4,14+i*2,g.end);
      writeU16(format4,16+n*2+i*2,g.start);
      writeU16(format4,16+n*4+i*2,(g.gid-g.start)&0xffff);
    });
  }
  const count=format4?2:1,header=4+count*8;
  const cmap=new Uint8Array(header+(format4?.length??0)+format12.length);
  writeU16(cmap,2,count);
  if(format4){
    writeU16(cmap,4,3);writeU16(cmap,6,1);writeU32(cmap,8,header);
    cmap.set(format4,header);
  }
  const record=format4?12:4,offset=header+(format4?.length??0);
  writeU16(cmap,record,3);writeU16(cmap,record+2,10);writeU32(cmap,record+4,offset);
  cmap.set(format12,offset);
  return cmap;
}

function buildSubsetTables(
  font: ParsedFontProgram,
  glyphIds: number[],
  gidMap: Map<number,number>,
  unicode: Map<number,number[]>,
): Record<string, Uint8Array> {
  const glyf=font.getRawTableData("glyf"),loca=font.getRawTableData("loca");
  const head=font.getRawTableData("head"),hhea=font.getRawTableData("hhea"),maxp=font.getRawTableData("maxp");
  if(!glyf||!loca||!head||!hhea||!maxp)throw new Error("Missing required TrueType tables for subsetting");
  const sourceOffsets=readLoca(loca,u16(head,50));
  const locaOffsets:number[]=[],glyfChunks:Uint8Array[]=[];
  let glyfOffset=0;
  for(const gid of glyphIds){
    locaOffsets.push(glyfOffset);
    const range=glyphRange(sourceOffsets,gid);
    if(!range||range.end<range.start||range.end>glyf.length)throw new Error("Invalid glyph range");
    if(range.end===range.start)continue;
    const glyph=glyf.slice(range.start,range.end);
    // Rewrite each composite component, including nested composites already
    // discovered by subsetClosure. Preserve flags, transforms and outlines.
    collectCompositeGlyphs(glyph,(component,offset)=>{
      const dense=gidMap.get(component);
      if(dense===undefined)throw new Error("Missing composite dependency");
      writeU16(glyph,offset,dense);
    });
    glyfChunks.push(glyph);
    glyfOffset+=pad4(glyph.length);
  }
  locaOffsets.push(glyfOffset);
  const newHead=head.slice();writeU32(newHead,8,0);writeU16(newHead,50,1);
  const newHhea=hhea.slice();writeU16(newHhea,34,glyphIds.length);
  const newMaxp=maxp.slice();writeU16(newMaxp,4,glyphIds.length);
  const tables:Record<string,Uint8Array>={
    cmap:buildCmap(font,unicode,gidMap),head:newHead,hhea:newHhea,maxp:newMaxp,
    hmtx:buildHmtx(font,glyphIds,hhea),loca:buildLoca(locaOffsets),glyf:concat(glyfChunks),
  };
  // Preserve the font identity, metrics and original TrueType hint programs.
  // GSUB/GPOS were applied before subsetting and must not retain stale GIDs.
  for(const tag of ["OS/2","name","cvt ","fpgm","prep","gasp"]){
    const table=font.getRawTableData(tag);
    if(table)tables[tag]=table;
  }
  const post=font.getRawTableData("post");
  if(post&&post.length>=32){
    // Format 3 preserves metadata without the original glyph-name array,
    // which would be both redundant and incorrect after renumbering.
    tables.post=post.slice(0,32);
    writeU32(tables.post,0,0x00030000);
  }
  return tables;
}

export class TrueTypePdfFontSubsetter implements FontSubsetter {
  createSubset(
    font: ParsedFontProgram,
    glyphs: Iterable<GlyphInfo>,
  ): FontSubset {
    const unicodeByGlyph = new Map<number, number[]>();
    const initialGlyphs: number[] = [];
    for (const glyph of glyphs) {
      initialGlyphs.push(glyph.id);
      if (!unicodeByGlyph.has(glyph.id)) {
        unicodeByGlyph.set(glyph.id, glyph.codePoints);
      }
    }

    const glyphIds = subsetClosure(font, initialGlyphs);
    const gidMap = new Map(glyphIds.map((gid, index) => [gid, index]));
    const tables = buildSubsetTables(font, glyphIds, gidMap, unicodeByGlyph);
    const fontFile = buildSfnt(
      0x00010000,
      new Map(
        Object.entries(tables).map(
          ([tag, data]): [number, Uint8Array<ArrayBufferLike>] => [
            (tag.charCodeAt(0) << 24) |
              (tag.charCodeAt(1) << 16) |
              (tag.charCodeAt(2) << 8) |
              tag.charCodeAt(3),
            data,
          ],
        ),
      ),
    ).ttf;
    const widths: number[] = [];
    const unicode: number[][] = [];
    for (const glyphId of glyphIds) {
      widths[glyphId] =
        (font.advanceWidthForGlyph(glyphId) / font.unitsPerEm) * 1000;
      unicode[glyphId] = unicodeByGlyph.get(glyphId) ?? [0];
    }

    return {
      fontFile,
      widths,
      unicode,
      encodeGlyph: (glyphId): number => gidMap.get(glyphId) ?? 0,
    };
  }
}
