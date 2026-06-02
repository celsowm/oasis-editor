import type { EditorTextStyle } from "./model.js";

export type UnderlineStyle = EditorTextStyle["underlineStyle"];

export function underlineStyleToCssDecorationStyle(
  underlineStyle: UnderlineStyle,
): string | null {
  switch (underlineStyle) {
    case "double":
    case "wavyDouble":
      return "double";
    case "dotted":
    case "dottedHeavy":
      return "dotted";
    case "dash":
    case "dashedHeavy":
    case "dashLong":
    case "dashLongHeavy":
    case "dotDash":
    case "dashDotHeavy":
    case "dotDotDash":
    case "dashDotDotHeavy":
      return "dashed";
    case "wave":
    case "wavyHeavy":
      return "wavy";
    default:
      return null;
  }
}

export function isDoubleUnderlineStyle(underlineStyle: UnderlineStyle): boolean {
  return underlineStyle === "double" || underlineStyle === "wavyDouble";
}

export function isWavyUnderlineStyle(underlineStyle: UnderlineStyle): boolean {
  return underlineStyle === "wave" || underlineStyle === "wavyHeavy";
}

export function underlineStyleLineWidthPx(underlineStyle: UnderlineStyle): number {
  switch (underlineStyle) {
    case "thick":
    case "dashedHeavy":
    case "dashLongHeavy":
    case "dashDotHeavy":
    case "dashDotDotHeavy":
    case "dottedHeavy":
    case "wavyHeavy":
      return 2;
    default:
      return 1;
  }
}

export function underlineStyleDashArray(underlineStyle: UnderlineStyle): number[] | undefined {
  switch (underlineStyle) {
    case "dotted":
    case "dottedHeavy":
      return [1.5, 2.5];
    case "dash":
    case "dashedHeavy":
      return [4, 3];
    case "dashLong":
    case "dashLongHeavy":
      return [8, 3];
    case "dotDash":
    case "dashDotHeavy":
      return [4, 2, 1, 2];
    case "dotDotDash":
    case "dashDotDotHeavy":
      return [4, 2, 1, 2, 1, 2];
    default:
      return undefined;
  }
}
