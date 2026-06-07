import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guard for the justification bug whose root cause was asynchronous
 * font loading: when the bundled metric fonts (Tinos ≈ Times New Roman) were
 * only decodable asynchronously in the browser, the first layout pass measured
 * text with a wide heuristic. Multi-line justified paragraphs hid this (every
 * line is stretched to fill anyway), but single-line list items rendered with
 * huge gaps because their slots stayed at the heuristic width.
 *
 * The fix decodes WOFF2 synchronously everywhere via a bundled JS brotli
 * decoder, so real metrics are available on the very first synchronous layout.
 * Here we hide Node's native brotli to emulate the browser and assert the
 * synchronous path still yields real advances — no async preload required.
 */
describe("synchronous font metrics without native brotli (browser path)", () => {
  let restoreGetBuiltinModule: (() => void) | null = null;

  beforeEach(() => {
    // Fresh module instances so each test starts with empty decode caches.
    vi.resetModules();
    const proc = (
      globalThis as unknown as { process?: Record<string, unknown> }
    ).process;
    if (proc && "getBuiltinModule" in proc) {
      const original = proc.getBuiltinModule;
      // Hiding it forces the pure-JS brotli path, exactly like the browser.
      proc.getBuiltinModule = undefined;
      restoreGetBuiltinModule = () => {
        proc.getBuiltinModule = original;
      };
    }
  });

  afterEach(() => {
    restoreGetBuiltinModule?.();
    restoreGetBuiltinModule = null;
  });

  it("decodes a bundled WOFF2 face synchronously", async () => {
    const { readFontAssetSync } =
      await import("../../../export/pdf/fonts/officeFontAssets.js");
    const bytes = readFontAssetSync("Tinos-Regular.woff2");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect((bytes as Uint8Array).byteLength).toBeGreaterThan(1000);
  });

  it("yields real Times New Roman advances synchronously (no preload)", async () => {
    const { getFontMetricsProvider } =
      await import("../../../text/fonts/FontMetricsProvider.js");
    const provider = getFontMetricsProvider();
    const advance = provider.getAdvanceWidthPx(
      "Times New Roman",
      false,
      false,
      0x70, // 'p'
      14.6667, // 11pt
    );
    // Real Tinos 'p' advance at 11pt ≈ 7.33px; the heuristic would give ≈ 9.1px.
    expect(advance).not.toBeNull();
    expect(advance!).toBeGreaterThan(6.5);
    expect(advance!).toBeLessThan(8);
  });
});
