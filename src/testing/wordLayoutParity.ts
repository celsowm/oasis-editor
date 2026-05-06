import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EditorDocument } from "../core/model.js";
import { getPageBodyTop, getPageContentHeight } from "../core/model.js";
import { exportEditorDocumentToDocx } from "../export/docx/exportEditorDocumentToDocx.js";
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

interface EditorPageSnapshot {
  lineTexts: string[];
  bodyTop: number;
  bodyHeight: number;
}

export interface WordLayoutParityResult {
  editor: {
    pages: EditorPageSnapshot[];
  };
  word: WordPdfLayout;
  mismatches: string[];
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

    return {
      lineTexts,
      bodyTop: getPageBodyTop(page.pageSettings),
      bodyHeight: getPageContentHeight(page.pageSettings),
    };
  });
}

async function collectEditorPageSnapshotsInBrowser(document: EditorDocument): Promise<EditorPageSnapshot[] | null> {
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
        const importModule = (specifier: string) =>
          // `eval` keeps TypeScript from trying to resolve Vite-only browser module specifiers.
          (0, eval)(`import(${JSON.stringify(specifier)})`) as Promise<Record<string, any>>;
        const [{ projectDocumentLayout }, { getPageBodyTop, getPageContentHeight }] = await Promise.all([
          importModule("/src/ui/layoutProjection.ts"),
          importModule("/src/core/model.ts"),
        ]);
        const layout = projectDocumentLayout(inputDocument);
        return layout.pages.map((page: any) => ({
          lineTexts: page.blocks.flatMap((block: any) => {
            if (!block.layout) {
              return [];
            }

            return block.layout.lines
              .map((line: any) =>
                line.fragments.map((fragment: any) => fragment.text).join("").replace(/\s+/g, " ").trim(),
              )
              .filter((line: string) => line.length > 0);
          }),
          bodyTop: getPageBodyTop(page.pageSettings),
          bodyHeight: getPageContentHeight(page.pageSettings),
        }));
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
): string[] {
  const mismatches: string[] = [];

  if (editorPages.length !== wordLayout.pages.length) {
    mismatches.push(
      `Page count mismatch: editor=${editorPages.length}, word=${wordLayout.pages.length}.`,
    );
  }

  const pageCount = Math.min(editorPages.length, wordLayout.pages.length);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const editorPage = editorPages[pageIndex]!;
    const wordPage = wordLayout.pages[pageIndex]!;
    const wordLines = wordPage.lines
      .filter((line) => line.y >= editorPage.bodyTop * PX_TO_POINTS - 1)
      .map((line) => normalizeLineText(line.text))
      .filter((line) => line.length > 0);

    if (editorPage.lineTexts.length !== wordLines.length) {
      mismatches.push(
        `Page ${pageIndex + 1} line count mismatch: editor=${editorPage.lineTexts.length}, word=${wordLines.length}.`,
      );
      continue;
    }

    for (let lineIndex = 0; lineIndex < editorPage.lineTexts.length; lineIndex += 1) {
      const editorLine = editorPage.lineTexts[lineIndex]!;
      const wordLine = wordLines[lineIndex]!;
      if (editorLine !== wordLine) {
        mismatches.push(
          `Page ${pageIndex + 1} line ${lineIndex + 1} text mismatch: editor="${editorLine}" word="${wordLine}".`,
        );
        break;
      }
    }
  }

  return mismatches;
}

export async function verifyWordLayoutParity(document: EditorDocument): Promise<WordLayoutParityResult> {
  const support = detectWordLayoutParitySupport();
  if (!support.supported) {
    throw new Error(support.reason ?? "Word layout parity support is not available.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "oasis-word-parity-"));
  const docxPath = join(tempDir, "document.docx");
  const pdfPath = join(tempDir, "document.pdf");

  try {
    const docxBuffer = await exportEditorDocumentToDocx(document);
    await writeFile(docxPath, Buffer.from(docxBuffer));
    await convertDocxToPdfWithWord(docxPath, pdfPath);

    const editorPages =
      (await collectEditorPageSnapshotsInBrowser(document)) ??
      collectEditorPageSnapshots(document);
    const wordLayout = extractPdfLayout(pdfPath, support);
    const mismatches = compareWordAndEditorLayout(editorPages, wordLayout);

    return {
      editor: { pages: editorPages },
      word: wordLayout,
      mismatches,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
