export const EMU_PER_PX = 9525;
export const EMU_PER_PT = 12700;

export const DOCX_HIGHLIGHT_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  blue: [0, 0, 255],
  cyan: [0, 255, 255],
  green: [0, 128, 0],
  magenta: [255, 0, 255],
  red: [255, 0, 0],
  yellow: [255, 255, 0],
  white: [255, 255, 255],
  darkBlue: [0, 0, 139],
  darkCyan: [0, 139, 139],
  darkGreen: [0, 100, 0],
  darkMagenta: [139, 0, 139],
  darkRed: [139, 0, 0],
  darkYellow: [184, 134, 11],
  darkGray: [169, 169, 169],
  lightGray: [211, 211, 211],
};
export const DOCX_HIGHLIGHT_HEX_ALIASES: Record<string, string> = {
  ffff00: "yellow",
  fef08a: "yellow",
  ff0000: "red",
  "00ff00": "green",
  "0000ff": "blue",
  "00ffff": "cyan",
  ff00ff: "magenta",
  "000000": "black",
  ffffff: "white",
};

export const OOXML_PERCENT_DENOMINATOR = 100000;
export const OOXML_ROTATION_UNITS = 60000;
