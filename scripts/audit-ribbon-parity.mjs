#!/usr/bin/env node
/* global process, console */
/**
 * Deterministic source-level Ribbon inventory and initial WordCraft parity guard.
 *
 * This intentionally proves wiring, NOT document semantics or WordCraft parity.
 * Literal commands in statically imported custom preset controls are scanned,
 * including custom content rendered inside a menu.
 * Dynamic commands and plugin-provided UI still require runtime coverage.
 *
 * Usage:
 *   node scripts/audit-ribbon-parity.mjs --check
 *   node scripts/audit-ribbon-parity.mjs --write
 *   node scripts/audit-ribbon-parity.mjs --json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  root,
  source,
} from "./lib/audit-ast.mjs";
import {
  collectBuiltinCommands,
  collectRegisteredCommands,
  collectPresetItems,
  collectPlacements,
  collectMenuCommands,
} from "./lib/audit-collect.mjs";
import {
  renderMatrix,
  validateUiEvidence,
} from "./lib/audit-matrix.mjs";

const catalog = JSON.parse(source("scripts/ribbon-parity/features.json"));
const wordcraft = JSON.parse(source("scripts/ribbon-parity/wordcraft-catalog.json"));
const references = JSON.parse(source("scripts/ribbon-parity/references.json"));

function main() {
  const builtin = collectBuiltinCommands();
  const registered = collectRegisteredCommands();
  const toolbar = collectPresetItems();
  const placements = collectPlacements();
  const menu = collectMenuCommands();
  const errors = [];
  const scenes = references.scenes ?? [];
  const sceneCapturePolicy = references.references?.wordSceneCapturePolicy;
  const sceneRelationships = new Set([
    "equivalent-command",
    "related-task",
    "no-captured-counterpart",
  ]);
  const sceneCaptureStatuses = new Set(["required", "captured", "not-applicable"]);
  const dimensionStatuses = new Set([
    "complete",
    "partial",
    "core-only",
    "menu-only",
    "ui-only",
    "preservation-only",
    "missing",
    "not-applicable",
    "unverified",
  ]);
  const sceneIds = new Set();
  const requiredSceneCaptures = scenes.filter((scene) => scene.wordCaptureStatus === "required").length;
  const capturedSceneCaptures = scenes.filter((scene) => scene.wordCaptureStatus === "captured").length;
  if (scenes.length !== 53) errors.push("Reference scene count differs from the reviewed baseline");
  if (sceneCapturePolicy?.baselineScope !== "tab-ribbon-only" || !Number.isInteger(sceneCapturePolicy?.baselineCaptureCount)) {
    errors.push("Word scene-capture baseline metadata is incomplete");
  }
  if (sceneCapturePolicy?.requiredSceneCount !== requiredSceneCaptures ||
      sceneCapturePolicy?.capturedSceneCount !== capturedSceneCaptures) {
    errors.push("Word scene-capture policy counts do not match scene statuses");
  }
  for (const scene of scenes) {
    if (!scene.id || sceneIds.has(scene.id)) errors.push("Missing or duplicate reference scene ID");
    sceneIds.add(scene.id);
    if (!sceneRelationships.has(scene.relationship)) errors.push(`${scene.id}: invalid reference relationship`);
    if (!scene.rationale?.trim()) errors.push(`${scene.id}: missing relationship rationale`);
    if (!sceneCaptureStatuses.has(scene.wordCaptureStatus)) errors.push(`${scene.id}: missing Word capture decision`);
    if (scene.wordCaptureStatus === "required" && scene.wordVerification !== "unverified") {
      errors.push(`${scene.id}: required Word capture is marked verified`);
    }
    if (scene.wordCaptureStatus === "captured" && scene.wordVerification === "unverified") {
      errors.push(`${scene.id}: captured Word scene lacks verification`);
    }
  }
  const ids = new Set();
  const crosswalkByWordcraftCommand = new Map();
  for (const feature of catalog.features) {
    if (!feature.wordcraftCommand) continue;
    const linked = crosswalkByWordcraftCommand.get(feature.wordcraftCommand) ?? [];
    linked.push(feature.id);
    crosswalkByWordcraftCommand.set(feature.wordcraftCommand, linked);
  }
  const wordcraftCommands = new Set();
  const wordcraftRowsByIndex = new Map();
  const computedSurfaces = new Map();
  for (const [offset, row] of wordcraft.rows.entries()) {
    if (row.index !== offset + 1 || !Number.isInteger(row.sourceLine) || !row.tab || !row.group || !row.name || !row.command || !Array.isArray(row.oasisFeatureIds)) {
      errors.push("Malformed WordCraft snapshot row");
      continue;
    }
    if (wordcraftRowsByIndex.has(row.index)) errors.push("Duplicate WordCraft source row: " + row.index);
    wordcraftRowsByIndex.set(row.index, row);
    wordcraftCommands.add(row.command);
    const surface = computedSurfaces.get(row.tab) ?? { features: 0, groups: new Set() };
    surface.features += 1;
    surface.groups.add(row.group);
    computedSurfaces.set(row.tab, surface);
    const expectedLinks = crosswalkByWordcraftCommand.get(row.command) ?? [];
    if (JSON.stringify(row.oasisFeatureIds) !== JSON.stringify(expectedLinks)) {
      errors.push(`Stale crosswalk links on WordCraft row ${row.index}`);
    }
  }
  if (wordcraft.schemaVersion !== 1) errors.push("Unsupported WordCraft snapshot schema");
  if (wordcraft.source?.repository !== "storytold/wordcraft") errors.push("Unexpected WordCraft snapshot repository");
  if (!/^[0-9a-f]{40}$/.test(wordcraft.source?.commit ?? "")) errors.push("WordCraft snapshot commit is not a pinned Git SHA");
  if (!/^[0-9a-f]{64}$/.test(wordcraft.source?.catalogSha256 ?? "") || !/^[0-9a-f]{64}$/.test(wordcraft.source?.ribbonSha256 ?? "")) {
    errors.push("WordCraft snapshot source digests are invalid");
  }
  if (wordcraft.source?.commit !== catalog.baseline.wordcraftCommit) errors.push("WordCraft snapshot commit differs from the feature catalog baseline");
  if (wordcraft.rows.length !== wordcraft.counts?.features) errors.push("WordCraft snapshot feature count is inconsistent");
  if (wordcraftRowsByIndex.size !== wordcraft.rows.length) errors.push("WordCraft snapshot source row indexes are not unique");
  if (wordcraft.counts?.surfaces !== Object.keys(wordcraft.surfaces ?? {}).length) errors.push("WordCraft snapshot surface count is inconsistent");
  if (JSON.stringify(Object.keys(wordcraft.surfaces ?? {}).sort()) !== JSON.stringify([...computedSurfaces.keys()].sort())) {
    errors.push("WordCraft snapshot surface names are inconsistent");
  }
  const computedGroupCount = [...computedSurfaces.values()].reduce((sum, surface) => sum + surface.groups.size, 0);
  if (wordcraft.counts?.groups !== computedGroupCount) errors.push("WordCraft snapshot group count is inconsistent");
  if (wordcraft.counts?.defaultTabs !== wordcraft.defaultTabs?.length ||
      wordcraft.counts?.contextualTabs !== wordcraft.contextualTabs?.length ||
      wordcraft.counts?.representedDefaultTabs !== wordcraft.defaultTabs.filter((tab) => computedSurfaces.has(tab)).length ||
      wordcraft.counts?.representedContextualTabs !== wordcraft.contextualTabs.filter((tab) => computedSurfaces.has(tab)).length ||
      wordcraft.counts?.auxiliarySurfaces !== wordcraft.counts?.surfaces - wordcraft.counts?.representedDefaultTabs - wordcraft.counts?.representedContextualTabs ||
      JSON.stringify(wordcraft.unrepresentedDefaultTabs) !== JSON.stringify(wordcraft.defaultTabs.filter((tab) => !computedSurfaces.has(tab))) ||
      JSON.stringify(wordcraft.unrepresentedContextualTabs) !== JSON.stringify(wordcraft.contextualTabs.filter((tab) => !computedSurfaces.has(tab)))) {
    errors.push("WordCraft snapshot tab/surface counts are inconsistent");
  }
  for (const [tab, computed] of computedSurfaces) {
    const recorded = wordcraft.surfaces?.[tab];
    const expectedKind = wordcraft.defaultTabs.includes(tab) ? "default-tab" : wordcraft.contextualTabs.includes(tab) ? "contextual-tab" : "auxiliary-surface";
    if (recorded?.features !== computed.features || recorded?.groups !== computed.groups.size || recorded?.kind !== expectedKind) {
      errors.push("WordCraft snapshot surface summary is inconsistent: " + tab);
    }
  }
  const linkedRows = wordcraft.rows.filter((row) => row.oasisFeatureIds.length > 0).length;
  if (wordcraft.counts?.linkedRows !== linkedRows) errors.push("WordCraft snapshot linked-row count is inconsistent");
  const commandlessStatuses = new Set(["ui-only", "missing", "not-applicable"]);
  for (const feature of catalog.features) {
    if (ids.has(feature.id)) errors.push("Duplicate feature ID: " + feature.id);
    ids.add(feature.id);
    if (feature.wordcraftCommand && !wordcraftCommands.has(feature.wordcraftCommand)) {
      errors.push(feature.id + ": WordCraft command is absent from pinned catalog: " + feature.wordcraftCommand);
    }
    if (feature.oasisCommand) {
      if (!builtin.has(feature.oasisCommand)) {
        errors.push(feature.id + ": missing built-in command " + feature.oasisCommand);
      }
      if (!registered.has(feature.oasisCommand)) {
        errors.push(feature.id + ": command has no Essentials registration: " + feature.oasisCommand);
      }
    } else if (!commandlessStatuses.has(feature.status)) {
      errors.push(feature.id + ": status requires an Oasis command");
    }
    for (const dimension of ["exposure", "semantics", "persistence"]) {
      if (feature[dimension] !== undefined && !dimensionStatuses.has(feature[dimension])) {
        errors.push(feature.id + ": invalid " + dimension + " classification");
      }
    }
    if (feature.status === "missing" || feature.status === "not-applicable") {
      if (feature.oasisCommand || feature.ribbonId || feature.uiPath || feature.uiEvidence) {
        errors.push(feature.id + ": commandless classification conflicts with an Oasis path");
      }
      if (!feature.notes?.trim()) {
        errors.push(feature.id + ": commandless classification needs a rationale");
      }
      continue;
    }
    if (feature.status === "core-only") {
      if (feature.exposure !== "core-only") {
        errors.push(feature.id + ": core-only status needs an explicit exposure classification");
      }
      if (feature.ribbonId || feature.uiPath || [...toolbar.values()].some((item) =>
        (item.ribbonCommands ?? []).includes(feature.oasisCommand))) {
        errors.push(feature.id + ": core-only status conflicts with an observed UI path");
      }
      if (menu.has(feature.oasisCommand)) {
        errors.push(feature.id + ": core-only command is reachable from the menubar");
      }
      continue;
    }
    if (feature.status === "menu-only") {
      if (feature.exposure !== "menu-only") {
        errors.push(feature.id + ": menu-only status needs an explicit exposure classification");
      }
      if (feature.ribbonId) {
        errors.push(feature.id + ": menu-only status cannot claim a direct Ribbon item");
      }
      validateUiEvidence(root, feature, errors);
      continue;
    }
    if (feature.status === "ui-only") {
      if (feature.exposure !== "ui-only") {
        errors.push(feature.id + ": ui-only status needs an explicit exposure classification");
      }
      if (feature.oasisCommand) {
        errors.push(feature.id + ": ui-only status cannot claim a shared Oasis command");
      }
      if (feature.ribbonId) {
        errors.push(feature.id + ": ui-only status cannot claim a command-backed Ribbon item");
      }
      validateUiEvidence(root, feature, errors);
      continue;
    }
    const item = toolbar.get(feature.ribbonId);
    if (!item) errors.push(feature.id + ": missing Ribbon item " + feature.ribbonId);
    else if (!(item.ribbonCommands ?? []).includes(feature.oasisCommand)) {
      errors.push(feature.id + ": wrong command " + (item.command ?? "<none>"));
    }
    const placement = placements.get(feature.ribbonId) ??
      (item?.parentId ? placements.get(item.parentId) : undefined);
    if (!placement || placement.tab !== feature.tab || placement.group !== feature.group) {
      errors.push(feature.id + ": incorrect placement");
    }
  }

  const reachable = [...builtin].map((command) => ({
    command,
    channel: [...toolbar.values()].some((i) =>
      i.ribbonCommands?.includes(command))
      ? "direct-ribbon"
      : menu.has(command) ? "visible-menu" : "not-statically-verified",
  }));

  const snapshot = renderMatrix(catalog, wordcraft);
  const target = resolve(root, "docs/ribbon-parity-matrix.md");
  if (process.argv.includes("--write")) writeFileSync(target, snapshot);
  if (process.argv.includes("--check") && readFileSync(target, "utf8") !== snapshot) {
    errors.push("Matrix out of date; run npm run audit:ribbon:write");
  }
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      catalogFeatures: catalog.features.length,
      wordcraftCatalog: {
        commit: wordcraft.source.commit,
        features: wordcraft.counts.features,
        surfaces: wordcraft.counts.surfaces,
        groups: wordcraft.counts.groups,
        linkedRows,
      },
      builtinCommands: builtin.size,
      registeredCommands: registered.size,
      toolbarItemsScanned: toolbar.size,
      records: reachable,
    }, null, 2) + "\n");
  } else {
    console.log(`Ribbon audit: ${catalog.features.length} Oasis crosswalk features against ${wordcraft.counts.features} pinned WordCraft entries (${linkedRows} linked rows); ${builtin.size} built-ins; ${toolbar.size} statically scanned items.`);
  }
  if (errors.length) {
    for (const error of errors) console.error("ERROR: " + error);
    process.exitCode = 1;
  }
}
main();
