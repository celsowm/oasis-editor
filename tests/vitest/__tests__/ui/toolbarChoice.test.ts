import { describe, expect, it } from "vitest";
import { createRoot } from "solid-js";
import { toolbarChoice } from "@/ui/components/Toolbar/state/toolbarChoice.js";

describe("toolbar choices", () => {
  it("survives control disposal while isolating editors and controls", () => {
    const owner = {},
      otherEditor = {};
    createRoot((dispose) => {
      const [, set] = toolbarChoice(owner, "color:font", "#000000");
      set("#0070c0");
      dispose();
    });
    expect(toolbarChoice(owner, "color:font", "#000000")[0]()).toBe("#0070c0");
    expect(toolbarChoice(otherEditor, "color:font", "#000000")[0]()).toBe(
      "#000000",
    );
    expect(toolbarChoice(owner, "color:highlight", "#ffff00")[0]()).toBe(
      "#ffff00",
    );
  });
});
