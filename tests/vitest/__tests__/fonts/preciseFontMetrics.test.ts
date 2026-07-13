// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { getFontMetricsProvider } from "@/text/fonts/FontMetricsProvider.js";
import {
  clearPreciseFonts,
  getPreciseBrowserFontFamily,
  getPreciseFontProgram,
  hasPreciseFont,
  registerPreciseBrowserFontFace,
  registerPreciseFont,
} from "@/text/fonts/preciseFontMetrics.js";
import { resolveCanvasFontFamily } from "@/ui/canvas/canvasFontResolution.js";
import {
  isPreciseFontModeEnabled,
  setAvailableLocalFontFamilies,
  setPreciseFontModeEnabled,
} from "@/text/fonts/preciseFontMode.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";
import { readFontAssetSync } from "@/export/pdf/fonts/officeFontAssets.js";

const CODEPOINT = "W".codePointAt(0)!;
const SIZE = 100;

function arimoProgram(): SfntFontProgram {
  const bytes = readFontAssetSync("Arimo-Regular.woff2");
  if (!bytes) throw new Error("Arimo asset unavailable");
  return SfntFontProgram.parse(bytes);
}

describe("precise font metrics override", () => {
  afterEach(() => {
    clearPreciseFonts();
    setAvailableLocalFontFamilies([]);
    setPreciseFontModeEnabled(false);
  });

  it("measures with the bundled substitute when precise mode is off", () => {
    const provider = getFontMetricsProvider();
    // Aptos has no metric-compatible bundled face; it falls back to Carlito.
    const carlito = provider.getAdvanceWidthPx(
      "Aptos",
      false,
      false,
      CODEPOINT,
      SIZE,
    );

    // Register the real face but keep precise mode OFF: must not take effect.
    registerPreciseFont("Aptos", false, false, arimoProgram());
    setPreciseFontModeEnabled(false);

    expect(getPreciseFontProgram("Aptos", false, false)).toBeNull();
    expect(
      provider.getAdvanceWidthPx("Aptos", false, false, CODEPOINT, SIZE),
    ).toBe(carlito);
  });

  it("measures with the real local face when precise mode is on", () => {
    const provider = getFontMetricsProvider();
    const carlito = provider.getAdvanceWidthPx(
      "Aptos",
      false,
      false,
      CODEPOINT,
      SIZE,
    )!;

    const program = arimoProgram();
    registerPreciseFont("Aptos", false, false, program);
    setPreciseFontModeEnabled(true);

    expect(isPreciseFontModeEnabled()).toBe(true);
    expect(hasPreciseFont("Aptos, sans-serif")).toBe(true);

    const expectedArimo =
      (program.advanceWidthForCodePoint(CODEPOINT) / program.unitsPerEm) * SIZE;
    const measured = provider.getAdvanceWidthPx(
      "Aptos, sans-serif",
      false,
      false,
      CODEPOINT,
      SIZE,
    )!;

    // The override is active: width now comes from the real face, not Carlito.
    expect(measured).toBeCloseTo(expectedArimo, 5);
    expect(Math.abs(measured - carlito)).toBeGreaterThan(0.5);
  });

  it("uses the real face's natural line height under precise mode", () => {
    const provider = getFontMetricsProvider();
    const program = arimoProgram();
    registerPreciseFont("Aptos", false, false, program);
    setPreciseFontModeEnabled(true);

    expect(
      provider.getNaturalLineHeightPx("Aptos", false, false, SIZE),
    ).toBeCloseTo(program.naturalLineHeightPx(SIZE), 5);
  });

  it("falls back to the regular precise face for an unregistered bold face", () => {
    registerPreciseFont("Aptos", false, false, arimoProgram());
    setPreciseFontModeEnabled(true);
    // No bold face registered → regular real face is used rather than the substitute.
    expect(getPreciseFontProgram("Aptos", true, false)).not.toBeNull();
  });

  it("keeps the metric-compatible face first until an exact browser face exists", () => {
    registerPreciseFont("Aptos", false, false, arimoProgram());
    setPreciseFontModeEnabled(true);

    expect(getPreciseBrowserFontFamily("Aptos")).toBeNull();
    expect(resolveCanvasFontFamily("Aptos")).toMatch(/^Carlito/);
  });

  it("paints through the private browser alias backed by the same local bytes", async () => {
    const originalFontFace = globalThis.FontFace;
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    const faces = new Set<FontFace>();
    class FakeFontFace {
      readonly loaded = Promise.resolve(this);
      constructor(
        readonly family: string,
        _source: string | BufferSource,
        _descriptors?: FontFaceDescriptors,
      ) {}
      load(): Promise<this> {
        return Promise.resolve(this);
      }
    }
    Object.defineProperty(globalThis, "FontFace", {
      configurable: true,
      value: FakeFontFace,
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        add: (face: FontFace): void => void faces.add(face),
        delete: (face: FontFace): boolean => faces.delete(face),
      },
    });

    try {
      const bytes = readFontAssetSync("Arimo-Regular.woff2")!;
      expect(
        await registerPreciseBrowserFontFace("Aptos", false, false, bytes),
      ).toBe("Oasis Precise Aptos");
      registerPreciseFont("Aptos", false, false, arimoProgram());
      setAvailableLocalFontFamilies(["Aptos"]);
      setPreciseFontModeEnabled(true);

      expect(resolveCanvasFontFamily("Aptos")).toMatch(
        /^"Oasis Precise Aptos", Aptos, Carlito/,
      );
    } finally {
      if (originalFontFace) {
        Object.defineProperty(globalThis, "FontFace", {
          configurable: true,
          value: originalFontFace,
        });
      } else {
        delete (globalThis as { FontFace?: typeof FontFace }).FontFace;
      }
      if (originalFonts) {
        Object.defineProperty(document, "fonts", originalFonts);
      } else {
        delete (document as { fonts?: FontFaceSet }).fonts;
      }
    }
  });
});
