#!/usr/bin/env node
/**
 * Deterministic source-level Ribbon inventory and initial WordCraft parity guard.
 *
 * This intentionally proves wiring, NOT document semantics or WordCraft parity.
 * Dynamic custom controls and plugin-provided UI require runtime coverage.
 *
 * Usage:
 *   node scripts/audit-ribbon-parity.mjs --check
 *   node scripts/audit-ribbon-parity.mjs --write
 *   node scripts/audit-ribbon-parity.mjs --json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");
const catalog = JSON.parse(source("scripts/ribbon-parity/features.json"));

const getName = (name) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
const getProperty = (node, key) =>
  ts.isObjectLiteralExpression(node)
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
    ts.ScriptKind.TS,
  );
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
  const file = parse("src/ui/components/Toolbar/presets/defaultToolbar.ts");
  const items = new Map();

  const addItem = (node, parentId = undefined) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const id = getString(getExpression(node, "id"));
    if (!id) return;
    if (items.has(id)) throw new Error("Duplicate toolbar item: " + id);
    items.set(id, {
      command: getCommand(getExpression(node, "command")),
      kind: getString(getExpression(node, "type")),
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
      items.set(id, { command, kind: "button/toggle", source: variable });
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
  const rows = data.features.map((feature) =>
    "| " + code(feature.id) +
    " | " + (feature.wordcraftCommand ? code(feature.wordcraftCommand) : "—") +
    " | " + code(feature.oasisCommand) +
    " | " + code(feature.tab + "/" + feature.group) +
    " | " + feature.status + " |"
  ).join("\n");
  const questions = data.features.map((feature, index) =>
    (index + 1) + ". **" + feature.id + ":** " + feature.notes
  ).join("\n");
  return [
    "# Oasis Ribbon Parity Matrix — Phase 0 Seed",
    "",
    "> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.",
    "",
    "**Scope:** " + data.scope + "  ",
    "**Oasis baseline:** " + code(data.baseline.oasisCommit) + "  ",
    "**WordCraft baseline:** " + code(data.baseline.wordcraftCommit),
    "",
    "`partial` means a command and Ribbon entry are statically bound. It does **not** certify complete semantics, DOCX round-trip, PDF/layout, accessibility or browser behavior.",
    "",
    "| Feature | WordCraft command | Oasis command | Ribbon placement | Status |",
    "| --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Open verification questions",
    "",
    questions,
    "",
    "## Audit interpretation",
    "",
    "The audit scans the built-in command array, direct default-toolbar objects, the three active static button-spec arrays, Ribbon placement definitions and the default menubar. Dynamic custom controls and plugin contributions cannot be proved complete through static mapping and must be verified in runtime tests. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.",
    "",
    "**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.",
    "",
  ].join("\n");
}
function main() {
  const builtin = collectBuiltinCommands();
  const registered = collectRegisteredCommands();
  const toolbar = collectPresetItems();
  const placements = collectPlacements();
  const menu = collectMenuCommands();
  const errors = [];
  const ids = new Set();
  for (const feature of catalog.features) {
    if (ids.has(feature.id)) errors.push("Duplicate feature ID: " + feature.id);
    ids.add(feature.id);
    if (!builtin.has(feature.oasisCommand)) {
      errors.push(feature.id + ": missing built-in command " + feature.oasisCommand);
    }
    if (!registered.has(feature.oasisCommand)) {
      errors.push(feature.id + ": command has no Essentials registration: " + feature.oasisCommand);
    }
    const item = toolbar.get(feature.ribbonId);
    if (!item) errors.push(feature.id + ": missing Ribbon item " + feature.ribbonId);
    else if (item.command !== feature.oasisCommand) {
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
    channel: [...toolbar.values()].some((i) => i.command === command)
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
      builtinCommands: builtin.size,
      registeredCommands: registered.size,
      toolbarItemsScanned: toolbar.size,
      records: reachable,
    }, null, 2) + "\n");
  } else {
    console.log(`Ribbon audit: ${catalog.features.length} mapped features; ${builtin.size} built-ins; ${toolbar.size} statically scanned items.`);
  }
  if (errors.length) {
    for (const error of errors) console.error("ERROR: " + error);
    process.exitCode = 1;
  }
}
main();
