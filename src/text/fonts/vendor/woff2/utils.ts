export const TAG = (text: string) =>
  (text.charCodeAt(0) << 24) |
  (text.charCodeAt(1) << 16) |
  (text.charCodeAt(2) << 8) |
  text.charCodeAt(3);

export const TAG_GLYF = TAG("glyf");
export const TAG_LOCA = TAG("loca");
export const TAG_HMTX = TAG("hmtx");
export const TAG_HHEA = TAG("hhea");
export const TAG_HEAD = TAG("head");

// Known tag lookup as defined in table_tags.cc
export const KNOWN_TAGS: number[] = [
  TAG("cmap"),
  TAG("head"),
  TAG("hhea"),
  TAG("hmtx"),
  TAG("maxp"),
  TAG("name"),
  TAG("OS/2"),
  TAG("post"),
  TAG("cvt "),
  TAG("fpgm"),
  TAG_GLYF,
  TAG_LOCA,
  TAG("prep"),
  TAG("CFF "),
  TAG("VORG"),
  TAG("EBDT"),
  TAG("EBLC"),
  TAG("gasp"),
  TAG("hdmx"),
  TAG("kern"),
  TAG("LTSH"),
  TAG("PCLT"),
  TAG("VDMX"),
  TAG("vhea"),
  TAG("vmtx"),
  TAG("BASE"),
  TAG("GDEF"),
  TAG("GPOS"),
  TAG("GSUB"),
  TAG("EBSC"),
  TAG("JSTF"),
  TAG("MATH"),
  TAG("CBDT"),
  TAG("CBLC"),
  TAG("COLR"),
  TAG("CPAL"),
  TAG("SVG "),
  TAG("sbix"),
  TAG("acnt"),
  TAG("avar"),
  TAG("bdat"),
  TAG("bloc"),
  TAG("bsln"),
  TAG("cvar"),
  TAG("fdsc"),
  TAG("feat"),
  TAG("fmtx"),
  TAG("fvar"),
  TAG("gvar"),
  TAG("hsty"),
  TAG("just"),
  TAG("lcar"),
  TAG("mort"),
  TAG("morx"),
  TAG("opbd"),
  TAG("prop"),
  TAG("trak"),
  TAG("Zapf"),
  TAG("Silf"),
  TAG("Glat"),
  TAG("Gloc"),
  TAG("Feat"),
  TAG("Sill")
];

export function tagToString(tag: number): string {
  return String.fromCharCode(
    (tag >> 24) & 0xff,
    (tag >> 16) & 0xff,
    (tag >> 8) & 0xff,
    tag & 0xff
  );
}

export const round4 = (v: number) => (v + 3) & ~3;

export function computeULongSum(data: Uint8Array): number {
  let checksum = 0 >>> 0;
  const aligned = data.length & ~3;
  for (let i = 0; i < aligned; i += 4) {
    const value =
      (data[i] << 24) |
      (data[i + 1] << 16) |
      (data[i + 2] << 8) |
      data[i + 3];
    checksum = (checksum + value) >>> 0;
  }

  if (aligned !== data.length) {
    let v = 0;
    for (let i = aligned; i < data.length; i++) {
      v |= data[i] << (24 - 8 * (i & 3));
    }
    checksum = (checksum + v) >>> 0;
  }
  return checksum >>> 0;
}

export function store16(value: number, out: Uint8Array, offset: number): number {
  const v = value & 0xffff;
  out[offset] = (v >> 8) & 0xff;
  out[offset + 1] = v & 0xff;
  return offset + 2;
}

export function store32(value: number, out: Uint8Array, offset: number): number {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
  return offset + 4;
}
