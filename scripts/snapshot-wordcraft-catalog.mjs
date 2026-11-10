#!/usr/bin/env node
/** Snapshot the pinned WordCraft command catalog without inferring parity. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(
  process.env.WORDCRAFT_ROOT ?? resolve(root, "../wordcraft"),
);
const outputPath = resolve(
  root,
  "scripts/ribbon-parity/wordcraft-catalog.json",
);
const sourceFiles = {
  catalog: "crates/engine/src/catalog.rs",
  ribbon: "crates/engine/src/ribbon.rs",
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function readSource(relativePath) {
  const path = resolve(sourceRoot, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing WordCraft source file: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function parseCatalog(source) {
  const marker = 'pub const CATALOG: &str = "\\\n';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("Could not locate WordCraft CATALOG string");
  const contentStart = start + marker.length;
  const end = source.indexOf('\n";', contentStart);
  if (end < 0) throw new Error("Could not locate WordCraft CATALOG terminator");
  const firstSourceLine = source.slice(0, contentStart).split("\n").length;

  const rowLines = source
    .slice(contentStart, end)
    .split("\n")
    .map((line, lineIndex) => ({ line, lineIndex }))
    .filter(({ line }) => line.length > 0);
  return rowLines.map(({ line, lineIndex }, index) => {
    const sourceLine = firstSourceLine + lineIndex;
    const parts = line.split("|");
    if (parts.length !== 4 || parts.some((part) => !part.trim())) {
      throw new Error(`Malformed WordCraft catalog row at line ${sourceLine}`);
    }
    const [tab, group, name, command] = parts.map((part) => part.trim());
    return {
      index: index + 1,
      sourceLine,
      tab,
      group,
      name,
      command,
    };
  });
}

function parseRustStringArray(source, constantName) {
  const marker = `pub const ${constantName}:`;
  const declarationStart = source.indexOf(marker);
  if (declarationStart < 0) {
    throw new Error(`Missing WordCraft ${constantName} declaration`);
  }
  const arrayStart = source.indexOf("[", declarationStart);
  const arrayEnd = source.indexOf("];", arrayStart);
  if (arrayStart < 0 || arrayEnd < 0) {
    throw new Error(`Malformed WordCraft ${constantName} array`);
  }
  return [
    ...source
      .slice(arrayStart + 1, arrayEnd)
      .matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g),
  ].map((match) => JSON.parse(`"${match[1]}"`));
}

function buildSnapshot() {
  const remoteUrl = execFileSync(
    "git",
    ["-C", sourceRoot, "remote", "get-url", "origin"],
    { encoding: "utf8" },
  )
    .trim()
    .replace(/\.git$/, "")
    .replace(/^git@github\.com:/, "")
    .replace(/^https:\/\/github\.com\//, "");
  if (remoteUrl !== "storytold/wordcraft") {
    throw new Error(`Expected WordCraft checkout origin, found ${remoteUrl}`);
  }
  const catalogSource = readSource(sourceFiles.catalog);
  const ribbonSource = readSource(sourceFiles.ribbon);
  const rows = parseCatalog(catalogSource);
  const defaultTabs = parseRustStringArray(ribbonSource, "TABS");
  const contextualTabs = parseRustStringArray(ribbonSource, "CONTEXTUAL_TABS");
  const tabs = new Set([...defaultTabs, ...contextualTabs]);
  const surfaces = [...new Set(rows.map((row) => row.tab))];
  const representedDefaultTabs = defaultTabs.filter((tab) =>
    surfaces.includes(tab),
  );
  const representedContextualTabs = contextualTabs.filter((tab) =>
    surfaces.includes(tab),
  );
  const auxiliarySurfaces = surfaces.filter((surface) => !tabs.has(surface));
  const counts = Object.fromEntries(
    surfaces.map((tab) => {
      const tabRows = rows.filter((row) => row.tab === tab);
      return [
        tab,
        {
          features: tabRows.length,
          groups: new Set(tabRows.map((row) => row.group)).size,
          kind: tabs.has(tab)
            ? defaultTabs.includes(tab)
              ? "default-tab"
              : "contextual-tab"
            : "auxiliary-surface",
        },
      ];
    }),
  );

  const knownFeatures = JSON.parse(
    readFileSync(resolve(root, "scripts/ribbon-parity/features.json"), "utf8"),
  ).features;
  const featureIdsByCommand = new Map();
  for (const feature of knownFeatures) {
    if (!feature.wordcraftCommand) continue;
    const ids = featureIdsByCommand.get(feature.wordcraftCommand) ?? [];
    ids.push(feature.id);
    featureIdsByCommand.set(feature.wordcraftCommand, ids);
  }

  return {
    schemaVersion: 1,
    source: {
      repository: "storytold/wordcraft",
      commit: execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      catalogPath: sourceFiles.catalog,
      catalogSha256: sha256(catalogSource),
      ribbonPath: sourceFiles.ribbon,
      ribbonSha256: sha256(ribbonSource),
    },
    interpretation:
      "Source inventory only. A linked Oasis feature is an existing command crosswalk, not proof of semantic, persistence, layout, or accessibility parity. Empty links remain unclassified, not missing.",
    counts: {
      features: rows.length,
      surfaces: surfaces.length,
      defaultTabs: defaultTabs.length,
      contextualTabs: contextualTabs.length,
      representedDefaultTabs: representedDefaultTabs.length,
      representedContextualTabs: representedContextualTabs.length,
      auxiliarySurfaces: auxiliarySurfaces.length,
      groups: new Set(rows.map((row) => `${row.tab}\u0000${row.group}`)).size,
      linkedRows: rows.filter((row) => featureIdsByCommand.has(row.command))
        .length,
    },
    defaultTabs,
    contextualTabs,
    unrepresentedDefaultTabs: defaultTabs.filter(
      (tab) => !surfaces.includes(tab),
    ),
    unrepresentedContextualTabs: contextualTabs.filter(
      (tab) => !surfaces.includes(tab),
    ),
    surfaces: counts,
    rows: rows.map((row) => ({
      ...row,
      oasisFeatureIds: featureIdsByCommand.get(row.command) ?? [],
    })),
  };
}

const snapshot = buildSnapshot();
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, serialized);
  console.log(
    `Wrote ${snapshot.counts.features} WordCraft entries from ${snapshot.source.commit}.`,
  );
} else if (process.argv.includes("--check")) {
  const existing = readFileSync(outputPath, "utf8");
  if (existing !== serialized) {
    console.error(
      "WordCraft catalog snapshot is stale; run npm run audit:ribbon:wordcraft:write",
    );
    process.exitCode = 1;
  } else {
    console.log(
      `WordCraft catalog snapshot: ${snapshot.counts.features} features, ${snapshot.counts.surfaces} surfaces, ${snapshot.counts.linkedRows} existing crosswalk rows.`,
    );
  }
} else {
  console.log(
    "Pass --write to refresh the pinned source snapshot or --check to compare it.",
  );
}
