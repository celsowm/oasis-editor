/**
 * Centralised unit conversions for Oasis Editor.
 *
 * Canonical convention
 * --------------------
 * The document model and runtime layout always use **CSS pixels at 96 DPI**.
 * That means:
 *   - `MarkSet.fontSize`        – px
 *   - `Margins` / `indentation` – px
 *   - `LayoutFragment.rect`     – px
 *   - `TypographyDefaults.*`    – px
 *
 * Conversions to/from foreign units (points, twips, EMUs, OOXML half-points)
 * happen ONLY at I/O boundaries (PDF export, DOCX import/export, etc.).
 *
 * Reference factors
 * -----------------
 *   1 in   = 96 px   = 72 pt    = 1440 twips = 914400 EMU
 *   1 pt   = 96 / 72 px = 4/3 px (≈ 1.3333 px)
 *   1 px   = 0.75 pt   = 15 twips = 9525 EMU
 *   sz/szCs in OOXML are in half-points (1 pt = 2 half-points).
 */

const PX_PER_INCH = 96;
const PT_PER_INCH = 72;
const TWIP_PER_INCH = 1440;
const EMU_PER_INCH = 914400;

/** Convert CSS pixels (96 DPI) to PostScript points (72 DPI). */
export function pxToPt(px: number): number {
  return px * (PT_PER_INCH / PX_PER_INCH); // ×0.75
}

/** Convert PostScript points (72 DPI) to CSS pixels (96 DPI). */
export function ptToPx(pt: number): number {
  return pt * (PX_PER_INCH / PT_PER_INCH); // ×1.3333…
}

/** Convert CSS pixels to twentieths of a point (twips), as used by OOXML. */
export function pxToTwip(px: number): number {
  return Math.round(px * (TWIP_PER_INCH / PX_PER_INCH));
}

/** Convert twips back to CSS pixels. */
export function twipToPx(twip: number): number {
  return twip * (PX_PER_INCH / TWIP_PER_INCH);
}

/** Convert CSS pixels to English Metric Units (EMU), as used by DrawingML. */
export function pxToEmu(px: number): number {
  return Math.round(px * (EMU_PER_INCH / PX_PER_INCH));
}

/** Convert EMU back to CSS pixels. */
export function emuToPx(emu: number): number {
  return emu * (PX_PER_INCH / EMU_PER_INCH);
}

/** Convert CSS pixels to OOXML half-points (used by `w:sz`, `w:szCs`). */
export function pxToHalfPoint(px: number): number {
  return Math.round(pxToPt(px) * 2);
}

/** Convert OOXML half-points to CSS pixels. */
export function halfPointToPx(halfPoint: number): number {
  return ptToPx(halfPoint / 2);
}
