import { describe, expect, it } from "vitest";
import { computeFontFamilyOptions } from "../../ui/app/fontOptions.js";

describe("computeFontFamilyOptions", () => {
  it("includes bundled Open Sans in the fallback font choices", () => {
    const options = computeFontFamilyOptions(undefined, { fontFamily: "" });

    expect(options).toContain("Open Sans, sans-serif");
  });
});
