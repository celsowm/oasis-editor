import { describe, expect, it } from "vitest";
import {
  buildRibbonGroups,
  resolveResponsiveRibbonGroups,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type { RibbonGroupWidth } from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import { createTranslator } from "@/i18n/index.js";
import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";

const t = createTranslator(() => "en");
const groups = buildRibbonGroups(
  ["clipboard", "font", "paragraph", "styles", "editing"].map(
    (group): ToolbarItem => ({
      id: group,
      type: "button",
      command: "bold",
      tab: "home",
      group,
    }),
  ),
  "home",
  t,
);
const measurements: Record<string, RibbonGroupWidth> = {
  clipboard: { full: 240, compact: 125, collapsed: 73 },
  font: { full: 406, compact: 398, collapsed: 74 },
  paragraph: { full: 239, compact: 230, collapsed: 74 },
  styles: { full: 659, compact: 143, collapsed: 73 },
  editing: { full: 176, compact: 43, collapsed: 73 },
};
const rank = { full: 0, compact: 1, collapsed: 2 };

describe("measured Ribbon reduction policy", () => {
  it("never restores a group or adds gallery cards as the budget shrinks", () => {
    let previous = resolveResponsiveRibbonGroups(groups, 2000, measurements);
    for (let width = 1999; width >= 300; width--) {
      const next = resolveResponsiveRibbonGroups(groups, width, measurements);
      next.forEach((group, index) => {
        expect(rank[group.resizeState]).toBeGreaterThanOrEqual(
          rank[previous[index].resizeState],
        );
        expect(group.measuredWidth!).toBeLessThanOrEqual(
          previous[index].measuredWidth!,
        );
      });
      const total = next.reduce((sum, group) => sum + group.measuredWidth!, 0);
      if (width >= 337) expect(total).toBeLessThanOrEqual(width);
      previous = next;
    }
  });

  it("uses the same arrangement for direct, shrinking and expanding budgets", () => {
    const widths = [1440, 1200, 960, 800, 640];
    const direct = widths.map((width) =>
      resolveResponsiveRibbonGroups(groups, width, measurements),
    );
    [...widths].reverse().forEach((width) => {
      expect(
        resolveResponsiveRibbonGroups(groups, width, measurements),
      ).toEqual(direct[widths.indexOf(width)]);
    });
  });

  it("honors measured full widths even when a coarse estimate is larger", () => {
    const group = buildRibbonGroups(
      Array.from({ length: 10 }, (_, index): ToolbarItem => ({
        type: "button",
        id: String(index),
        command: "bold",
        tab: "home",
        group: "font",
        ribbonSize: "large",
      })),
      "home",
      t,
    );
    expect(
      resolveResponsiveRibbonGroups(group, 200, { font: { full: 180 } })[0]
        .resizeState,
    ).toBe("full");
  });

  it("skips a compact state with no saving and retains every group below the minimum", () => {
    const group = buildRibbonGroups(
      [
        {
          type: "button",
          id: "plugin",
          command: "bold",
          group: "general",
          tab: "plugins",
        },
      ],
      "plugins",
      t,
    );
    const result = resolveResponsiveRibbonGroups(group, 30, {
      general: { full: 100, compact: 100, collapsed: 68 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].resizeState).toBe("collapsed");
    expect(result[0].measuredWidth).toBe(68);
  });

  it("uses explicit priorities before position within a reduction stage", () => {
    const group = buildRibbonGroups(
      ["font", "paragraph"].map((id, index): ToolbarItem => ({
        type: "button",
        id,
        command: "bold",
        group: id,
        tab: "home",
        ribbonGroupResize: {
          states: ["full", "compact", "collapsed"],
          priority: index ? 99 : 1,
        },
      })),
      "home",
      t,
    );
    const result = resolveResponsiveRibbonGroups(group, 170, {
      font: { full: 100, compact: 70, collapsed: 50 },
      paragraph: { full: 100, compact: 70, collapsed: 50 },
    });
    expect(result.map((item) => item.resizeState)).toEqual(["compact", "full"]);
  });
  it("includes measured gallery chrome when allocating whole cards", () => {
    const gallery = buildRibbonGroups(
      [
        {
          type: "styleGallery",
          id: "gallery",
          tab: "home",
          group: "styles",
          ribbonSize: "large",
          styles: () => [],
          paragraphCommand: "setStyleId",
          characterCommand: "setCharacterStyleId",
        },
      ],
      "home",
      t,
    );
    const result = resolveResponsiveRibbonGroups(gallery, 300, {
      styles: { full: 500, compact: 173, collapsed: 73, compactChrome: 41 },
    })[0];
    expect(result.compactChrome).toBe(41);
    expect(result.allocatedWidth).toBe(279);
  });
});
