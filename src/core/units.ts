// Canonical unit-conversion constants. Single source of truth for the pure
// numeric factors that were previously redefined across the layout, canvas,
// import and export layers (audit U1). Layer-specific modules re-export these
// under their established names; only format-specific constants (OOXML/VML/
// DOCX) stay in their own modules.
//
// CSS reference: 96 device pixels per inch, 72 typographic points per inch.

/** CSS device pixels per inch. */
export const PX_PER_INCH = 96;

/** Typographic points per inch. */
export const POINTS_PER_INCH = 72;

/** CSS pixels per typographic point (96 / 72). Also the point→px factor. */
export const PX_PER_POINT = PX_PER_INCH / POINTS_PER_INCH;

/** Typographic points per CSS pixel (72 / 96). Inverse of {@link PX_PER_POINT}. */
export const PT_PER_PX = POINTS_PER_INCH / PX_PER_INCH;

/** CSS pixels per centimetre (96 / 2.54 ≈ 37.795). */
export const PX_PER_CM = PX_PER_INCH / 2.54;

/** English Metric Units per CSS pixel (OOXML drawing geometry). */
export const EMU_PER_PX = 9525;

/** English Metric Units per typographic point. */
export const EMU_PER_PT = 12700;

/** Twentieths of a point ("twips") per inch. */
export const TWIPS_PER_INCH = 1440;

/** Twentieths of a point ("twips") per typographic point. */
export const TWIPS_PER_POINT = 20;
