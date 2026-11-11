import { describe, expect, it } from "vitest";
import { CONTEXTUAL_TABS } from "@/core/pluginUiTypes.js";
import {
  resolveContextualTabTransition,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type { RibbonTabId } from "@/ui/components/Toolbar/schema/items.js";

// Mirrors the Toolbar's entry order, so shared gates resolve deterministically.
const ENTRIES = Object.entries(CONTEXTUAL_TABS) as Array<
  [RibbonTabId, string]
>;

const snap = (
  tableContext: boolean,
  imageContext: boolean,
): Map<string, boolean> =>
  new Map([
    ["tableContext", tableContext],
    ["imageContext", imageContext],
  ]);

describe("contextual tab transitions", () => {
  it("activates the first contextual tab whose gate becomes active", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "home",
        snap(false, false),
        snap(true, false),
      ),
    ).toBe("tableDesign");
  });

  it("activates the image tab when only the image gate becomes active", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "home",
        snap(false, false),
        snap(false, true),
      ),
    ).toBe("imageFormat");
  });

  it("keeps the current tab when no gate changed", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "home",
        snap(true, false),
        snap(true, false),
      ),
    ).toBeNull();
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "review",
        snap(false, false),
        snap(false, false),
      ),
    ).toBeNull();
  });

  it("keeps a still-active contextual tab", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "tableLayout",
        snap(true, false),
        snap(true, false),
      ),
    ).toBeNull();
  });

  it("leaves a hidden contextual tab for Home", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "tableLayout",
        snap(true, false),
        snap(false, false),
      ),
    ).toBe("home");
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "imageFormat",
        snap(false, true),
        snap(false, false),
      ),
    ).toBe("home");
  });

  it("keeps a non-contextual tab when a context ends", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "review",
        snap(true, false),
        snap(false, false),
      ),
    ).toBeNull();
  });

  it("switches directly between contexts without visiting Home", () => {
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "tableDesign",
        snap(true, false),
        snap(false, true),
      ),
    ).toBe("imageFormat");
    expect(
      resolveContextualTabTransition(
        ENTRIES,
        "imageFormat",
        snap(false, true),
        snap(true, false),
      ),
    ).toBe("tableDesign");
  });
});
