export interface ColorSwatch {
  color: string;
  name: string;
}

export const THEME_COLORS: ColorSwatch[][] = [
  // White, Black, Grays
  [
    { color: "#FFFFFF", name: "White" },
    { color: "#000000", name: "Black" },
    { color: "#E7E6E6", name: "Gray-25" },
    { color: "#44546A", name: "Blue-Gray" },
    { color: "#4472C4", name: "Blue" },
    { color: "#ED7D31", name: "Orange" },
    { color: "#A5A5A5", name: "Gray" },
    { color: "#FFC000", name: "Gold" },
    { color: "#5B9BD5", name: "Light Blue" },
    { color: "#70AD47", name: "Green" },
  ],
  // Tints/Shades Row 1 (Lighter)
  [
    { color: "#F2F2F2", name: "White-Shade 1" },
    { color: "#7F7F7F", name: "Black-Shade 1" },
    { color: "#D0CECE", name: "Gray-25-Shade 1" },
    { color: "#D6DCE4", name: "Blue-Gray-Shade 1" },
    { color: "#D9E1F2", name: "Blue-Shade 1" },
    { color: "#FBE5D5", name: "Orange-Shade 1" },
    { color: "#EDEDED", name: "Gray-Shade 1" },
    { color: "#FFF2CC", name: "Gold-Shade 1" },
    { color: "#DEEAF6", name: "Light Blue-Shade 1" },
    { color: "#E2EFD9", name: "Green-Shade 1" },
  ],
  // Tints/Shades Row 2
  [
    { color: "#D8D8D8", name: "White-Shade 2" },
    { color: "#595959", name: "Black-Shade 2" },
    { color: "#AEAAAA", name: "Gray-25-Shade 2" },
    { color: "#ADB9CA", name: "Blue-Gray-Shade 2" },
    { color: "#B4C6E7", name: "Blue-Shade 2" },
    { color: "#F7CBAC", name: "Orange-Shade 2" },
    { color: "#DBDBDB", name: "Gray-Shade 2" },
    { color: "#FFE599", name: "Gold-Shade 2" },
    { color: "#BDD7EE", name: "Light Blue-Shade 2" },
    { color: "#C5E0B3", name: "Green-Shade 2" },
  ],
  // Tints/Shades Row 3
  [
    { color: "#BFBFBF", name: "White-Shade 3" },
    { color: "#3F3F3F", name: "Black-Shade 3" },
    { color: "#757070", name: "Gray-25-Shade 3" },
    { color: "#8496B0", name: "Blue-Gray-Shade 3" },
    { color: "#8EA9DB", name: "Blue-Shade 3" },
    { color: "#F4B083", name: "Orange-Shade 3" },
    { color: "#C9C9C9", name: "Gray-Shade 3" },
    { color: "#FFD965", name: "Gold-Shade 3" },
    { color: "#9BC2E6", name: "Light Blue-Shade 3" },
    { color: "#A8D08D", name: "Green-Shade 3" },
  ],
  // Tints/Shades Row 4 (Darker)
  [
    { color: "#A5A5A5", name: "White-Shade 4" },
    { color: "#262626", name: "Black-Shade 4" },
    { color: "#3A3838", name: "Gray-25-Shade 4" },
    { color: "#323F4F", name: "Blue-Gray-Shade 4" },
    { color: "#2F5496", name: "Blue-Shade 4" },
    { color: "#C45911", name: "Orange-Shade 4" },
    { color: "#7B7B7B", name: "Gray-Shade 4" },
    { color: "#BF8F00", name: "Gold-Shade 4" },
    { color: "#2E75B5", name: "Light Blue-Shade 4" },
    { color: "#538135", name: "Green-Shade 4" },
  ],
  // Tints/Shades Row 5 (Darkest)
  [
    { color: "#7B7B7B", name: "White-Shade 5" },
    { color: "#0C0C0C", name: "Black-Shade 5" },
    { color: "#171616", name: "Gray-25-Shade 5" },
    { color: "#222B35", name: "Blue-Gray-Shade 5" },
    { color: "#1E3862", name: "Blue-Shade 5" },
    { color: "#833C0B", name: "Orange-Shade 5" },
    { color: "#525252", name: "Gray-Shade 5" },
    { color: "#7F5F00", name: "Gold-Shade 5" },
    { color: "#1E4E79", name: "Light Blue-Shade 5" },
    { color: "#375623", name: "Green-Shade 5" },
  ],
];

export const STANDARD_COLORS: ColorSwatch[] = [
  { color: "#C00000", name: "Dark Red" },
  { color: "#FF0000", name: "Red" },
  { color: "#FFC000", name: "Gold" },
  { color: "#FFFF00", name: "Yellow" },
  { color: "#92D050", name: "Light Green" },
  { color: "#00B050", name: "Green" },
  { color: "#00B0F0", name: "Light Blue" },
  { color: "#0070C0", name: "Blue" },
  { color: "#002060", name: "Dark Blue" },
  { color: "#7030A0", name: "Purple" },
];
