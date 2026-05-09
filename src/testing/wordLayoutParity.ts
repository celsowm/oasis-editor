import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EditorDocument } from "../core/model.js";
import {
  getPageBodyTop,
  getPageContentHeight,
  getPageFooterReferenceTop,
  getPageFooterZoneTop,
  getPageHeaderZoneTop,
} from "../core/model.js";
import { exportEditorDocumentToDocx } from "../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "../ui/layoutProjection.js";

const WORD_CANDIDATE_PATHS = [
  "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
  "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
];

const PYTHON_CANDIDATES: Array<{ command: string; args?: string[] }> = [
  { command: "C:\\Python\\python.exe" },
  { command: "python" },
  { command: "py", args: ["-3"] },
];

const POWERSHELL_COMMAND = "powershell.exe";
const CONVERT_SCRIPT_PATH = fileURLToPath(new URL("../../scripts/convert-docx-to-pdf.ps1", import.meta.url));
const EXTRACT_SCRIPT_PATH = fileURLToPath(new URL("../../scripts/extract-pdf-lines.py", import.meta.url));
const PX_TO_POINTS = 72 / 96;
const GEOMETRY_TOLERANCE_POINTS = 1.5;
const PROJECT_ROOT = dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));

export interface WordLayoutSupportStatus {
  supported: boolean;
  reason?: string;
  wordPath?: string;
  pythonCommand?: string;
  pythonArgs?: string[];
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
}

interface EditorDomStyleSnapshot {
  runFontFamilies: string[];
  runFontSizes: string[];
  firstTableFirstRowBackgrounds: string[];
}

interface BrowserEditorSnapshot {
  pages: EditorPageSnapshot[];
  domStyles: EditorDomStyleSnapshot;
}

export interface WordLayoutParityResult {
  editor: {
    pages: EditorPageSnapshot[];
    domStyles?: EditorDomStyleSnapshot;
  };
  word: WordPdfLayout;
  mismatches: string[];
}

export interface WordLayoutParityOptions {
  geometryTolerancePoints?: number;
}

function normalizeLineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function findWordPath(): string | null {
  for (const candidate of WORD_CANDIDATE_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function findPythonCommand(): { command: string; args: string[] } | null {
  for (const candidate of PYTHON_CANDIDATES) {
    const result = spawnSync(candidate.command, [...(candidate.args ?? []), "-c", "import fitz"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) {
      return {
        command: candidate.command,
        args: candidate.args ?? [],
      };
    }
  }
  return null;
}

export function detectWordLayoutParitySupport(): WordLayoutSupportStatus {
  if (process.platform !== "win32") {
    return { supported: false, reason: "Word automation requires Windows." };
  }

  if (!existsSync(CONVERT_SCRIPT_PATH) || !existsSync(EXTRACT_SCRIPT_PATH)) {
    return { supported: false, reason: "Word parity helper scripts are missing." };
  }

  const wordPath = findWordPath();
  if (!wordPath) {
    return { supported: false, reason: "WINWORD.EXE was not found." };
  }

  const python = findPythonCommand();
  if (!python) {
    return { supported: false, reason: "Python with PyMuPDF (fitz) was not found." };
  }

  return {
    supported: true,
    wordPath,
    pythonCommand: python.command,
    pythonArgs: python.args,
  };
}

function collectEditorPageSnapshots(document: EditorDocument): EditorPageSnapshot[] {
  const layout = projectDocumentLayout(document);

  return layout.pages.map((page) => {
    const lineTexts = page.blocks.flatMap((block) => {
      if (!block.layout) {
        return [];
      }

      return block.layout.lines
        .map((line) => normalizeLineText(line.fragments.map((fragment) => fragment.text).join("")))
        .filter((line) => line.length > 0);
    });
    const headerLineTexts = (page.headerBlocks ?? []).flatMap((block) => {
      if (!block.layout) {
        return [];
      }
      return block.layout.lines
        .map((line) => normalizeLineText(line.fragments.map((fragment) => fragment.text).join("")))
        .filter((line) => line.length > 0);
    });
    const footerLineTexts = (page.footerBlocks ?? []).flatMap((block) => {
      if (!block.layout) {
        return [];
      }
      return block.layout.lines
        .map((line) => normalizeLineText(line.fragments.map((fragment) => fragment.text).join("")))
        .filter((line) => line.length > 0);
    });

    return {
      headerLineTexts,
      bodyLineTexts: lineTexts,
      footerLineTexts,
      width: page.pageSettings.width,
      height: page.pageSettings.height,
      headerTop: getPageHeaderZoneTop(page.pageSettings),
      bodyTop: page.bodyTop ?? getPageBodyTop(page.pageSettings),
      bodyHeight:
        page.bodyBottom !== undefined && page.bodyTop !== undefined
          ? page.bodyBottom - page.bodyTop
          : getPageContentHeight(page.pageSettings),
      footerTop: page.bodyBottom ?? getPageFooterZoneTop(page.pageSettings),
      footerReferenceTop: getPageFooterReferenceTop(page.pageSettings),
      pageHeight: page.pageSettings.height,
      firstBodyLineGeometry: undefined,
      lastBodyLineBottom: undefined,
    };
  });
}

async function collectEditorPageSnapshotsInBrowser(document: EditorDocument): Promise<BrowserEditorSnapshot | null> {
  if (process.env.OASIS_WORD_PARITY_USE_NODE_LAYOUT === "1") {
    return null;
  }

  let closeServer: (() => Promise<void>) | undefined;
  try {
    const [{ createServer }, { chromium }] = await Promise.all([
      import("vite"),
      import("@playwright/test"),
    ]);
    const server = await createServer({
      root: PROJECT_ROOT,
      logLevel: "error",
      server: {
        host: "127.0.0.1",
        port: 0,
      },
    });

    await server.listen();
    closeServer = () => server.close();

    const baseUrl = server.resolvedUrls?.local?.[0];
    if (!baseUrl) {
      return null;
    }

    const launchBrowser = async () => {
      try {
        return await chromium.launch({ channel: "msedge", headless: true });
      } catch {
        return chromium.launch({ headless: true });
      }
    };

    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();
      await page.goto(baseUrl, { waitUntil: "networkidle" });

      const snapshots = await page.evaluate(async (inputDocument) => {
        const domLineBoxToPdfTextTopPoints = 2.18;
        const domTextWidthToPdfBboxPoints = 2.05;
        const domTextHeightToPdfBboxPoints = -2.46;
        const importModule = (specifier: string) =>
          // `eval` keeps TypeScript from trying to resolve Vite-only browser module specifiers.
          (0, eval)(`import(${JSON.stringify(specifier)})`) as Promise<Record<string, any>>;
        const { createOasisEditor } = await importModule("/src/app/bootstrap/createOasisEditorApp.ts");
        const host = globalThis.document.createElement("div");
        host.setAttribute("data-testid", "word-parity-host");
        globalThis.document.body.innerHTML = "";
        globalThis.document.body.appendChild(host);
        const instance = createOasisEditor(host, {
          initialDocument: inputDocument,
          showChrome: false,
          readOnly: true,
          viewportHeight: "none",
        });
        try {
          await globalThis.document.fonts.ready;
          let previousSignature = "";
          let stableFrameCount = 0;
          for (let frame = 0; frame < 40 && stableFrameCount < 3; frame += 1) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const signature = Array.from(host.querySelectorAll('[data-testid="editor-page"]'))
              .map((page) => {
                const body = page.querySelector('[data-testid="editor-surface"]') as HTMLElement | null;
                const footer = page.querySelector('[data-testid="editor-page-footer-zone"]') as HTMLElement | null;
                return [
                  body?.style.minHeight ?? "",
                  footer?.style.top ?? "",
                  body?.querySelectorAll('[data-testid="editor-line"]').length ?? 0,
                ].join(":");
              })
              .join("|");
            if (signature === previousSignature && signature.length > 0) {
              stableFrameCount += 1;
            } else {
              stableFrameCount = 0;
              previousSignature = signature;
            }
          }

          const normalize = (value: string | null | undefined) =>
            (value ?? "").replace(/\s+/g, " ").trim();
          const lineTexts = (root: Element | null) =>
            Array.from(root?.querySelectorAll('[data-testid="editor-line"]') ?? [])
              .map((line) => normalize(line.textContent))
              .filter((line) => line.length > 0);
          const parsePx = (value: string | null | undefined, fallback = 0) => {
            const parsed = Number.parseFloat(value ?? "");
            return Number.isFinite(parsed) ? parsed : fallback;
          };
          const geometryFromLine = (
            pageElement: HTMLElement,
            bodyElement: HTMLElement | null,
            lineElement: Element | null,
          ) => {
            if (!bodyElement || !lineElement) {
              return undefined;
            }
            const bodyRect = bodyElement.getBoundingClientRect();
            const range = globalThis.document.createRange();
            range.selectNodeContents(lineElement);
            const lineRect = range.getBoundingClientRect();
            range.detach();
            const bodyLeft = parsePx(bodyElement.style.marginLeft);
            const bodyTop = parsePx(bodyElement.style.marginTop);
            return {
              x: (bodyLeft + lineRect.left - bodyRect.left) * 0.75,
              y: (bodyTop + lineRect.top - bodyRect.top) * 0.75 + domLineBoxToPdfTextTopPoints,
              width: lineRect.width * 0.75 + domTextWidthToPdfBboxPoints,
              height: lineRect.height * 0.75 + domTextHeightToPdfBboxPoints,
            };
          };
          const lineBottomFromPageTop = (
            pageElement: HTMLElement,
            bodyElement: HTMLElement | null,
            lineElement: Element | null,
          ) => {
            if (!bodyElement || !lineElement) {
              return undefined;
            }
            const lineHtmlElement = lineElement as HTMLElement;
            const bodyTop = parsePx(bodyElement.style.marginTop);
            let offsetTop = 0;
            let current: HTMLElement | null = lineHtmlElement;
            while (current && current !== bodyElement) {
              offsetTop += current.offsetTop;
              current = current.offsetParent as HTMLElement | null;
            }
            return bodyTop + offsetTop + lineHtmlElement.offsetHeight;
          };

          const pages = Array.from(host.querySelectorAll('[data-testid="editor-page"]')).map((pageElement: Element) => {
            const pageHtmlElement = pageElement as HTMLElement;
            const header = pageElement.querySelector('[data-testid="editor-page-header-zone"]');
            const body = pageElement.querySelector('[data-testid="editor-surface"]') as HTMLElement | null;
            const footer = pageElement.querySelector('[data-testid="editor-page-footer-zone"]');
            const pageWidth = parsePx(pageHtmlElement.style.width, pageHtmlElement.getBoundingClientRect().width);
            const pageHeight = parsePx(pageHtmlElement.style.minHeight, pageHtmlElement.getBoundingClientRect().height);
            const bodyTop = parsePx(body?.style.marginTop);
            const bodyHeight = parsePx(body?.style.minHeight);
            const footerTop = parsePx((footer as HTMLElement | null)?.style.top, pageHeight);
            const firstBodyLine = body?.querySelector('[data-testid="editor-line"]');
            const bodyLines = Array.from(body?.querySelectorAll('[data-testid="editor-line"]') ?? []);
            const lastBodyLine = bodyLines[bodyLines.length - 1] ?? null;
            return {
              headerLineTexts: lineTexts(header),
              bodyLineTexts: lineTexts(body),
              footerLineTexts: lineTexts(footer),
              width: pageWidth,
              height: pageHeight,
              headerTop: 0,
              bodyTop,
              bodyHeight,
              footerTop,
              footerReferenceTop: footerTop,
              pageHeight,
              firstBodyLineGeometry: geometryFromLine(pageHtmlElement, body, firstBodyLine ?? null),
              lastBodyLineBottom: lineBottomFromPageTop(pageHtmlElement, body, lastBodyLine),
            };
          });

          const runFontFamilies = Array.from(host.querySelectorAll('[data-testid="editor-run"]'))
            .map((run) => globalThis.getComputedStyle(run as HTMLElement).fontFamily)
            .filter((fontFamily) => fontFamily.length > 0);
          const runFontSizes = Array.from(host.querySelectorAll('[data-testid="editor-run"]'))
            .map((run) => globalThis.getComputedStyle(run as HTMLElement).fontSize)
            .filter((fontSize) => fontSize.length > 0);
          const firstTable = host.querySelector('[data-testid="editor-table"]');
          const firstTableFirstRow = firstTable?.querySelector('[data-testid="editor-table-row"]');
          const firstTableFirstRowBackgrounds = Array.from(
            firstTableFirstRow?.querySelectorAll('[data-testid="editor-table-cell"]') ?? [],
          )
            .map((cell) => globalThis.getComputedStyle(cell as HTMLElement).backgroundColor)
            .filter((backgroundColor) => backgroundColor.length > 0);

          return {
            pages,
            domStyles: {
              runFontFamilies,
              runFontSizes,
              firstTableFirstRowBackgrounds,
            },
          };
        } finally {
          instance.dispose();
        }
      }, document);

      return snapshots;
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (process.env.OASIS_WORD_PARITY_DEBUG === "1") {
      console.error("Word parity browser measurement failed:", error);
    }
    return null;
  } finally {
    await closeServer?.();
  }
}

async function convertDocxToPdfWithWord(docxPath: string, pdfPath: string): Promise<void> {
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

function extractPdfLayout(pdfPath: string, support: WordLayoutSupportStatus): WordPdfLayout {
  const pythonCommand = support.pythonCommand;
  if (!pythonCommand) {
    throw new Error("Python command is not available.");
  }

  const result = spawnSync(
    pythonCommand,
    [...(support.pythonArgs ?? []), EXTRACT_SCRIPT_PATH, pdfPath],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(`PDF line extraction failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  return JSON.parse(result.stdout) as WordPdfLayout;
}

function compareWordAndEditorLayout(
  editorPages: EditorPageSnapshot[],
  wordLayout: WordPdfLayout,
  options: WordLayoutParityOptions = {},
): string[] {
  const mismatches: string[] = [];
  const geometryTolerance = options.geometryTolerancePoints ?? GEOMETRY_TOLERANCE_POINTS;

  if (editorPages.length !== wordLayout.pages.length) {
    mismatches.push(
      `Page count mismatch: editor=${editorPages.length}, word=${wordLayout.pages.length}.`,
    );
  }

  const pageCount = Math.min(editorPages.length, wordLayout.pages.length);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const editorPage = editorPages[pageIndex]!;
    const wordPage = wordLayout.pages[pageIndex]!;
    const editorWidth = editorPage.width * PX_TO_POINTS;
    const editorHeight = editorPage.height * PX_TO_POINTS;
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

    const headerLimit = editorPage.bodyTop * PX_TO_POINTS - 1;
    const footerStart = editorPage.footerTop * PX_TO_POINTS - 1;
    const footerEnd = editorPage.pageHeight * PX_TO_POINTS + 1;
    const wordHeaderLinesWithGeometry = wordPage.lines
      .filter((line) => line.y >= editorPage.headerTop * PX_TO_POINTS - 1 && line.y < headerLimit)
      .filter((line) => normalizeLineText(line.text).length > 0);
    const wordBodyLinesWithGeometry = wordPage.lines
      .filter((line) => line.y >= editorPage.bodyTop * PX_TO_POINTS - 1 && line.y < footerStart)
      .filter((line) => normalizeLineText(line.text).length > 0);
    const wordFooterLinesWithGeometry = wordPage.lines
      .filter((line) => line.y >= footerStart && line.y <= footerEnd)
      .filter((line) => normalizeLineText(line.text).length > 0);
    const wordHeaderLines = wordHeaderLinesWithGeometry
      .map((line) => normalizeLineText(line.text))
      .filter((line) => line.length > 0);
    const wordBodyLines = wordBodyLinesWithGeometry
      .map((line) => normalizeLineText(line.text))
      .filter((line) => line.length > 0);
    const wordFooterLines = wordFooterLinesWithGeometry
      .map((line) => normalizeLineText(line.text))
      .filter((line) => line.length > 0);

    const zones = [
      { name: "header", editorLines: editorPage.headerLineTexts, wordLines: wordHeaderLines },
      { name: "body", editorLines: editorPage.bodyLineTexts, wordLines: wordBodyLines },
      { name: "footer", editorLines: editorPage.footerLineTexts, wordLines: wordFooterLines },
    ];

    for (const zone of zones) {
      if (zone.editorLines.length !== zone.wordLines.length) {
        mismatches.push(
          `Page ${pageIndex + 1} ${zone.name} line count mismatch: editor=${zone.editorLines.length}, word=${zone.wordLines.length}.`,
        );
        break;
      }

      for (let lineIndex = 0; lineIndex < zone.editorLines.length; lineIndex += 1) {
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

    const editorFirstBodyLine = editorPage.firstBodyLineGeometry;
    const wordFirstBodyLine = wordBodyLinesWithGeometry[0];
    if (editorFirstBodyLine && wordFirstBodyLine) {
      const checks = [
        { name: "x", editor: editorFirstBodyLine.x, word: wordFirstBodyLine.x },
        { name: "y", editor: editorFirstBodyLine.y, word: wordFirstBodyLine.y },
        { name: "width", editor: editorFirstBodyLine.width, word: wordFirstBodyLine.width },
        { name: "height", editor: editorFirstBodyLine.height, word: wordFirstBodyLine.height },
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
    throw new Error(support.reason ?? "Word layout parity support is not available.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "oasis-word-parity-"));
  const docxPath = join(tempDir, "document.docx");
  const pdfPath = join(tempDir, "document.pdf");

  try {
    await writeFile(docxPath, docxBuffer);
    await convertDocxToPdfWithWord(docxPath, pdfPath);

    const browserSnapshot = await collectEditorPageSnapshotsInBrowser(document);
    const editorPages = browserSnapshot?.pages ?? collectEditorPageSnapshots(document);
    const wordLayout = extractPdfLayout(pdfPath, support);
    const mismatches = compareWordAndEditorLayout(editorPages, wordLayout, options);

    return {
      editor: { pages: editorPages, domStyles: browserSnapshot?.domStyles },
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
    docxBuffer.buffer.slice(docxBuffer.byteOffset, docxBuffer.byteOffset + docxBuffer.byteLength),
  );
  return verifyWordLayoutParityFromDocx(document, docxBuffer, options);
}
