import { describe, expect, it } from "vitest";
import { allocateTwoLineGroups } from "@/ui/components/Toolbar/ribbon/TwoLineRibbonPanel.js";

describe("two-line ribbon allocation", () => {
  it("shows all groups when they fit without reserving the menu", () => {
    expect(allocateTwoLineGroups([100, 70], 170, 44)).toEqual([true, true]);
  });
  it("reserves the menu and keeps later groups that fit", () => {
    expect(allocateTwoLineGroups([100, 150, 40], 200, 44)).toEqual([
      true,
      false,
      true,
    ]);
  });
  it("keeps all groups available through overflow at tiny widths", () => {
    expect(allocateTwoLineGroups([100, 60], 30, 44)).toEqual([false, false]);
  });
});
