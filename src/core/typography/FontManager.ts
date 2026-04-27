export interface BlockTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
}

export interface IFontManager {
  resolveFontFamily(requestedFamily?: string): string;
  getDefaultFont(blockKind: string, isHeading?: boolean): string;
  getTypographyForBlock(blockKind: string): BlockTypography;
  getAvailableFonts(): string[];
}

export class DefaultFontManager implements IFontManager {
  private readonly availableFonts: string[] = [
    "Roboto",
    "Inter",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Cambria Math",
  ];

  private readonly fontMappings: Record<string, BlockTypography> = {
    paragraph: { fontFamily: "Roboto", fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    heading: { fontFamily: "Roboto", fontSize: 24, fontWeight: 700, lineHeight: 1.2 },
    "list-item": { fontFamily: "Roboto", fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    "ordered-list-item": { fontFamily: "Roboto", fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    table: { fontFamily: "Roboto", fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    math: { fontFamily: "Cambria Math, Latin Modern Math, serif", fontSize: 18, fontWeight: 400, lineHeight: 1.2 },
    chart: { fontFamily: "Roboto", fontSize: 14, fontWeight: 400, lineHeight: 1.2 },
    footnote: { fontFamily: "Roboto", fontSize: 12, fontWeight: 400, lineHeight: 1.2 },
    "page-break": { fontFamily: "Roboto", fontSize: 0, fontWeight: 0, lineHeight: 0 },
  };

  resolveFontFamily(requestedFamily?: string): string {
    return requestedFamily || "Roboto";
  }

  getDefaultFont(blockKind: string, isHeading: boolean = false): string {
    if (isHeading) return "Roboto";
    return this.fontMappings[blockKind]?.fontFamily || "Roboto";
  }

  getTypographyForBlock(blockKind: string): BlockTypography {
    return (
      this.fontMappings[blockKind] || {
        fontFamily: "Roboto",
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.5,
      }
    );
  }

  getAvailableFonts(): string[] {
    return [...this.availableFonts];
  }
}
