import { createSignal } from "solid-js";
import type { EditorState } from "@/core/model.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import {
  computeFontFamilyOptions as collectFontFamilyOptions,
  computeFontSizeOptions as collectFontSizeOptions,
} from "./fontOptions.js";
import { probeLocalFontFamilies } from "./localFontAccess.js";

export interface EditorFontOptionsContext {
  state: () => EditorState;
  toolbarStyleState: () => ToolbarStyleState;
}

/**
 * Owns the font-family / font-size option lists offered by the toolbar and font
 * dialog, including the lazily-loaded local font catalogue. Keeps the local-font
 * permission probe and its cache signal out of the composition root.
 */
export function createEditorFontOptions(ctx: EditorFontOptionsContext) {
  const [localFontFamilyOptions, setLocalFontFamilyOptions] = createSignal<
    string[]
  >([]);

  const computeFontFamilyOptions = (): string[] =>
    collectFontFamilyOptions(
      ctx.state().document,
      ctx.toolbarStyleState(),
      localFontFamilyOptions(),
    );

  const computeFontSizeOptions = (): number[] =>
    collectFontSizeOptions(ctx.state().document, ctx.toolbarStyleState());

  const loadLocalFontFamilyOptions = async (): Promise<void> => {
    if (localFontFamilyOptions().length > 0) {
      return;
    }
    // Shares the single cached `queryLocalFonts` probe with precise font mode;
    // returns [] (and the fallback list stays) when unsupported or denied.
    const families = await probeLocalFontFamilies();
    if (families.length > 0) {
      setLocalFontFamilyOptions(families);
    }
  };

  return {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    loadLocalFontFamilyOptions,
  };
}
