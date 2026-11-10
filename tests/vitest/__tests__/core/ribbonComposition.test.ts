import { describe, expect, it } from "vitest";
import { createTranslator } from "@/i18n/index.js";
import {
  buildRibbonGroups,
  buildRibbonTabDefinitions,
  visibleRibbonItems,
} from "@/ui/components/Toolbar/ribbon/ribbonModel.js";
import type {
  ToolbarActionApi,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";

const t = createTranslator(() => "en");
const api = {
  t,
  commands: { state: () => ({ isEnabled: false, isActive: false }) },
} as unknown as ToolbarActionApi;
const button = (id: string, extras: Partial<ToolbarItem> = {}): ToolbarItem =>
  ({
    type: "button",
    id,
    command: "bold",
    tab: "insert",
    group: "accessibility",
    ...extras,
  }) as ToolbarItem;
const separator = (id: string): ToolbarItem => ({
  type: "separator",
  id,
  tab: "insert",
  group: "accessibility",
});

describe("effective Ribbon composition", () => {
  it("removes a group/tab whose actions are invisible and retains disabled actions", () => {
    const hidden = button("alt", { isVisible: () => false });
    const items = visibleRibbonItems(
      [separator("before"), hidden, separator("after")],
      api,
    );
    expect(buildRibbonGroups(items, "insert", t)).toEqual([]);
    expect(buildRibbonTabDefinitions(t, api, items)).toEqual([]);
    expect(
      buildRibbonGroups(
        visibleRibbonItems([button("disabled")], api),
        "insert",
        t,
      ),
    ).toHaveLength(1);
  });

  it("reevaluates visibility after context changes without mutating registry items", () => {
    let visible = false;
    const original = [button("context", { isVisible: () => visible })];
    expect(visibleRibbonItems(original, api)).toEqual([]);
    visible = true;
    expect(visibleRibbonItems(original, api)).toEqual(original);
    expect(original).toHaveLength(1);
  });

  it("trims edge and duplicate separators in each row after filtering", () => {
    const items = [
      separator("start"),
      button("first"),
      separator("a"),
      button("hidden", { isVisible: () => false }),
      separator("b"),
      button("last"),
      separator("end"),
    ];
    const groups = buildRibbonGroups(
      visibleRibbonItems(items, api),
      "insert",
      t,
    );
    expect(groups[0].rows[1].map((item) => item.id)).toEqual([
      "first",
      "a",
      "last",
    ]);
  });

  it("removes empty nested groups and respects separator visibility", () => {
    const items: ToolbarItem[] = [
      {
        type: "group",
        id: "nested",
        items: [
          button("hidden", { isVisible: () => false }),
          separator("edge"),
        ],
      },
      { ...separator("hidden-separator"), isVisible: () => false },
      button("visible"),
    ];
    expect(visibleRibbonItems(items, api).map((item) => item.id)).toEqual([
      "visible",
    ]);
  });

  it("translates built-in labels and accepts explicit plugin labels with a readable fallback", () => {
    for (const locale of ["en", "pt-BR"] as const) {
      const translate = createTranslator(() => locale);
      const groups = buildRibbonGroups(
        [
          button("header", { group: "headerFooter" }),
          button("sort", { group: "sort" }),
          button("plugin", {
            group: "vendorInternalName",
            groupLabel: "Research tools",
          }),
          button("unknown", { group: "unmappedInternalName" }),
        ],
        "insert",
        translate,
      );
      expect(groups.find((group) => group.id === "headerFooter")?.label).toBe(
        translate("ribbon.group.headerFooter"),
      );
      expect(groups.find((group) => group.id === "sort")?.label).toBe(
        translate("ribbon.group.sort"),
      );
      expect(
        groups.find((group) => group.id === "vendorInternalName")?.label,
      ).toBe("Research tools");
      expect(
        groups.find((group) => group.id === "unmappedInternalName")?.label,
      ).toBe(translate("ribbon.group.general"));
    }
  });
});

describe("declarative Ribbon group layouts", () => {
  it("keeps existing two-row contributions and enables a third row without dropping actions", () => {
    const groups = buildRibbonGroups(
      [
        button("two", { group: "existing", row: 2 }),
        button("three", { group: "new", row: 3 }),
        button("large", { group: "new", ribbonSize: "large" }),
      ],
      "insert",
      t,
    );
    expect(groups.find((group) => group.id === "existing")?.layout).toBe(
      "two-rows",
    );
    const stack = groups.find((group) => group.id === "new")!;
    expect(stack.layout).toBe("three-rows");
    expect(stack.rows[3].map((item) => item.id)).toEqual(["three"]);
    expect(stack.largeItems.map((item) => item.id)).toEqual(["large"]);
  });

  it("accepts an explicit three-row layout even before the final row is populated", () => {
    const groups = buildRibbonGroups(
      [button("stack", { ribbonGroupLayout: "three-rows" })],
      "insert",
      t,
    );
    expect(groups[0].layout).toBe("three-rows");
    expect(groups[0].rows[3]).toEqual([]);
  });
});
