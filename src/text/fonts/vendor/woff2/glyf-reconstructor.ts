import { Buf, read255UShort } from "./buffer.js";
import { computeULongSum, round4, store16, store32 } from "./utils.js";

export const GLYF_FLAGS = {
  ON_CURVE: 1 << 0,
  X_SHORT: 1 << 1,
  Y_SHORT: 1 << 2,
  REPEAT: 1 << 3,
  X_SAME: 1 << 4,
  Y_SAME: 1 << 5,
  OVERLAP_SIMPLE: 1 << 6
};

export const COMPOSITE_FLAGS = {
  ARG_WORDS: 1 << 0,
  WE_HAVE_A_SCALE: 1 << 3,
  MORE_COMPONENTS: 1 << 5,
  WE_HAVE_AN_XY_SCALE: 1 << 6,
  WE_HAVE_A_TWO_BY_TWO: 1 << 7,
  WE_HAVE_INSTRUCTIONS: 1 << 8
};

export interface GlyfReconstruction {
  glyfData: Uint8Array;
  locaData: Uint8Array;
  glyfChecksum: number;
  locaChecksum: number;
  numGlyphs: number;
  indexFormat: number;
  xMins: Int16Array;
}

export function withSign(flag: number, base: number): number {
  return (flag & 1) ? base : -base;
}

export function tripletDecode(
  flagsIn: Uint8Array,
  data: Uint8Array,
  nPoints: number
): { points: { x: number; y: number; onCurve: boolean }[]; consumed: number } {
  let x = 0;
  let y = 0;
  let tripletIndex = 0;
  const points: { x: number; y: number; onCurve: boolean }[] = new Array(
    nPoints
  );

  for (let i = 0; i < nPoints; i++) {
    let flag = flagsIn[i];
    const onCurve = (flag >> 7) === 0;
    flag &= 0x7f;
    let nDataBytes = 1;
    if (flag >= 84 && flag < 120) nDataBytes = 2;
    else if (flag < 84) nDataBytes = 1;
    else if (flag < 124) nDataBytes = 3;
    else nDataBytes = 4;

    if (tripletIndex + nDataBytes > data.length) {
      throw new Error("Invalid WOFF2 glyf triplet");
    }
    let dx: number;
    let dy: number;
    if (flag < 10) {
      dx = 0;
      dy = withSign(flag, ((flag & 14) << 7) + data[tripletIndex]);
    } else if (flag < 20) {
      dx = withSign(flag, (((flag - 10) & 14) << 7) + data[tripletIndex]);
      dy = 0;
    } else if (flag < 84) {
      const b0 = flag - 20;
      const b1 = data[tripletIndex];
      dx = withSign(flag, 1 + (b0 & 0x30) + (b1 >> 4));
      dy = withSign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f));
    } else if (flag < 120) {
      const b0 = flag - 84;
      dx = withSign(flag, 1 + ((b0 / 12) << 8) + data[tripletIndex]);
      dy = withSign(
        flag >> 1,
        1 + (((b0 % 12) >> 2) << 8) + data[tripletIndex + 1]
      );
    } else if (flag < 124) {
      const b2 = data[tripletIndex + 1];
      dx = withSign(flag, (data[tripletIndex] << 4) + (b2 >> 4));
      dy = withSign(flag >> 1, ((b2 & 0x0f) << 8) + data[tripletIndex + 2]);
    } else {
      dx = withSign(flag, (data[tripletIndex] << 8) + data[tripletIndex + 1]);
      dy = withSign(
        flag >> 1,
        (data[tripletIndex + 2] << 8) + data[tripletIndex + 3]
      );
    }
    tripletIndex += nDataBytes;
    x += dx;
    y += dy;
    points[i] = { x, y, onCurve };
  }

  return { points, consumed: tripletIndex };
}

export function storePoints(
  points: { x: number; y: number; onCurve: boolean }[],
  nContours: number,
  instructionLength: number,
  hasOverlap: boolean
): Uint8Array {
  const nPoints = points.length;
  const xBytes: number[] = [];
  const yBytes: number[] = [];

  let lastX = 0;
  let lastY = 0;
  let lastFlag = -1;
  let repeatCount = 0;

  const flagOffset = 10 + 2 * nContours + 2 + instructionLength;

  const flagsOut: number[] = [];

  for (let i = 0; i < nPoints; i++) {
    const point = points[i];
    let flag = point.onCurve ? GLYF_FLAGS.ON_CURVE : 0;
    if (hasOverlap && i === 0) {
      flag |= GLYF_FLAGS.OVERLAP_SIMPLE;
    }
    const dx = point.x - lastX;
    const dy = point.y - lastY;

    if (dx === 0) flag |= GLYF_FLAGS.X_SAME;
    else if (dx > -256 && dx < 256) {
      flag |= GLYF_FLAGS.X_SHORT | (dx > 0 ? GLYF_FLAGS.X_SAME : 0);
      xBytes.push(Math.abs(dx));
    } else {
      xBytes.push((dx >> 8) & 0xff, dx & 0xff);
    }

    if (dy === 0) flag |= GLYF_FLAGS.Y_SAME;
    else if (dy > -256 && dy < 256) {
      flag |= GLYF_FLAGS.Y_SHORT | (dy > 0 ? GLYF_FLAGS.Y_SAME : 0);
      yBytes.push(Math.abs(dy));
    } else {
      yBytes.push((dy >> 8) & 0xff, dy & 0xff);
    }

    if (flag === lastFlag && repeatCount !== 255) {
      flagsOut[flagsOut.length - 1] |= GLYF_FLAGS.REPEAT;
      repeatCount++;
    } else {
      if (repeatCount !== 0) {
        flagsOut.push(repeatCount);
      }
      flagsOut.push(flag);
      repeatCount = 0;
      lastFlag = flag;
    }

    lastX = point.x;
    lastY = point.y;
  }

  if (repeatCount !== 0) {
    flagsOut.push(repeatCount);
  }

  const totalSize = flagOffset + flagsOut.length + xBytes.length + yBytes.length;
  const out = new Uint8Array(totalSize);
  let offset = flagOffset;
  for (const f of flagsOut) out[offset++] = f;
  for (const b of xBytes) out[offset++] = b;
  for (const b of yBytes) out[offset++] = b;
  return out;
}

