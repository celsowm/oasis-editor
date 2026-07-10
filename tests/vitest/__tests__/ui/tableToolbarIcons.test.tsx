import { describe, expect, it } from "vitest";
import { getCustomIcon } from "@/ui/utils/customIcons.js";
import { TABLE_LAYOUT_BUTTONS } from "@/ui/components/Toolbar/presets/defaultToolbar/buttonSpecs.js";

describe("table ribbon icons", () => {
  it("uses a dedicated SVG for every Table Layout command", () => {
    for (const button of TABLE_LAYOUT_BUTTONS) {
      expect(getCustomIcon(button.icon)).toBeTypeOf("function");
    }
  });

  it("registers dedicated SVGs for the remaining table ribbon controls", () => {
    for (const icon of [
      "tableDistributeRows",
      "tableDistributeColumns",
      "tableAutoFit",
      "tableBorders",
      "tableNoBorders",
    ]) {
      expect(getCustomIcon(icon)).toBeTypeOf("function");
    }
  });
});
