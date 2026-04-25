export type ListFormat =
  | "bullet"
  | "decimal"
  | "lowerLetter"
  | "upperLetter"
  | "lowerRoman"
  | "upperRoman";

const BULLETS = ["•", "○", "▪", "→", "–", "›"];

function numberToLowerLetter(n: number): string {
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function numberToUpperLetter(n: number): string {
  return numberToLowerLetter(n).toUpperCase();
}

function numberToRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  for (const [value, symbol] of map) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

function numberToLowerRoman(n: number): string {
  return numberToRoman(n).toLowerCase();
}

export function getListMarker(
  format: ListFormat,
  index: number,
  level: number = 0,
): string {
  switch (format) {
    case "bullet":
      return BULLETS[level % BULLETS.length] + " ";
    case "decimal":
      return `${index}. `;
    case "lowerLetter":
      return `${numberToLowerLetter(index)}. `;
    case "upperLetter":
      return `${numberToUpperLetter(index)}. `;
    case "lowerRoman":
      return `${numberToLowerRoman(index)}. `;
    case "upperRoman":
      return `${numberToRoman(index)}. `;
    default:
      return `${index}. `;
  }
}

export function getDefaultListFormat(
  kind: "list-item" | "ordered-list-item",
  level: number = 0,
): ListFormat {
  if (kind === "list-item") return "bullet";
  // Cycle through formats for ordered lists by level
  const orderedFormats: ListFormat[] = [
    "decimal",
    "lowerLetter",
    "lowerRoman",
    "upperLetter",
    "upperRoman",
  ];
  return orderedFormats[level % orderedFormats.length];
}