export function computeBBox(points: { x: number; y: number }[]): [number, number, number, number] {
  if (points.length === 0) {
    return [0, 0, 0, 0];
  }
  let xMin = points[0].x;
  let xMax = points[0].x;
  let yMin = points[0].y;
  let yMax = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  return [xMin, yMin, xMax, yMax];
}

export function sizeOfComposite(stream: Buf): { size: number; haveInstructions: boolean } {
  const start = stream.offset;
  let flags = COMPOSITE_FLAGS.MORE_COMPONENTS;
  let haveInstructions = false;

  while (flags & COMPOSITE_FLAGS.MORE_COMPONENTS) {
    flags = stream.readU16();
    haveInstructions ||= (flags & COMPOSITE_FLAGS.WE_HAVE_INSTRUCTIONS) !== 0;
    let argSize = 2; // glyph index
    if (flags & COMPOSITE_FLAGS.ARG_WORDS) argSize += 4;
    else argSize += 2;

    if (flags & COMPOSITE_FLAGS.WE_HAVE_A_SCALE) argSize += 2;
    else if (flags & COMPOSITE_FLAGS.WE_HAVE_AN_XY_SCALE) argSize += 4;
    else if (flags & COMPOSITE_FLAGS.WE_HAVE_A_TWO_BY_TWO) argSize += 8;

    stream.skip(argSize);
  }

  return { size: stream.offset - start, haveInstructions };
}

export function storeLoca(
  locaValues: number[],
  indexFormat: number
): { data: Uint8Array; checksum: number } {
  const offsetSize = indexFormat ? 4 : 2;
  const buffer = new Uint8Array(locaValues.length * offsetSize);
  let off = 0;
  for (const value of locaValues) {
    if (indexFormat) {
      off = store32(value, buffer, off);
    } else {
      off = store16(value >> 1, buffer, off);
    }
  }
  return { data: buffer, checksum: computeULongSum(buffer) };
}

