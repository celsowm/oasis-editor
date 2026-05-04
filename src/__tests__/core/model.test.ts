import { describe, expect, it } from "vitest";
import {
  resolveNamedTextStyle,
  resolveNamedParagraphStyle,
  resolveEffectiveTextStyle,
  resolveEffectiveParagraphStyle,
  EFFECTIVE_TEXT_STYLE_DEFAULTS,
  EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS,
} from "../../core/model.js";

const BASE_STYLES = {
  Normal: {
    id: "Normal",
    name: "Normal",
    type: "paragraph" as const,
    paragraphStyle: {
      lineHeight: 1.6,
      spacingAfter: 10,
    },
    textStyle: {
      fontSize: 20,
      fontFamily: "Calibri",
    },
  },
  Heading1: {
    id: "Heading1",
    name: "Heading 1",
    type: "paragraph" as const,
    basedOn: "Normal",
    paragraphStyle: {
      lineHeight: 1.2,
      spacingBefore: 24,
      spacingAfter: 12,
    },
    textStyle: {
      bold: true,
      fontSize: 28,
    },
  },
  Heading2: {
    id: "Heading2",
    name: "Heading 2",
    type: "paragraph" as const,
    basedOn: "Heading1",
    paragraphStyle: {
      lineHeight: 1.3,
      spacingBefore: 18,
    },
    textStyle: {
      fontSize: 24,
    },
  },
  CharBold: {
    id: "CharBold",
    name: "Bold Character",
    type: "character" as const,
    basedOn: "Normal",
    textStyle: {
      bold: true,
    },
  },
};

describe("resolveNamedParagraphStyle", () => {
  it("returns empty object for undefined styleId", () => {
    expect(resolveNamedParagraphStyle(undefined, BASE_STYLES)).toEqual({});
  });

  it("returns empty object for undefined styles registry", () => {
    expect(resolveNamedParagraphStyle("Normal", undefined)).toEqual({});
  });

  it("returns empty object for unknown styleId", () => {
    expect(resolveNamedParagraphStyle("Unknown", BASE_STYLES)).toEqual({});
  });

  it("resolves a flat style with no basedOn", () => {
    const result = resolveNamedParagraphStyle("Normal", BASE_STYLES);
    expect(result.lineHeight).toBe(1.6);
    expect(result.spacingAfter).toBe(10);
  });

  it("resolves a style inheriting from a parent via basedOn", () => {
    const result = resolveNamedParagraphStyle("Heading1", BASE_STYLES);
    expect(result.lineHeight).toBe(1.2); // own
    expect(result.spacingAfter).toBe(12); // own override
    expect(result.spacingBefore).toBe(24); // own
  });

  it("resolves a deep inheritance chain (Heading2 → Heading1 → Normal)", () => {
    const result = resolveNamedParagraphStyle("Heading2", BASE_STYLES);
    expect(result.lineHeight).toBe(1.3); // own override
    expect(result.spacingBefore).toBe(18); // own
    expect(result.spacingAfter).toBe(12); // inherited from Heading1
  });

  it("resolves paragraph style even for character-type named styles (falls through)", () => {
    const result = resolveNamedParagraphStyle("CharBold", BASE_STYLES);
    expect(result.lineHeight).toBe(1.6); // inherited from Normal via basedOn
  });
});

describe("resolveNamedTextStyle", () => {
  it("returns empty object for undefined styleId", () => {
    expect(resolveNamedTextStyle(undefined, BASE_STYLES)).toEqual({});
  });

  it("returns empty object for undefined styles registry", () => {
    expect(resolveNamedTextStyle("Normal", undefined)).toEqual({});
  });

  it("resolves a flat style with no basedOn", () => {
    const result = resolveNamedTextStyle("Normal", BASE_STYLES);
    expect(result.fontSize).toBe(20);
    expect(result.fontFamily).toBe("Calibri");
  });

  it("resolves a style with basedOn inheritance", () => {
    const result = resolveNamedTextStyle("Heading1", BASE_STYLES);
    expect(result.bold).toBe(true);
    expect(result.fontSize).toBe(28); // own
    expect(result.fontFamily).toBe("Calibri"); // inherited from Normal
  });

  it("resolves deep inheritance (Heading2 → Heading1 → Normal)", () => {
    const result = resolveNamedTextStyle("Heading2", BASE_STYLES);
    expect(result.fontSize).toBe(24); // own override
    expect(result.bold).toBe(true); // inherited from Heading1
    expect(result.fontFamily).toBe("Calibri"); // inherited from Normal
  });

  it("resolves character style with basedOn", () => {
    const result = resolveNamedTextStyle("CharBold", BASE_STYLES);
    expect(result.bold).toBe(true);
    expect(result.fontSize).toBe(20); // inherited from Normal
    expect(result.fontFamily).toBe("Calibri"); // inherited from Normal
  });

  it("empty styles registry returns {}", () => {
    expect(resolveNamedTextStyle("Normal", {})).toEqual({});
  });
});

