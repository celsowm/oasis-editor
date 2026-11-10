import { describe, expect, it } from "vitest";
import { normalizeOpaqueRgbColor } from "@/core/color.js";

describe("opaque sRGB color normalization", () => {
  it.each([
    ["#F03", "FF0033"],
    ["#f03f", "FF0033"],
    ["#FF0033ff", "FF0033"],
    ["ff0033", "FF0033"],
    ["rgb(255, 0, 51)", "FF0033"],
    ["rgb(100%,0%,20%)", "FF0033"],
    ["RGB(255 0 51 / 100%)", "FF0033"],
    ["rgba(255,0,51,1)", "FF0033"],
    ["rgba(255 0% 51 / 1)", "FF0033"],
    ["rgb(300 -20 127.5)", "FF0080"],
    ["rgb(1e2 0 0)", "640000"],
  ])("normalizes %s", (value, hex) =>
    expect(normalizeOpaqueRgbColor(value)).toBe(hex),
  );
  it.each([
    "#ff003380",
    "#f038",
    "rgba(255,0,0,.5)",
    "rgb(0 0 0 / 50%)",
    "rgb(0, 0%, 0)",
    "rgb(0 0)",
    "rgb(0 0 0 /)",
    "rgb(1e999 0 0)",
    "rgb(255 0 0) trailing",
    "currentColor",
    "color(display-p3 1 0 0)",
  ])("leaves unsupported/translucent/malformed %s unresolved", (value) =>
    expect(normalizeOpaqueRgbColor(value)).toBeNull(),
  );
});
