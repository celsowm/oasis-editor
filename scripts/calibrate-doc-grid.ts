#!/usr/bin/env node
/**
 * Calibrate the implicit Word docGrid line-pitch ratio.
 *
 * Usage:
 *   node scripts/calibrate-doc-grid.mjs [docxPath] [--ratios=0.85,0.86,...] [--no-pdf] [--browser]
 *
 * Defaults:
 *   - docxPath: src/__tests__/word-parity/fixtures/lorem_ipsum_complex_document.docx
 *   - ratios:  0.85 → 1.00 in steps of 0.01
 *
 * The script:
 *   1. Converts the DOCX to PDF via Word (cached in test-results/calibration/).
 *   2. Extracts Word's page-1 text positions from the PDF text matrices.
 *   3. For each candidate ratio, re-imports the DOCX with that
 *      `implicitDocGridRatio` and projects the layout in Node, dumping page-1
 *      line count + last-line text + bodyTop / footerTop / page-1 last-line
 *      bottom (px).
 *   4. Prints a summary so you can pick the ratio whose page-1 last line
 *      matches Word's page-1 last line.
 *
 * NOTE: Node-side layout uses a font fallback that wraps text slightly
 * differently from a real browser, so the absolute *line widths* may differ
 * from Word, but the *vertical packing* (which is what the docGrid ratio
 * controls) is faithful enough to pick a ratio.
 *
 * Pass `--browser` to also run the browser pipeline once with the FIRST
 * candidate ratio (slow; spins up Vite + Playwright). Use this to confirm the
 * winner from the Node sweep against real DOM measurement.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importDocxToEditorDocument } from "../src/import/docx/importDocxToEditorDocument.ts";
import { projectDocumentLayout } from "../src/ui/layoutProjection.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const DEFAULT_DOCX = join(
  PROJECT_ROOT,
  "src/__tests__/word-parity/fixtures/lorem_ipsum_complex_document.docx",
);
const CACHE_DIR = join(PROJECT_ROOT, "test-results", "calibration");

const argv = process.argv.slice(2);
let docxPath = DEFAULT_DOCX;
let ratios = [];
let runBrowser = false;
let skipPdf = false;
for (const arg of argv) {
  if (arg.startsWith("--ratios=")) {
    ratios = arg
      .slice("--ratios=".length)
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  } else if (arg === "--browser") {
    runBrowser = true;
  } else if (arg === "--no-pdf") {
    skipPdf = true;
  } else if (!arg.startsWith("--")) {
    docxPath = resolve(arg);
  }
}
if (ratios.length === 0) {
  for (let r = 0.85; r <= 1.0001; r += 0.01) {
    ratios.push(Math.round(r * 1000) / 1000);
  }
}

if (!existsSync(docxPath)) {
  console.error(`ERROR: docx not found: ${docxPath}`);
  process.exit(2);
}

mkdirSync(CACHE_DIR, { recursive: true });
const pdfPath = join(CACHE_DIR, `${cacheKey(docxPath)}.pdf`);

function cacheKey(filePath) {
  return filePath.replace(/[\\\/:]/g, "_").replace(/\.docx$/i, "");
}

function findWordExe() {
  const candidates = [
    "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}
function ensurePdf() {
  if (skipPdf) return null;
  const docxStat = statSync(docxPath);
  if (existsSync(pdfPath) && statSync(pdfPath).mtimeMs >= docxStat.mtimeMs) {
    return pdfPath;
  }
  const wordExe = findWordExe();
  if (!wordExe) {
    console.warn("Word not found; skipping PDF extraction.");
    return null;
  }
  const convertScript = join(PROJECT_ROOT, "scripts", "convert-docx-to-pdf.ps1");
  console.error(`Converting DOCX → PDF (one-shot, cached at ${pdfPath})...`);
  const r = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      convertScript,
      "-DocxPath",
      docxPath,
      "-PdfPath",
      pdfPath,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (r.status !== 0) {
    console.warn(`Word PDF conversion failed:\n${r.stdout}\n${r.stderr}`);
    return null;
  }
  return pdfPath;
}

function extractWordPage1(pdf) {
  if (!pdf) return null;
  const extractScript = join(PROJECT_ROOT, "scripts", "extract-pdf-lines.mjs");
  const r = spawnSync(process.execPath, [extractScript, pdf], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.warn(`PDF extract failed:\n${r.stdout}\n${r.stderr}`);
    return null;
  }
  const layout = JSON.parse(r.stdout);
  const page1 = layout.pages?.[0];
  if (!page1) return null;
  const lines = page1.lines
    .map((l) => ({
      text: l.text.replace(/\s+/g, " ").trim(),
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
    }))
    .filter((l) => l.text.length > 0);
  return {
    pageWidth: page1.width,
    pageHeight: page1.height,
    lines,
  };
}

function summarizeWord(word) {
  if (!word || word.lines.length === 0) return null;
  // Word page footer (page number "1") sits low; treat last text-rich line as
  // the body's last line and the next-to-last separator as bodyTop estimate.
  const bodyLines = word.lines.filter(
    (l) => !/^Página$/i.test(l.text) && !/^\d+$/.test(l.text.trim()),
  );
  const footerLines = word.lines.filter(
    (l) => /^Página$/i.test(l.text) || /^\d+$/.test(l.text.trim()),
  );
  const first = bodyLines[0];
  const last = bodyLines[bodyLines.length - 1];
  const footerTopPt = footerLines[0]?.y;
  return {
    pageHeightPt: word.pageHeight,
    bodyTopPt: first?.y,
    bodyBottomPt: last ? last.y + last.height : undefined,
    footerTopPt,
    bodyLineCount: bodyLines.length,
    firstLineText: first?.text,
    lastLineText: last?.text,
    bodyLineYs: bodyLines.map((l) => l.y),
  };
}

function computeLineHeights(blocks) {
  const result = [];
  function walk(list) {
    for (const block of list) {
      if (block.type === "paragraph") {
        result.push(block.style?.lineHeight);
      } else if (block.type === "table") {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            walk(cell.blocks);
          }
        }
      }
    }
  }
  walk(blocks);
  return result;
}

async function runRatioSweep(buffer) {
  const rows = [];
  for (const ratio of ratios) {
    const doc = await importDocxToEditorDocument(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      { implicitDocGridRatio: ratio },
    );
    const layout = projectDocumentLayout(doc);
    const page1 = layout.pages[0];
    const bodyLines = (page1?.blocks ?? []).flatMap((block) =>
      block.layout?.lines?.map((line) => ({
        text: line.fragments
          .map((f) => f.text)
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
        top: line.top,
        height: line.height,
      })) ?? [],
    );
    const filtered = bodyLines.filter((l) => l.text.length > 0);
    const last = filtered[filtered.length - 1];
    const lineHeights = computeLineHeights(doc.sections?.[0]?.blocks ?? doc.blocks);
    const justifyHeights = lineHeights.filter((h) => typeof h === "number");
    rows.push({
      ratio,
      pageBodyTop: page1?.bodyTop,
      pageFooterTop: page1?.bodyBottom,
      lineCount: filtered.length,
      lastTop: last?.top,
      lastHeight: last?.height,
      lastBottom: last ? last.top + last.height : undefined,
      lastText: last?.text,
      lhMin: justifyHeights.length ? Math.min(...justifyHeights) : undefined,
      lhMax: justifyHeights.length ? Math.max(...justifyHeights) : undefined,
      lhCount: justifyHeights.length,
    });
  }
  return rows;
}

function compareRows(rows, wordSummary) {
  const target = wordSummary?.lastLineText;
  return rows.map((row) => ({
    ...row,
    matchesWord:
      target && row.lastText
        ? target.startsWith(row.lastText.slice(0, 20)) ||
          row.lastText.startsWith(target.slice(0, 20))
        : undefined,
  }));
}

function fmt(value, width = 8, digits = 3) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—".padStart(width);
  return typeof value === "number" ? value.toFixed(digits).padStart(width) : String(value);
}

async function main() {
  console.error(`DOCX  : ${docxPath}`);
  console.error(`Ratios: ${ratios.join(", ")}`);
  const pdf = ensurePdf();
  const word = extractWordPage1(pdf);
  const wordSummary = summarizeWord(word);
  if (wordSummary) {
    console.log("\n=== Word PDF page 1 ===");
    console.log(`  pageHeight = ${fmt(wordSummary.pageHeightPt)} pt`);
    console.log(`  bodyTop    = ${fmt(wordSummary.bodyTopPt)} pt`);
    console.log(`  bodyBottom = ${fmt(wordSummary.bodyBottomPt)} pt`);
    console.log(`  footerTop  = ${fmt(wordSummary.footerTopPt)} pt`);
    console.log(`  body lines = ${wordSummary.bodyLineCount}`);
    console.log(`  last line  = "${wordSummary.lastLineText}"`);
  } else {
    console.log("\n=== Word PDF page 1 === (skipped)");
  }

  const buffer = readFileSync(docxPath);
  const rows = await runRatioSweep(buffer);
  const enriched = compareRows(rows, wordSummary);
  console.log("\n=== Editor (node layout) page 1 sweep ===");
  console.log(
    [
      "ratio".padStart(6),
      "lines".padStart(6),
      "bodyTop".padStart(8),
      "footTop".padStart(8),
      "lastBot".padStart(8),
      "lh-min".padStart(7),
      "lh-max".padStart(7),
      "match",
      "lastText",
    ].join("  "),
  );
  for (const row of enriched) {
    console.log(
      [
        row.ratio.toFixed(3).padStart(6),
        String(row.lineCount).padStart(6),
        fmt(row.pageBodyTop, 8, 1),
        fmt(row.pageFooterTop, 8, 1),
        fmt(row.lastBottom, 8, 1),
        fmt(row.lhMin, 7, 4),
        fmt(row.lhMax, 7, 4),
        row.matchesWord === undefined ? "  ?  " : row.matchesWord ? " YES " : "  no ",
        (row.lastText ?? "").slice(0, 70),
      ].join("  "),
    );
  }

  if (runBrowser) {
    const ratio = ratios[0];
    process.env.OASIS_WORD_IMPLICIT_DOC_GRID_RATIO = String(ratio);
    console.log(`\n=== Browser parity (ratio=${ratio}) ===`);
    const { verifyImportedDocxWordLayoutParity } = await import(
      "../src/testing/wordLayoutParity.ts"
    );
    const result = await verifyImportedDocxWordLayoutParity(docxPath);
    const editorPage1 = result.editor.pages?.[0];
    console.log(`  editor page1 bodyTop  = ${fmt(editorPage1?.bodyTop)}`);
    console.log(`  editor page1 footerTop= ${fmt(editorPage1?.footerTop)}`);
    console.log(`  editor page1 lines    = ${editorPage1?.bodyLineTexts.length}`);
    console.log(
      `  editor page1 last     = "${editorPage1?.bodyLineTexts.at(-1) ?? ""}"`,
    );
    console.log(`  mismatches: ${result.mismatches.length}`);
    for (const m of result.mismatches.slice(0, 5)) console.log(`    - ${m}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
