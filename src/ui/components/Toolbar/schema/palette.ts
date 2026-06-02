export interface ColorSwatch {
  name: string;
  value: string;
}

export interface ThemeColor {
  name: string;
  /** Shades from lightest to darkest, rendered as a vertical column. */
  values: string[];
}

export interface ColorPalette {
  themeColors: ThemeColor[];
  standardColors: ColorSwatch[];
  /** Show the native `<input type="color">` "more colors" action. Default true. */
  allowCustom?: boolean;
}
