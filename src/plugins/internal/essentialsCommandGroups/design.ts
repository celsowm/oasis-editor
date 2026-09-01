import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import type { EssentialsDesignCapability } from "../essentialsCapabilities.js";

export function buildDesignCommands({
  design,
  actionCommand,
}: {
  design: EssentialsDesignCapability;
  actionCommand: ActionCommandBuilder;
}): NonNullable<OasisPlugin["commands"]> {
  return {
    applyDocumentTheme: actionCommand(
      "applyDocumentTheme",
      (p) => design.applyTheme(String(p) as never),
      () => ({ value: design.getDesign()?.themeId }),
    ),
    setDocumentColorScheme: actionCommand(
      "setDocumentColorScheme",
      (p) => design.setColorScheme(String(p)),
      () => ({ value: design.getDesign()?.colorSchemeId }),
    ),
    setDocumentFontScheme: actionCommand(
      "setDocumentFontScheme",
      (p) => design.setFontScheme(String(p)),
      () => ({ value: design.getDesign()?.fontSchemeId }),
    ),
    setDocumentParagraphSpacing: actionCommand(
      "setDocumentParagraphSpacing",
      (p) => design.setParagraphSpacing(String(p) as never),
      () => ({ value: design.getDesign()?.paragraphSpacingId }),
    ),
    setDocumentEffects: actionCommand(
      "setDocumentEffects",
      (p) => design.setEffects(String(p)),
      () => ({ value: design.getDesign()?.effectsId }),
    ),
    setDocumentPageColor: actionCommand(
      "setDocumentPageColor",
      (p) => design.setPageColor((p as string | null) ?? null),
      () => ({ value: design.getDesign()?.pageColor }),
    ),
    setDocumentWatermark: actionCommand(
      "setDocumentWatermark",
      (p) => design.setWatermark((p as never) ?? null),
      () => ({ value: design.getDesign()?.watermark }),
    ),
    setDocumentPageBorder: actionCommand(
      "setDocumentPageBorder",
      (p) => design.setPageBorder((p as never) ?? null),
      () => ({ value: design.getPageBorder() }),
    ),
    setDocumentDesignDefault: actionCommand("setDocumentDesignDefault", () =>
      design.setDefault(),
    ),
  };
}
