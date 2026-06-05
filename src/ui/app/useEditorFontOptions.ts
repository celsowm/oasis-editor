import { createSignal } from "solid-js";
import type { EditorState } from "../../core/model.js";
import type { ToolbarStyleState } from "../toolbarStyleState.js";
import {
  computeFontFamilyOptions as collectFontFamilyOptions,
  computeFontSizeOptions as collectFontSizeOptions,
} from "./fontOptions.js";

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

  const loadLocalFontFamilyOptions = async () => {
    const maybeQueryLocalFonts = (
      globalThis as {
        queryLocalFonts?: () => Promise<
          Array<{ family?: string; fullName?: string }>
        >;
      }
    ).queryLocalFonts;
    if (!maybeQueryLocalFonts || localFontFamilyOptions().length > 0) {
      return;
    }
    try {
      const fonts = await maybeQueryLocalFonts();
      const families = Array.from(
        new Set(
          fonts
            .map((font) => font.family?.trim() || font.fullName?.trim() || "")
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
      setLocalFontFamilyOptions(families);
    } catch {
      // Local font access is permission-gated; the fallback list remains available.
    }
  };

  return {
    computeFontFamilyOptions,
    computeFontSizeOptions,
    loadLocalFontFamilyOptions,
  };
}
