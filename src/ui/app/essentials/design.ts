import {
  applyDocumentTheme,
  setDocumentDesign,
  setDocumentColorScheme,
  setDocumentPageBorder,
  setDocumentPageColor,
  setDocumentWatermark,
  setDocumentFontScheme,
  setDocumentParagraphSpacing,
  type DesignThemeId,
} from "@/core/commands/design.js";
import type {
  EditorPageBorder,
  EditorState,
  EditorWatermark,
} from "@/core/model.js";
import type { EssentialsDesignCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

const DEFAULT_DESIGN_KEY = "oasis-design-default";

export function buildEssentialsDesign(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsDesignCapability {
  const apply = (producer: (state: EditorState) => EditorState): void =>
    options.applyTransactionalState(producer);
  return {
    applyTheme: (theme: DesignThemeId): void =>
      apply((state) => applyDocumentTheme(state, theme)),
    setColorScheme: (value: string): void =>
      apply((state) => setDocumentColorScheme(state, value)),
    setFontScheme: (value: string): void =>
      apply((state) => setDocumentFontScheme(state, value)),
    setParagraphSpacing: (value): void =>
      apply((state) => setDocumentParagraphSpacing(state, value)),
    setEffects: (value: string): void =>
      apply((state) =>
        setDocumentDesign(state, {
          effectsId: value,
          themeData: {
            ...(state.document.design?.themeData ?? {}),
            sourceXml: undefined,
            effectsXml: undefined,
          },
        }),
      ),
    setPageColor: (value: string | null): void =>
      apply((state) => setDocumentPageColor(state, value)),
    setWatermark: (value: EditorWatermark | null): void =>
      apply((state) => setDocumentWatermark(state, value)),
    setPageBorder: (value: EditorPageBorder | null): void =>
      apply((state) => setDocumentPageBorder(state, value)),
    setDefault: (): void => {
      const design = options.state().document.design;
      if (design)
        globalThis.localStorage?.setItem(
          DEFAULT_DESIGN_KEY,
          JSON.stringify(design),
        );
    },
    getDesign: () => options.state().document.design,
    getPageBorder: () =>
      options.state().document.sections?.find((section) => section.pageBorder)
        ?.pageBorder,
  };
}
