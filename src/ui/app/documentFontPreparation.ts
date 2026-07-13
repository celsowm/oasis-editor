import type { EditorDocument } from "@/core/model.js";
import { collectPdfFontFamilies } from "@/export/pdf/fonts/collectPdfFontFamilies.js";
import {
  isBundledMetricFontFamily,
  normalizeFamily,
  resolveMetricCompatibleFamily,
} from "@/export/pdf/fonts/officeFontAssets.js";
import {
  bumpLayoutMetricsEpoch,
  clearProjectedParagraphLayoutCache,
} from "@/layoutProjection/index.js";
import { preloadLayoutFonts } from "@/text/fonts/FontMetricsProvider.js";
import {
  getPreciseBrowserFontFamily,
  hasPreciseFont,
} from "@/text/fonts/preciseFontMetrics.js";
import {
  isPreciseFontModeEnabled,
  preciseFontModeVersion,
} from "@/text/fonts/preciseFontMode.js";
import {
  isRemoteWebFontActive,
  loadRemoteWebFonts,
} from "@/text/fonts/remoteWebFonts.js";
import {
  clearNormalLineHeightCache,
  clearTextMeasureCache,
} from "@/ui/textMeasurement.js";
import { createEditorLogger } from "@/utils/logger.js";
import { roundTo } from "@/utils/round.js";
import { loadPreciseFontProgramsForFamilies } from "./localFontAccess.js";

export type DocumentFontSource = "local" | "remote" | "bundled" | "fallback";

export interface DocumentFontPreparationResult {
  changed: boolean;
  families: Array<{
    requested: string;
    metricFamily: string;
    source: DocumentFontSource;
    browserFamily: string | null;
  }>;
}

export interface DocumentFontPreparationOptions {
  remoteWebFonts?: boolean;
}

const fontLogger = createEditorLogger("fonts");
const preparationLoads = new Map<
  string,
  Promise<DocumentFontPreparationResult>
>();

function collectFamilies(document: EditorDocument): string[] {
  return Array.from(
    new Set(
      Array.from(collectPdfFontFamilies(document), (family): string =>
        normalizeFamily(family),
      ),
    ),
  ).sort((left, right): number => left.localeCompare(right));
}

function checkBrowserFamily(family: string): boolean | null {
  if (typeof document === "undefined" || !document.fonts) return null;
  const escaped = family.replace(/["\\]/g, "\\$&");
  return document.fonts.check(`400 14px "${escaped}"`);
}

function resolveSource(family: string): DocumentFontSource {
  if (
    isPreciseFontModeEnabled() &&
    hasPreciseFont(family) &&
    getPreciseBrowserFontFamily(family)
  ) {
    return "local";
  }
  if (isBundledMetricFontFamily(family)) return "bundled";
  if (isRemoteWebFontActive(family)) return "remote";
  return "fallback";
}

/**
 * Prepares every face needed by a parsed document before its editor state is
 * applied. The promise is cached by family set/mode so the surface effect can
 * safely call the same service without triggering a second relayout.
 */
export function prepareDocumentFonts(
  document: EditorDocument,
  options: DocumentFontPreparationOptions = {},
): Promise<DocumentFontPreparationResult> {
  const families = collectFamilies(document);
  const key = `${families.join("|")}|remote:${options.remoteWebFonts === true}|precise:${preciseFontModeVersion()}`;
  const cached = preparationLoads.get(key);
  if (cached) return cached;

  const load = (async (): Promise<DocumentFontPreparationResult> => {
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    fontLogger.info("prepare:start", {
      families,
      remoteWebFonts: options.remoteWebFonts === true,
    });

    const bundledChanged = await preloadLayoutFonts(families);
    const localChanged = await loadPreciseFontProgramsForFamilies(families);
    const remoteCandidates = families.filter(
      (family): boolean =>
        !isBundledMetricFontFamily(family) &&
        !(
          isPreciseFontModeEnabled() &&
          hasPreciseFont(family) &&
          getPreciseBrowserFontFamily(family)
        ),
    );
    const remoteChanged =
      options.remoteWebFonts === true && remoteCandidates.length > 0
        ? await loadRemoteWebFonts(remoteCandidates)
        : false;
    const changed = bundledChanged || localChanged || remoteChanged;

    if (changed) {
      clearTextMeasureCache();
      clearNormalLineHeightCache();
      clearProjectedParagraphLayoutCache();
      bumpLayoutMetricsEpoch();
    }

    const result: DocumentFontPreparationResult = {
      changed,
      families: families.map((family) => {
        const source = resolveSource(family);
        const browserFamily =
          source === "local"
            ? getPreciseBrowserFontFamily(family)
            : source === "bundled"
              ? resolveMetricCompatibleFamily(family)
              : family;
        return {
          requested: family,
          metricFamily: resolveMetricCompatibleFamily(family),
          source,
          browserFamily,
        };
      }),
    };
    fontLogger.info("prepare:done", {
      durationMs: roundTo(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
          startedAt,
        2,
      ),
      changed,
      families: result.families.map((family) => ({
        ...family,
        browserCheck: family.browserFamily
          ? checkBrowserFamily(family.browserFamily)
          : null,
      })),
    });
    return result;
  })().catch((error: unknown) => {
    preparationLoads.delete(key);
    fontLogger.warn("prepare:error", { families, error: String(error) });
    return {
      changed: false,
      families: families.map((family) => ({
        requested: family,
        metricFamily: resolveMetricCompatibleFamily(family),
        source: "fallback" as const,
        browserFamily: null,
      })),
    };
  });

  preparationLoads.set(key, load);
  return load;
}

/** Test-only reset for the module-level deduplication cache. */
export function clearDocumentFontPreparationCache(): void {
  preparationLoads.clear();
}
