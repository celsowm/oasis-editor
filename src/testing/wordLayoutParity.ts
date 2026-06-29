import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EditorDocument } from "@/core/model.js";
import {
  getPageBodyTop,
  getPageContentHeight,
  getPageFooterReferenceTop,
  getPageFooterZoneTop,
  getPageHeaderZoneTop,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { getFontMetricsProvider } from "@/text/fonts/FontMetricsProvider.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { collectPdfFontFamilies } from "@/export/pdf/fonts/collectPdfFontFamilies.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import { DEFAULT_FONT_SIZE_PX, PT_PER_PX } from "@/core/units.js";
import { normalizeFamily } from "@/export/pdf/fonts/officeFontAssets.js";
import { registerPreciseFont } from "@/text/fonts/preciseFontMetrics.js";
import { setPreciseFontModeEnabled } from "@/text/fonts/preciseFontMode.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";

const WORD_CANDIDATE_PATHS = [
  "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
  "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
];

const POWERSHELL_COMMAND = "powershell.exe";
const CONVERT_SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/convert-docx-to-pdf.ps1", import.meta.url),
);
const PDF_EXTRACT_SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/extract-pdf-lines.mjs", import.meta.url),
);
const GEOMETRY_TOLERANCE_POINTS = 1.5;
const STRICT_GEOMETRY_TOLERANCE_POINTS = 0.5;
const WINDOWS_FONTS_DIR = "C:\\Windows\\Fonts";
type FontFaceDescriptor = "regular" | "bold" | "italic" | "bolditalic";
const NODE_PRECISE_FONT_SOURCE_BY_FAMILY: Record<string, string> = {
  aptos: "calibri",
  "aptos display": "calibri",
  "aptos heading": "calibri",
  "aptos narrow": "calibri",
  arial: "arial",
  calibri: "calibri",
  "calibri light": "calibri",
  cambria: "cambria",
  times: "times new roman",
  "times new roman": "times new roman",
};
const WINDOWS_FONT_FILES: Record<
  string,
  Partial<Record<FontFaceDescriptor, string>>
> = {
  arial: {
    regular: "arial.ttf",
    bold: "arialbd.ttf",
    italic: "ariali.ttf",
    bolditalic: "arialbi.ttf",
  },
  calibri: {
    regular: "calibri.ttf",
    bold: "calibrib.ttf",
    italic: "calibrii.ttf",
    bolditalic: "calibriz.ttf",
  },
  cambria: {
    regular: "cambria.ttc",
    bold: "cambriab.ttf",
    italic: "cambriai.ttf",
    bolditalic: "cambriaz.ttf",
  },
  "times new roman": {
    regular: "times.ttf",
    bold: "timesbd.ttf",
    italic: "timesi.ttf",
    bolditalic: "timesbi.ttf",
  },
};
const parsedWindowsFontCache = new Map<string, SfntFontProgram | null>();

export interface WordLayoutSupportStatus {
  supported: boolean;
  reason?: string;
  wordPath?: string;
}

interface WordPdfLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WordPdfPage {
  width: number;
  height: number;
  lines: WordPdfLine[];
}

interface WordPdfLayout {
  pages: WordPdfPage[];
}

interface LayoutLineGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorPageSnapshot {
  headerLineTexts: string[];
  bodyLineTexts: string[];
  footerLineTexts: string[];
  width: number;
  height: number;
  headerTop: number;
  bodyTop: number;
  bodyHeight: number;
  footerTop: number;
  footerReferenceTop: number;
  pageHeight: number;
  firstBodyLineGeometry?: LayoutLineGeometry;
  lastBodyLineBottom?: number;
  firstFooterLineTop?: number;
}

export interface WordLayoutParityResult {
  editor: {
    pages: EditorPageSnapshot[];
  };
  word: WordPdfLayout;
  mismatches: string[];
}

export interface WordLayoutParityOptions {
  geometryTolerancePoints?: number;
  strictTextAndGeometry?: boolean;
}

function normalizeLineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collectRenderedLineGeometry(
  blocks: NonNullable<
    ReturnType<typeof projectDocumentLayout>["pages"][number]["blocks"]
  >,
  originX: number,
  originY: number,
  styles: EditorDocument["styles"],
): Array<{ text: string; geometry: LayoutLineGeometry; bottomPx: number }> {
  const lines: Array<{
    text: string;
    geometry: LayoutLineGeometry;
    bottomPx: number;
  }> = [];
  let cursorY = originY;

  const provider = getFontMetricsProvider();

  for (const block of blocks) {
    if (block.sourceBlock.type === "paragraph" && block.layout) {
      const paragraph = block.sourceBlock;
      const paragraphStyle = resolveEffectiveParagraphStyle(
        paragraph.style,
        styles,
      );
      const spacingBefore =
        block.layout.startOffset === 0
          ? (paragraphStyle.spacingBefore ?? 0)
          : 0;
      const paragraphOriginY = cursorY + spacingBefore;

      for (const line of block.layout.lines) {
        const text = normalizeLineText(
          line.fragments.map((fragment): string => fragment.text).join(""),
        );
        if (text.length === 0) {
          continue;
        }
        const firstSlot = line.slots[0];
        const lastSlot = line.slots[line.slots.length - 1];
        const xPx = originX + (firstSlot?.left ?? 0);
        // The editor lays out line boxes. The Word PDF extractor reads text
        // matrices directly and reports the typographic text top derived from
        // the PDF font descriptor ascent, so mirror that same font-specific
        // offset from the editor side.
        const lineTextStyle = resolveEffectiveTextStyleForParagraph(
          line.fragments[0]?.styles,
          paragraph.style?.styleId,
          styles,
        );
        const textTopOffset =
          provider.getWordTextTopOffsetPx(
            lineTextStyle.fontFamily,
            Boolean(lineTextStyle.bold),
            Boolean(lineTextStyle.italic),
            lineTextStyle.fontSize ?? DEFAULT_FONT_SIZE_PX,
          ) ?? 0;
        const yPx = paragraphOriginY + line.top + textTopOffset;
        const widthPx = Math.max(
          0,
          (lastSlot?.left ?? firstSlot?.left ?? 0) - (firstSlot?.left ?? 0),
        );
        lines.push({
          text,
          geometry: {
            x: xPx * PT_PER_PX,
            y: yPx * PT_PER_PX,
            width: widthPx * PT_PER_PX,
            height: line.height * PT_PER_PX,
          },
          bottomPx: yPx + line.height,
        });
      }
    }

    cursorY += Math.max(0, block.estimatedHeight);
  }

  return lines;
}