export function reconstructGlyfTable(
  transformed: Uint8Array,
  locaDstLength: number
): GlyfReconstruction {
  const stream = new Buf(transformed);
  /* const version = */ stream.readU16();
  const flags = stream.readU16();
  const hasOverlapBitmap = (flags & 1) !== 0;
  const numGlyphs = stream.readU16();
  const indexFormat = stream.readU16();

  const substreamSizes: number[] = [];
  for (let i = 0; i < 7; i++) {
    substreamSizes.push(stream.readU32());
  }

  let dataOffset = (2 + 7) * 4; // header (version/flags/numGlyphs/indexFormat + sizes)
  const substreams: Uint8Array[] = [];
  for (const sz of substreamSizes) {
    if (dataOffset + sz > transformed.length) {
      throw new Error("Invalid WOFF2 glyf stream");
    }
    substreams.push(transformed.subarray(dataOffset, dataOffset + sz));
    dataOffset += sz;
  }

  let overlapBitmap: Uint8Array | null = null;
  if (hasOverlapBitmap) {
    const len = (numGlyphs + 7) >> 3;
    if (dataOffset + len > transformed.length) {
      throw new Error("Invalid WOFF2 overlap bitmap");
    }
    overlapBitmap = transformed.subarray(dataOffset, dataOffset + len);
  }

  const nContourStream = new Buf(substreams[0]);
  const nPointsStream = new Buf(substreams[1]);
  const flagStream = new Buf(substreams[2]);
  const glyphStream = new Buf(substreams[3]);
  const compositeStream = new Buf(substreams[4]);
  const bboxStream = new Buf(substreams[5]);
  const instructionStream = new Buf(substreams[6]);

  const bboxBitmapLen = ((numGlyphs + 31) >> 5) << 2;
  const bboxBitmap = bboxStream.readBytes(bboxBitmapLen);

  const locaValues = new Array<number>(numGlyphs + 1).fill(0);
  const xMins = new Int16Array(numGlyphs);
  const glyfChunks: Uint8Array[] = [];
  let glyfChecksum = 0 >>> 0;
  let currentGlyfOffset = 0;

  for (let i = 0; i < numGlyphs; i++) {
    const nContours = nContourStream.readU16();
    const haveBbox = (bboxBitmap[i >> 3] & (0x80 >> (i & 7))) !== 0;
    let glyphBytes: Uint8Array | null = null;

    if (nContours === 0xffff) {
      // Composite
      const { size: compositeSize, haveInstructions } = sizeOfComposite(
        new Buf(compositeStream.peekRemaining())
      );
      let instructionSize = 0;
      if (haveInstructions) {
        instructionSize = read255UShort(glyphStream);
      }
      const total =
        12 + compositeSize + instructionSize; // nContours + bbox + composite + instructions
      const out = new Uint8Array(total);
      let off = 0;
      off = store16(nContours, out, off);
      if (!haveBbox) {
        throw new Error("Invalid WOFF2 glyf: composite without bbox");
      }
      const bboxData = bboxStream.readBytes(8);
      const xMinRaw = (bboxData[0] << 8) | bboxData[1];
      xMins[i] = xMinRaw & 0x8000 ? xMinRaw - 0x10000 : xMinRaw;
      out.set(bboxData, off);
      off += 8;
      out.set(compositeStream.readBytes(compositeSize), off);
      off += compositeSize;
      if (haveInstructions) {
        off = store16(instructionSize, out, off);
        out.set(instructionStream.readBytes(instructionSize), off);
      }
      glyphBytes = out;
    } else if (nContours > 0) {
      const nPoints: number[] = [];
      let totalPoints = 0;
      for (let c = 0; c < nContours; c++) {
        const pts = read255UShort(nPointsStream);
        totalPoints += pts;
        nPoints.push(pts);
      }
      const flagData = flagStream.readBytes(totalPoints);
      const tripletsView = glyphStream.peekRemaining();
      const { points, consumed } = tripletDecode(
        flagData,
        tripletsView,
        totalPoints
      );
      glyphStream.offset += consumed;
      const instructionSize = read255UShort(glyphStream);
      const bbox = haveBbox ? bboxStream.readBytes(8) : null;

      // const _baseSize = 12 + 2 * nContours + instructionSize;
      const ptsBuf = storePoints(
        points,
        nContours,
        instructionSize,
        !!(overlapBitmap && (overlapBitmap[i >> 3] & (0x80 >> (i & 7))))
      );
      const glyphBuf = new Uint8Array(ptsBuf.length);
      glyphBuf.set(ptsBuf);

      let off = 0;
      off = store16(nContours, glyphBuf, off);
      if (bbox) {
        glyphBuf.set(bbox, off);
        off += 8;
      } else {
        const [xMin, yMin, xMax, yMax] = computeBBox(points);
        off = store16(xMin, glyphBuf, off);
        off = store16(yMin, glyphBuf, off);
        off = store16(xMax, glyphBuf, off);
        off = store16(yMax, glyphBuf, off);
      }
      let endPoint = -1;
      for (const count of nPoints) {
        endPoint += count;
        off = store16(endPoint, glyphBuf, off);
      }
      off = store16(instructionSize, glyphBuf, off);
      const remaining = instructionStream.peekRemaining().length;
      const safeSize = Math.min(instructionSize, remaining);
      const instructions = instructionStream.readBytes(safeSize);
      glyphBuf.set(instructions, off);

      glyphBytes = glyphBuf;

      const xMinRaw = (glyphBuf[2] << 8) | glyphBuf[3];
      xMins[i] = xMinRaw & 0x8000 ? xMinRaw - 0x10000 : xMinRaw;
    } else {
      // Empty glyph
      if (haveBbox) {
        throw new Error("Invalid WOFF2 glyf: empty glyph with bbox");
      }
      glyphBytes = new Uint8Array(0);
    }

    locaValues[i] = currentGlyfOffset;
    glyfChunks.push(glyphBytes);
    currentGlyfOffset += round4(glyphBytes.length);
    glyfChecksum = (glyfChecksum + computeULongSum(glyphBytes)) >>> 0;
  }

  locaValues[numGlyphs] = currentGlyfOffset;

  if (locaDstLength !== (indexFormat ? 4 : 2) * (numGlyphs + 1)) {
    throw new Error("Invalid WOFF2 loca length");
  }

  // Build glyf table with per-glyph padding
  const glyfSize = locaValues[numGlyphs];
  const glyfData = new Uint8Array(glyfSize);
  let glyfOffset = 0;
  for (const chunk of glyfChunks) {
    glyfData.set(chunk, glyfOffset);
    glyfOffset += chunk.length;
    const padded = round4(glyfOffset) - glyfOffset;
    glyfOffset += padded;
  }

  const loca = storeLoca(locaValues, indexFormat);

  return {
    glyfData,
    locaData: loca.data,
    glyfChecksum,
    locaChecksum: loca.checksum,
    numGlyphs,
    indexFormat,
    xMins
  };
}