describe("resolveEffectiveTextStyle", () => {
  it("returns defaults when no style and no styles registry are provided", () => {
    const result = resolveEffectiveTextStyle(undefined, undefined);
    expect(result.bold).toBe(false);
    expect(result.fontSize).toBe(20);
    expect(result.fontFamily).toBe("Arial");
  });

  it("returns defaults when run has no style and no styleId", () => {
    const result = resolveEffectiveTextStyle({}, BASE_STYLES);
    expect(result.bold).toBe(false);
    expect(result.fontSize).toBe(20);
  });

  it("resolves named style and fills defaults", () => {
    const result = resolveEffectiveTextStyle({ styleId: "Heading1" }, BASE_STYLES);
    expect(result.bold).toBe(true); // from Heading1
    expect(result.fontSize).toBe(28); // from Heading1
    expect(result.fontFamily).toBe("Calibri"); // inherited from Normal
  });

  it("local override takes precedence over named style", () => {
    const result = resolveEffectiveTextStyle(
      { styleId: "Heading1", fontSize: 18 },
      BASE_STYLES,
    );
    expect(result.fontSize).toBe(18); // local override
    expect(result.bold).toBe(true); // still from Heading1
  });

  it("undefined in local does NOT override the resolved value (inherit)", () => {
    const result = resolveEffectiveTextStyle(
      { styleId: "Heading1", fontSize: undefined },
      BASE_STYLES,
    );
    expect(result.fontSize).toBe(28); // inherited from Heading1, not overwritten by undefined
  });

  it("null in local is kept as null (reset signal for caller)", () => {
    const result = resolveEffectiveTextStyle(
      { styleId: "Normal", fontFamily: null },
      BASE_STYLES,
    );
    expect(result.fontFamily).toBeNull(); // null preserved, meaning "reset"
  });

  it("deep inheritance chain resolves fully", () => {
    const result = resolveEffectiveTextStyle({ styleId: "Heading2" }, BASE_STYLES);
    expect(result.bold).toBe(true); // from Heading1
    expect(result.fontSize).toBe(24); // from Heading2
    expect(result.fontFamily).toBe("Calibri"); // from Normal
  });

  it("character style with basedOn resolves correctly", () => {
    const result = resolveEffectiveTextStyle({ styleId: "CharBold" }, BASE_STYLES);
    expect(result.bold).toBe(true); // from CharBold
    expect(result.fontSize).toBe(20); // inherited from Normal
    expect(result.fontFamily).toBe("Calibri"); // inherited from Normal
  });
});

describe("resolveEffectiveParagraphStyle", () => {
  it("returns defaults when no style and no styles registry", () => {
    const result = resolveEffectiveParagraphStyle(undefined, undefined);
    expect(result.align).toBe("left");
    expect(result.lineHeight).toBe(1.6);
    expect(result.spacingBefore).toBe(0);
    expect(result.pageBreakBefore).toBe(false);
  });

  it("resolves named paragraph style and fills defaults", () => {
    const result = resolveEffectiveParagraphStyle({ styleId: "Heading1" }, BASE_STYLES);
    expect(result.lineHeight).toBe(1.2); // from Heading1
    expect(result.spacingBefore).toBe(24); // from Heading1
    expect(result.spacingAfter).toBe(12); // from Heading1 (overrides Normal's 10)
    expect(result.align).toBe("left"); // default
  });

  it("local override takes precedence over named style", () => {
    const result = resolveEffectiveParagraphStyle(
      { styleId: "Heading1", spacingBefore: 99 },
      BASE_STYLES,
    );
    expect(result.spacingBefore).toBe(99);
    expect(result.lineHeight).toBe(1.2); // still from Heading1
  });

  it("undefined in local does NOT override the resolved value", () => {
    const result = resolveEffectiveParagraphStyle(
      { styleId: "Heading1", spacingBefore: undefined },
      BASE_STYLES,
    );
    expect(result.spacingBefore).toBe(24); // inherited from Heading1
  });

  it("null in local is kept as null (reset signal)", () => {
    const result = resolveEffectiveParagraphStyle(
      { styleId: "Normal", lineHeight: null },
      BASE_STYLES,
    );
    expect(result.lineHeight).toBeNull();
  });

  it("deep inheritance chain (Heading2 → Heading1 → Normal)", () => {
    const result = resolveEffectiveParagraphStyle({ styleId: "Heading2" }, BASE_STYLES);
    expect(result.lineHeight).toBe(1.3); // own
    expect(result.spacingBefore).toBe(18); // own
    expect(result.spacingAfter).toBe(12); // inherited from Heading1
  });
});
