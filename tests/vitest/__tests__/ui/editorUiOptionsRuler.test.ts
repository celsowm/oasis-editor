import { describe, expect, it } from "vitest";
import { createEditorUiOptions } from "@/ui/app/useEditorUiOptions.js";
import type { OasisEditorAppUiProps } from "@/ui/OasisEditorAppProps.js";
import type { EditorState } from "@/core/model.js";

const optionsFor = (ui: OasisEditorAppUiProps) =>
  createEditorUiOptions({
    ui: () => ui,
    documentOptions: () => ({}),
    updateUiState: () => {},
    state: () => ({}) as EditorState,
  });

describe("ui.showRuler", () => {
  it("defaults to showChrome", () => {
    expect(optionsFor({}).showRuler()).toBe(true);
    expect(optionsFor({ showChrome: false }).showRuler()).toBe(false);
  });

  it("can hide the ruler while keeping the chrome", () => {
    const options = optionsFor({ showChrome: true, showRuler: false });
    expect(options.showChrome()).toBe(true);
    expect(options.showRuler()).toBe(false);
  });
});
