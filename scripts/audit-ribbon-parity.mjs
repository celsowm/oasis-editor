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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");
const catalog = JSON.parse(source("scripts/ribbon-parity/features.json"));
const wordcraft = JSON.parse(source("scripts/ribbon-parity/wordcraft-catalog.json"));
const references = JSON.parse(source("scripts/ribbon-parity/references.json"));

const getName = (name) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
const getProperty = (node, key) =>
  node && ts.isObjectLiteralExpression(node)
    ? node.properties.find((prop) =>
        ts.isPropertyAssignment(prop) && getName(prop.name) === key)
    : undefined;
const getExpression = (node, key) => getProperty(node, key)?.initializer;
const getString = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
const getCommand = (node) =>
  getString(node) ??
  (node && ts.isObjectLiteralExpression(node)
    ? getString(getExpression(node, "name"))
    : undefined);

function parse(path) {
  return ts.createSourceFile(
    path,
    source(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function resolveImportedSource(importerPath, specifier) {
  const unresolved = specifier.startsWith("@/")
    ? resolve(root, "src", specifier.slice(2))
    : resolve(root, dirname(importerPath), specifier);
  const candidates = unresolved.endsWith(".js")
    ? [
        unresolved.slice(0, -3) + ".ts",
        unresolved.slice(0, -3) + ".tsx",
        unresolved,
      ]
    : [
        unresolved + ".ts",
        unresolved + ".tsx",
        resolve(unresolved, "index.ts"),
        resolve(unresolved, "index.tsx"),
      ];
  const resolvedPath = candidates.find(existsSync);
  return resolvedPath ? relative(root, resolvedPath) : undefined;
}

function collectNamedImportSources(file, importerPath) {
  const imports = new Map();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const path = resolveImportedSource(importerPath, statement.moduleSpecifier.text);
    if (!path) continue;
    for (const binding of bindings.elements) {
      imports.set(binding.name.text, path);
    }
  }
  return imports;
}

function findImportedComponentSource(render, imports) {
  let componentSource;
  const visit = (node) => {
    if (
      !componentSource &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      imports.has(node.expression.text)
    ) {
      componentSource = imports.get(node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  if (render) visit(render);
  return componentSource;
}

function collectExecutedCommands(path) {
  const file = parse(path);
  const commands = new Set();
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "execute"
    ) {
      const command = getString(node.arguments[0]);
      if (command) commands.add(command);
    }
    // Some custom controls dispatch from a static option object, for example
    // `execute(option.command)` where `option` comes from a literal array.
    if (ts.isPropertyAssignment(node) && getName(node.name) === "command") {
      const command = getString(node.initializer);
      if (command) commands.add(command);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...commands];
}

function findArrayVariable(file, variable) {
  let found;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === variable) {
      let value = node.initializer;
      while (value && (ts.isAsExpression(value) || ts.isParenthesizedExpression(value))) {
        value = value.expression;
      }
      if (value && ts.isArrayLiteralExpression(value)) {
        found = value;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!found) throw new Error("Missing array declaration: " + variable);
  return found;
}

function findObjectVariable(file, variable) {
  let found;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(file) === variable &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      found = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!found) throw new Error("Missing object declaration: " + variable);
  return found;
}

const RUNTIME_COMMAND_GROUPS = [
  "src/plugins/internal/essentialsCommandGroups/coreFormatting.ts",
  "src/plugins/internal/essentialsCommandGroups/documentAndBrowser.ts",
  "src/plugins/internal/essentialsCommandGroups/paragraphAndSection.ts",
  "src/plugins/internal/essentialsCommandGroups/table.ts",
  "src/plugins/internal/essentialsCommandGroups/design.ts",
  "src/plugins/internal/essentialsCommandGroups/headerFooter.ts",
  "src/plugins/internal/essentialsCommandGroups/bookmark.ts",
  "src/plugins/internal/essentialsCommandGroups/fields.ts",
];

/** Built-in declarations are not registrations: require a command builder in a live group. */
function collectRegisteredCommands() {
  const registered = new Set();
  for (const path of RUNTIME_COMMAND_GROUPS) {
    const file = parse(path);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["command", "actionCommand", "valueCommand"].includes(node.expression.text)
      ) {
        const id = getString(node.arguments[0]);
        if (id) registered.add(id);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return registered;
}

function collectBuiltinCommands() {
  const file = parse("src/core/commands/builtinCommands.ts");
  return new Set(
    findArrayVariable(file, "OASIS_BUILTIN_COMMANDS")
      .elements.map(getString)
      .filter(Boolean),
  );
}

function collectPresetItems() {
  const presetPath = "src/ui/components/Toolbar/presets/defaultToolbar.ts";
  const file = parse(presetPath);
  const componentImports = collectNamedImportSources(file, presetPath);
  const items = new Map();

  const addItem = (node, parentId = undefined) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const id = getString(getExpression(node, "id"));
    if (!id) return;
    if (items.has(id)) throw new Error("Duplicate toolbar item: " + id);
    const kind = getString(getExpression(node, "type"));
    const render = getExpression(node, "render");
    const content = getExpression(node, "content");
    const contentKind = getString(getExpression(content, "kind"));
    const contentRender = getExpression(content, "render");
    const componentSource = kind === "custom"
      ? findImportedComponentSource(render, componentImports)
      : contentKind === "custom"
        ? findImportedComponentSource(contentRender, componentImports)
        : undefined;
    const customCommands = componentSource
      ? collectExecutedCommands(componentSource)
      : [];
    const ribbonCommands = [
      getCommand(getExpression(node, "command")),
      getCommand(getExpression(node, "paragraphCommand")),
      getCommand(getExpression(node, "characterCommand")),
      ...customCommands,
    ].filter(Boolean);
    items.set(id, {
      command: getCommand(getExpression(node, "command")),
      ribbonCommands,
      kind,
      source: "preset",
      parentId,
    });
    for (const key of ["menu", "content"]) {
      const menu = getExpression(node, key);
      const nested = menu && ts.isObjectLiteralExpression(menu)
        ? getExpression(menu, "items")
        : undefined;
      if (nested && ts.isArrayLiteralExpression(nested)) {
        for (const child of nested.elements) addItem(child, id);
      }
    }
  };
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(file) === "items" &&
      node.expression.name.text === "push"
    ) {
      for (const arg of node.arguments) addItem(arg);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  // These arrays are currently rendered by active loops in the preset.
  const specsFile = parse("src/ui/components/Toolbar/presets/defaultToolbar/buttonSpecs.ts");
  for (const variable of ["ALIGN_BUTTONS", "LIST_BUTTONS", "TABLE_LAYOUT_BUTTONS"]) {
    for (const node of findArrayVariable(specsFile, variable).elements) {
      const id = getString(getExpression(node, "id")) ?? getString(getExpression(node, "testId"));
      const command = getCommand(getExpression(node, "command"));
      if (!id || !command) throw new Error("Malformed static button spec: " + variable);
      if (items.has(id)) throw new Error("Duplicate toolbar item: " + id);
      items.set(id, {
        command,
        ribbonCommands: [command],
        kind: "button/toggle",
        source: variable,
      });
    }
  }
  return items;
}

function collectPlacements() {
  const file = parse("src/ui/components/Toolbar/presets/defaultToolbar/ribbonPlacements.ts");
  const root = findObjectVariable(file, "RIBBON_PLACEMENTS");
  const placements = new Map();
  for (const node of root.properties) {
    if (!ts.isPropertyAssignment(node)) continue;
    const id = getName(node.name);
    if (!id || !ts.isObjectLiteralExpression(node.initializer)) continue;
    placements.set(id, {
      tab: getString(getExpression(node.initializer, "tab")),
      group: getString(getExpression(node.initializer, "group")),
    });
  }
  return placements;
}

function collectMenuCommands() {
  const file = parse("src/ui/components/Menubar/defaultMenuItems.ts");
  const visible = new Set();
  for (const item of findArrayVariable(file, "defaultMenuItems").elements) {
    const command = getCommand(getExpression(item, "command"));
    const hidden = getExpression(item, "hidden");
    if (command && hidden?.kind !== ts.SyntaxKind.TrueKeyword) visible.add(command);
  }
  return visible;
}

export function renderMatrix(data) {
  const code = (value) => "`" + value + "`";
  const dimension = (feature, key) =>
    feature[key] ??
    (key === "exposure" && feature.ribbonId ? "partial" : "unverified");
  const surface = (feature) =>
    feature.uiPath ??
    (feature.ribbonId ? code(feature.tab + "/" + feature.group) : "—");
  const rows = data.features.map((feature) =>
    "| " + code(feature.id) +
    " | " + (feature.wordcraftCommand ? code(feature.wordcraftCommand) : "—") +
    " | " + (feature.oasisCommand ? code(feature.oasisCommand) : "—") +
    " | " + surface(feature) +
    " | " + feature.status +
    " | " + dimension(feature, "exposure") +
    " | " + dimension(feature, "semantics") +
    " | " + dimension(feature, "persistence") + " |"
  ).join("\n");
  const questions = data.features.map((feature, index) =>
    (index + 1) + ". **" + feature.id + ":** " + feature.notes
  ).join("\n");
  return [
    "# Oasis Ribbon Parity Matrix — Phase 0 Seed",
    "",
    "> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.",
    "",
    "**Scope:** " + data.scope + "<br>",
    "**Pinned WordCraft inventory:** " + code(`${wordcraft.counts.features} entries / ${wordcraft.counts.surfaces} surfaces`) + "; this crosswalk maps " + code(data.features.length) + " Oasis capabilities and does not classify unmatched source rows as missing.<br>",
    "**Oasis baseline:** " + code(data.baseline.oasisCommit) + "<br>",
    "**WordCraft baseline:** " + code(data.baseline.wordcraftCommit),
    "",
    "The three dimensions below are independent of overall status. A legacy Ribbon-bound row defaults to `partial` exposure from its audited wiring; missing semantics or persistence evidence stays `unverified`. `core-only` means the command is registered but has no statically observed default Ribbon or menubar path. `menu-only` records a secondary path such as a dialog; each row supplies a UI path and source token that the audit checks. No status alone certifies complete DOCX round-trip, PDF/layout, accessibility or browser behavior.",
    "",
    "| Feature | WordCraft command | Oasis command | Oasis surface | Status | Exposure | Semantics | Persistence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Open verification questions",
    "",
    questions,
    "",
    "## Audit interpretation",
    "",
    "The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.",
    "",
    "**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.",
    "",
  ].join("\n");
}

function validateUiEvidence(root, feature, errors) {
  if (!feature.uiPath?.trim()) {
    errors.push(feature.id + ": UI surface status needs an explicit UI path");
  }
  const evidence = feature.uiEvidence;
  if (!evidence?.file || !evidence?.token) {
    errors.push(feature.id + ": UI surface status needs source-file evidence");
    return;
  }
  const evidencePath = resolve(root, evidence.file);
  if (!existsSync(evidencePath)) {
    errors.push(feature.id + ": missing UI evidence file " + evidence.file);
  } else if (!readFileSync(evidencePath, "utf8").includes(evidence.token)) {
    errors.push(feature.id + ": UI evidence token not found: " + evidence.token);
  }
}

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
  const commandlessStatuses = new Set(["ui-only"]);
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

  const snapshot = renderMatrix(catalog);
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
