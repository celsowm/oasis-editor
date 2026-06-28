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

/**
 * OOXML thousandths-of-a-percent denominator (`100000` == 100%). Used by both
 * the DOCX import and export paths to convert alpha/position percentages.
 */
export const OOXML_PERCENT_DENOMINATOR = 100000;

/** OOXML angle units (60000ths of a degree). */
export const OOXML_ROTATION_UNITS = 60000;

/**
 * Default document font size in CSS pixels: 11pt (the Calibri default used by
 * Word) expressed as `11 * 96 / 72 ≈ 14.6667`. Single source of truth for the
 * value that was previously redefined across the core, layout, canvas, import,
 * export and testing layers (audit #1). Kept as the historical rounded literal
 * `14.6667` so layout measurements remain byte-identical.
 */
export const DEFAULT_FONT_SIZE_PX = 14.6667;
