import type {
  ColorPalette,
  ColorSwatch,
  ThemeColor,
} from "@/ui/components/Toolbar/schema/palette.js";

const THEME_COLORS: ThemeColor[] = [
  {
    name: "White",
    values: ["#ffffff", "#f2f2f2", "#d9d9d9", "#bfbfbf", "#7f7f7f"],
  },
  {
    name: "Black",
    values: ["#000000", "#262626", "#404040", "#595959", "#808080"],
  },
  {
    name: "Blue",
    values: ["#deebf7", "#bdd7ee", "#9dc3e6", "#5b9bd5", "#2f75b5"],
  },
  {
    name: "Orange",
    values: ["#fce4d6", "#f8cbad", "#f4b183", "#ed7d31", "#c55a11"],
  },
  {
    name: "Gray",
    values: ["#e7e6e6", "#d0cece", "#a5a5a5", "#7f7f7f", "#595959"],
  },
  {
    name: "Gold",
    values: ["#fff2cc", "#ffe699", "#ffd966", "#ffc000", "#bf9000"],
  },
  {
    name: "Teal",
    values: ["#d9ead3", "#b6d7a8", "#93c47d", "#70ad47", "#548235"],
  },
  {
    name: "Green",
    values: ["#e2f0d9", "#c5e0b4", "#a9d18e", "#00b050", "#385723"],
  },
  {
    name: "Purple",
    values: ["#e4dfec", "#d9d2e9", "#b4a7d6", "#7030a0", "#4c1d95"],
  },
  {
    name: "Red",
    values: ["#f4cccc", "#ea9999", "#e06666", "#c00000", "#990000"],
  },
];

const STANDARD_COLORS: ColorSwatch[] = [
  { name: "Dark red", value: "#c00000" },
  { name: "Red", value: "#ff0000" },
  { name: "Orange", value: "#ffc000" },
  { name: "Yellow", value: "#ffff00" },
  { name: "Light green", value: "#92d050" },
  { name: "Green", value: "#00b050" },
  { name: "Light blue", value: "#00b0f0" },
  { name: "Blue", value: "#0070c0" },
  { name: "Dark blue", value: "#002060" },
  { name: "Purple", value: "#7030a0" },
];

/** The built-in Word-like color palette. Clients may pass their own. */
export const DEFAULT_PALETTE: ColorPalette = {
  themeColors: THEME_COLORS,
  standardColors: STANDARD_COLORS,
  allowCustom: true,
};
