#!/usr/bin/env node
// Deterministic import-graph checker for src/. Enforces two architectural rules
// established in docs/ANTI_PATTERNS_SOLID.md (Onda 2):
//
//   1. No module under src/core may import from src/ui (DIP / D1).
//   2. No strongly-connected component (import cycle) of size > 1 may exist in
//      src/, except those still on the shrinking allowlist below (D2). The goal
//      is an empty allowlist.
//
// Resolution mirrors the build: "@/x" -> src/x, relative specifiers resolve from
// the importing file, ".js"/".jsx" map to ".ts"/".tsx" (or "/index.*").
//
// Run: node ./scripts/check-import-graph.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

// Known cycles (SCCs) not yet broken. Each entry is the sorted list of
// src-relative module ids forming the cycle. Shrink this to empty over Onda 2.
const SCC_ALLOWLIST = [
  // Canvas painters recursion
  [
    "ui/canvas/CanvasTableLayout.ts",
    "ui/canvas/canvasParagraphPainter.ts",
    "ui/canvas/canvasTablePainter.ts",
    "ui/canvas/canvasTextBoxPainter.ts",
    "ui/canvas/verticalText.ts",
  ],
  // PDF draw recursion
  [
    "export/pdf/draw/drawFragment.ts",
    "export/pdf/draw/drawParagraph.ts",
    "export/pdf/draw/drawTable.ts",
    "export/pdf/draw/drawTextBoxShape.ts",
  ],
  // DOCX import recursion
  [
    "import/docx/nestedBlocks.ts",
    "import/docx/paragraphs.ts",
    "import/docx/tables.ts",
  ],
];

const EXTENSIONS = [".ts", ".tsx"];

/** Recursively collect .ts/.tsx files under dir. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.some((e) => entry.endsWith(e)) && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const id = (absPath) => relative(SRC, absPath).split("\\").join("/");

/** Resolve an import specifier to a src-relative module id, or null if external. */
function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) {
    base = join(SRC, spec.slice(2));
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = resolve(dirname(fromFile), spec);
  } else {
    return null; // node_modules / bare specifier
  }
  const noExt = base.replace(/\.(js|jsx|ts|tsx)$/, "");
  for (const ext of EXTENSIONS) {
    const cand = noExt + ext;
    try {
      if (statSync(cand).isFile()) return id(cand);
    } catch {}
  }
  for (const ext of EXTENSIONS) {
    const cand = join(noExt, "index" + ext);
    try {
      if (statSync(cand).isFile()) return id(cand);
    } catch {}
  }
  return null;
}

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g;

const files = walk(SRC);
/** @type {Map<string, Set<string>>} */
const graph = new Map();

for (const file of files) {
  const fromId = id(file);
  const src = readFileSync(file, "utf8");
  const deps = new Set();
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) {
    const dep = resolveSpecifier(m[1], file);
    if (dep && dep !== fromId) deps.add(dep);
  }
  graph.set(fromId, deps);
}

// Rule 1: core must not import ui.
const coreToUi = [];
for (const [from, deps] of graph) {
  if (!from.startsWith("core/")) continue;
  for (const dep of deps) {
    if (dep.startsWith("ui/")) coreToUi.push([from, dep]);
  }
}

// Rule 2: SCCs (Tarjan).
let index = 0;
const indices = new Map();
const low = new Map();
const onStack = new Set();
const stack = [];
const sccs = [];

function strongconnect(v) {
  indices.set(v, index);
  low.set(v, index);
  index++;
  stack.push(v);
  onStack.add(v);
  for (const w of graph.get(v) ?? []) {
    if (!indices.has(w)) {
      strongconnect(w);
      low.set(v, Math.min(low.get(v), low.get(w)));
    } else if (onStack.has(w)) {
      low.set(v, Math.min(low.get(v), indices.get(w)));
    }
  }
  if (low.get(v) === indices.get(v)) {
    const comp = [];
    let w;
    do {
      w = stack.pop();
      onStack.delete(w);
      comp.push(w);
    } while (w !== v);
    if (comp.length > 1) sccs.push(comp.sort());
  }
}

for (const v of graph.keys()) {
  if (!indices.has(v)) strongconnect(v);
}

const allowKey = (arr) => [...arr].sort().join("|");
const allowed = new Set(SCC_ALLOWLIST.map(allowKey));
const unexpectedSccs = sccs.filter((c) => !allowed.has(allowKey(c)));
const staleAllowlist = [...allowed].filter(
  (k) => !sccs.some((c) => allowKey(c) === k),
);

let failed = false;

if (coreToUi.length) {
  failed = true;
  console.error("\n[import-graph] core -> ui imports (forbidden):");
  for (const [from, dep] of coreToUi) console.error(`  ${from}  ->  ${dep}`);
}

if (unexpectedSccs.length) {
  failed = true;
  console.error("\n[import-graph] unexpected import cycles (SCC > 1):");
  for (const c of unexpectedSccs) {
    console.error(`  cycle (${c.length}): ${c.join(", ")}`);
  }
}

if (staleAllowlist.length) {
  console.warn(
    "\n[import-graph] allowlisted cycles no longer present (remove from SCC_ALLOWLIST):",
  );
  for (const k of staleAllowlist) console.warn(`  ${k.split("|").join(", ")}`);
}

if (failed) {
  console.error("\n[import-graph] FAIL");
  process.exit(1);
}

console.log(
  `[import-graph] OK — ${graph.size} modules, ${sccs.length} cycle(s) (all allowlisted), no core->ui edges.`,
);
