import { describe, expect, it } from "vitest";
import {
  buildRibbonTabDefinitions,
  isRibbonTabVisible,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const t = ((key: string): string => String(key)) as ToolbarActionApi["t"];

/** Minimal api whose `tableContext` reports the given inside-table state. */
function apiInsideTable(inside: boolean): Pick<ToolbarActionApi, "commands"> {
  return {
    commands: {
      state: () => ({ isEnabled: inside, isActive: inside, value: null }),
    },
  } as unknown as Pick<ToolbarActionApi, "commands">;
}

describe("contextual ribbon tabs", () => {
  it("omits the table tabs when no api is supplied", () => {
    const ids = buildRibbonTabDefinitions(t).map((d) => d.id);
    expect(ids).toContain("home");
    expect(ids).not.toContain("tableDesign");
    expect(ids).not.toContain("tableLayout");
  });

  it("omits the table tabs when the caret is not inside a table", () => {
    const ids = buildRibbonTabDefinitions(t, apiInsideTable(false)).map(
      (d) => d.id,
    );
    expect(ids).not.toContain("tableDesign");
    expect(ids).not.toContain("tableLayout");
  });

  it("surfaces both table tabs while inside a table", () => {
    const defs = buildRibbonTabDefinitions(t, apiInsideTable(true));
    const ids = defs.map((d) => d.id);
    expect(ids).toContain("tableDesign");
    expect(ids).toContain("tableLayout");
    expect(defs.find((d) => d.id === "tableDesign")?.contextual).toBe(true);
    expect(defs.find((d) => d.id === "home")?.contextual).toBe(false);
  });

  it("gates only contextual tabs via isRibbonTabVisible", () => {
    expect(isRibbonTabVisible("home")).toBe(true);
    expect(isRibbonTabVisible("tableDesign")).toBe(false);
    expect(isRibbonTabVisible("tableLayout", apiInsideTable(false))).toBe(
      false,
    );
    expect(isRibbonTabVisible("tableDesign", apiInsideTable(true))).toBe(true);
  });
});