function findWordPath(): string | null {
  for (const candidate of WORD_CANDIDATE_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function parseWindowsFont(filePath: string): SfntFontProgram | null {
  const cached = parsedWindowsFontCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const bytes = new Uint8Array(readFileSync(filePath));
    const programs = SfntFontProgram.parseCollection(bytes);
    const program = programs[0] ?? null;
    parsedWindowsFontCache.set(filePath, program);
    return program;
  } catch {
    parsedWindowsFontCache.set(filePath, null);
    return null;
  }
}

function primeNodeWordParityFonts(document: EditorDocument): void {
  if (process.platform !== "win32") {
    return;
  }

  setPreciseFontModeEnabled(true);
  const families = Array.from(collectPdfFontFamilies(document));
  for (const family of families) {
    const requestedFamily = normalizeFamily(family);
    const sourceKey =
      NODE_PRECISE_FONT_SOURCE_BY_FAMILY[requestedFamily.toLowerCase()];
    if (!sourceKey) {
      continue;
    }
    const faceFiles = WINDOWS_FONT_FILES[sourceKey];
    if (!faceFiles) {
      continue;
    }
    for (const [face, fileName] of Object.entries(faceFiles) as Array<
      [FontFaceDescriptor, string | undefined]
    >) {
      if (!fileName) {
        continue;
      }
      const filePath = join(WINDOWS_FONTS_DIR, fileName);
      if (!existsSync(filePath)) {
        continue;
      }
      const program = parseWindowsFont(filePath);
      if (!program) {
        continue;
      }
      registerPreciseFont(
        requestedFamily,
        face === "bold" || face === "bolditalic",
        face === "italic" || face === "bolditalic",
        program,
      );
    }
  }
}

export function detectWordLayoutParitySupport(): WordLayoutSupportStatus {
  if (process.platform !== "win32") {
    return { supported: false, reason: "Word automation requires Windows." };
  }

  if (
    !existsSync(CONVERT_SCRIPT_PATH) ||
    !existsSync(PDF_EXTRACT_SCRIPT_PATH)
  ) {
    return {
      supported: false,
      reason: "Word parity helper scripts are missing.",
    };
  }

  const wordPath = findWordPath();
  if (!wordPath) {
    return { supported: false, reason: "WINWORD.EXE was not found." };
  }

  return {
    supported: true,
    wordPath,
  };
}

function collectEditorPageSnapshots(
  document: EditorDocument,
): EditorPageSnapshot[] {
  const layout = projectDocumentLayout(document);

  return layout.pages.map((page) => {
    const originX =
      page.pageSettings.margins.left + page.pageSettings.margins.gutter;
    const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
    const footerTop =
      page.footerTop ??
      page.bodyBottom ??
      getPageFooterZoneTop(page.pageSettings);
    const headerLines = collectRenderedLineGeometry(
      page.headerBlocks ?? [],
      originX,
      page.headerTop ?? getPageHeaderZoneTop(page.pageSettings),
      document.styles,
    );
    const bodyLines = collectRenderedLineGeometry(
      page.blocks,
      originX,
      bodyTop,
      document.styles,
    );
    const footerLines = collectRenderedLineGeometry(
      page.footerBlocks ?? [],
      originX,
      footerTop,
      document.styles,
    );

    return {
      headerLineTexts: headerLines.map((line): string => line.text),
      bodyLineTexts: bodyLines.map((line): string => line.text),
      footerLineTexts: footerLines.map((line): string => line.text),
      width: page.pageSettings.width,
      height: page.pageSettings.height,
      headerTop: getPageHeaderZoneTop(page.pageSettings),
      bodyTop,
      bodyHeight:
        page.bodyBottom !== undefined && page.bodyTop !== undefined
          ? page.bodyBottom - page.bodyTop
          : getPageContentHeight(page.pageSettings),
      footerTop,
      footerReferenceTop: getPageFooterReferenceTop(page.pageSettings),
      pageHeight: page.pageSettings.height,
      firstBodyLineGeometry: bodyLines[0]?.geometry,
      lastBodyLineBottom: bodyLines.at(-1)?.bottomPx,
      firstFooterLineTop: footerLines[0]?.geometry.y,
    };
  });
}

async function convertDocxToPdfWithWord(
  docxPath: string,
  pdfPath: string,
): Promise<void> {
  const result = spawnSync(
    POWERSHELL_COMMAND,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      CONVERT_SCRIPT_PATH,
      "-DocxPath",
      docxPath,
      "-PdfPath",
      pdfPath,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Word PDF conversion failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function extractPdfLayout(pdfPath: string): WordPdfLayout {
  const result = spawnSync(
    process.execPath,
    [PDF_EXTRACT_SCRIPT_PATH, pdfPath],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `PDF line extraction failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return JSON.parse(result.stdout) as WordPdfLayout;
}

function compareWordAndEditorLayout(
  editorPages: EditorPageSnapshot[],
  wordLayout: WordPdfLayout,
  options: WordLayoutParityOptions = {},
): string[] {
  const mismatches: string[] = [];
  const strict = options.strictTextAndGeometry === true;
  const geometryTolerance =
    options.geometryTolerancePoints ??
    (strict ? STRICT_GEOMETRY_TOLERANCE_POINTS : GEOMETRY_TOLERANCE_POINTS);

  if (editorPages.length !== wordLayout.pages.length) {
    mismatches.push(
      `Page count mismatch: editor=${editorPages.length}, word=${wordLayout.pages.length}.`,
    );
  }

  const pageCount = Math.min(editorPages.length, wordLayout.pages.length);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const editorPage = editorPages[pageIndex]!;
    const wordPage = wordLayout.pages[pageIndex]!;
    const editorWidth = editorPage.width * PT_PER_PX;
    const editorHeight = editorPage.height * PT_PER_PX;
    if (Math.abs(editorWidth - wordPage.width) > geometryTolerance) {
      mismatches.push(
        `Page ${pageIndex + 1} width mismatch: editor=${editorWidth.toFixed(2)}pt, word=${wordPage.width.toFixed(2)}pt.`,
      );
    }
    if (Math.abs(editorHeight - wordPage.height) > geometryTolerance) {
      mismatches.push(
        `Page ${pageIndex + 1} height mismatch: editor=${editorHeight.toFixed(2)}pt, word=${wordPage.height.toFixed(2)}pt.`,
      );
    }

    const headerLimit = editorPage.bodyTop * PT_PER_PX - 1;
    const footerStart = editorPage.footerTop * PT_PER_PX - 1;
    const footerEnd = editorPage.pageHeight * PT_PER_PX + 1;
    const wordHeaderLinesWithGeometry = wordPage.lines
      .filter(
        (line): boolean =>
          line.y >= editorPage.headerTop * PT_PER_PX - 1 &&
          line.y < headerLimit,
      )
      .filter((line): boolean => normalizeLineText(line.text).length > 0);
    const wordBodyLinesWithGeometry = wordPage.lines
      .filter(
        (line): boolean =>
          line.y >= editorPage.bodyTop * PT_PER_PX - 1 && line.y < footerStart,
      )
      .filter((line): boolean => normalizeLineText(line.text).length > 0);
    const wordFooterLinesWithGeometry = wordPage.lines
      .filter((line): boolean => line.y >= footerStart && line.y <= footerEnd)
      .filter((line): boolean => normalizeLineText(line.text).length > 0);
    const wordHeaderLines = wordHeaderLinesWithGeometry
      .map((line): string => normalizeLineText(line.text))
      .filter((line): boolean => line.length > 0);
    const wordBodyLines = wordBodyLinesWithGeometry
      .map((line): string => normalizeLineText(line.text))
      .filter((line): boolean => line.length > 0);
    const wordFooterLines = wordFooterLinesWithGeometry
      .map((line): string => normalizeLineText(line.text))
      .filter((line): boolean => line.length > 0);

    const zones = [
      {
        name: "header",
        editorLines: editorPage.headerLineTexts,
        wordLines: wordHeaderLines,
      },
      {
        name: "body",
        editorLines: editorPage.bodyLineTexts,
        wordLines: wordBodyLines,
      },
      {
        name: "footer",
        editorLines: editorPage.footerLineTexts,
        wordLines: wordFooterLines,
      },
    ];

    for (const zone of zones) {
      if (zone.editorLines.length !== zone.wordLines.length) {
        mismatches.push(
          `Page ${pageIndex + 1} ${zone.name} line count mismatch: editor=${zone.editorLines.length}, word=${zone.wordLines.length}.`,
        );
        break;
      }

      if (strict) {
        for (
          let lineIndex = 0;
          lineIndex < zone.editorLines.length;
          lineIndex += 1
        ) {
          const editorLine = zone.editorLines[lineIndex]!;
          const wordLine = zone.wordLines[lineIndex]!;
          if (editorLine !== wordLine) {
            mismatches.push(
              `Page ${pageIndex + 1} ${zone.name} line ${lineIndex + 1} text mismatch: editor="${editorLine}" word="${wordLine}".`,
            );
            break;
          }
        }
      }
    }

    const editorFirstBodyLine = editorPage.firstBodyLineGeometry;
    const wordFirstBodyLine = wordBodyLinesWithGeometry[0];
    if (editorFirstBodyLine && wordFirstBodyLine) {
      // Only position (x, y) is compared. The editor's width is an advance
      // extent, while the PDF extractor intentionally reports no line width:
      // the Word PDF text stream exposes exact text matrices, but not a single
      // semantic line box width. Advance-width regressions still surface as
      // wrong line breaks (asserted above).
      const checks = [
        { name: "x", editor: editorFirstBodyLine.x, word: wordFirstBodyLine.x },
        { name: "y", editor: editorFirstBodyLine.y, word: wordFirstBodyLine.y },
      ];
      for (const check of checks) {
        if (Math.abs(check.editor - check.word) > geometryTolerance) {
          mismatches.push(
            `Page ${pageIndex + 1} first body line ${check.name} mismatch: editor=${check.editor.toFixed(2)}pt, word=${check.word.toFixed(2)}pt.`,
          );
          break;
        }
      }
    }

    if (strict) {
      const editorFirstBodyText = editorPage.bodyLineTexts[0] ?? "";
      const editorLastBodyText = editorPage.bodyLineTexts.at(-1) ?? "";
      const wordFirstBodyText = wordBodyLines[0] ?? "";
      const wordLastBodyText = wordBodyLines.at(-1) ?? "";

      if (editorFirstBodyText !== wordFirstBodyText) {
        mismatches.push(
          `Page ${pageIndex + 1} first body line mismatch: editor="${editorFirstBodyText}" word="${wordFirstBodyText}".`,
        );
      }
      if (editorLastBodyText !== wordLastBodyText) {
        mismatches.push(
          `Page ${pageIndex + 1} last body line mismatch: editor="${editorLastBodyText}" word="${wordLastBodyText}".`,
        );
      }

      const wordBodyTop = wordBodyLinesWithGeometry[0]?.y;
      const wordBodyBottom = wordBodyLinesWithGeometry.at(-1)
        ? wordBodyLinesWithGeometry.at(-1)!.y +
          wordBodyLinesWithGeometry.at(-1)!.height
        : undefined;
      const wordFooterTop = wordFooterLinesWithGeometry[0]?.y;
      const checks = [
        {
          name: "bodyTop",
          editor:
            editorPage.firstBodyLineGeometry?.y ??
            editorPage.bodyTop * PT_PER_PX,
          word: wordBodyTop,
        },
        {
          name: "bodyBottom",
          editor:
            (editorPage.lastBodyLineBottom ?? editorPage.footerTop) * PT_PER_PX,
          word: wordBodyBottom,
        },
        {
          name: "footerTop",
          editor:
            editorPage.firstFooterLineTop ?? editorPage.footerTop * PT_PER_PX,
          word: wordFooterTop,
        },
      ];
      for (const check of checks) {
        if (typeof check.word !== "number") {
          continue;
        }
        if (Math.abs(check.editor - check.word) > geometryTolerance) {
          mismatches.push(
            `Page ${pageIndex + 1} ${check.name} mismatch: editor=${check.editor.toFixed(2)}pt, word=${check.word.toFixed(2)}pt.`,
          );
        }
      }
    }
  }

  return mismatches;
}

async function verifyWordLayoutParityFromDocx(
  document: EditorDocument,
  docxBuffer: Buffer,
  options: WordLayoutParityOptions = {},
): Promise<WordLayoutParityResult> {
  const support = detectWordLayoutParitySupport();
  if (!support.supported) {
    throw new Error(
      support.reason ?? "Word layout parity support is not available.",
    );
  }

  const tempDir = await mkdtemp(join(tmpdir(), "oasis-word-parity-"));
  const docxPath = join(tempDir, "document.docx");
  const pdfPath = join(tempDir, "document.pdf");

  try {
    await writeFile(docxPath, docxBuffer);
    const conversionPromise = convertDocxToPdfWithWord(docxPath, pdfPath);
    await conversionPromise;
    primeNodeWordParityFonts(document);
    const editorPages = collectEditorPageSnapshots(document);
    const wordLayout = extractPdfLayout(pdfPath);
    const mismatches = compareWordAndEditorLayout(
      editorPages,
      wordLayout,
      options,
    );

    return {
      editor: { pages: editorPages },
      word: wordLayout,
      mismatches,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function verifyWordLayoutParity(
  document: EditorDocument,
  options: WordLayoutParityOptions = {},
): Promise<WordLayoutParityResult> {
  const docxBuffer = Buffer.from(await exportEditorDocumentToDocx(document));
  return verifyWordLayoutParityFromDocx(document, docxBuffer, options);
}

export async function verifyImportedDocxWordLayoutParity(
  docxPath: string,
  options: WordLayoutParityOptions = {},
): Promise<WordLayoutParityResult> {
  const docxBuffer = await readFile(docxPath);
  const document = await importDocxToEditorDocument(
    docxBuffer.buffer.slice(
      docxBuffer.byteOffset,
      docxBuffer.byteOffset + docxBuffer.byteLength,
    ),
  );
  return verifyWordLayoutParityFromDocx(document, docxBuffer, options);
}
