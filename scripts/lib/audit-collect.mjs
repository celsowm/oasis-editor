/**
 * Collectors: turn the default toolbar, placements and menubar sources into
 * the data the matrix and the gate consume.
 */
import ts from "typescript";
import {
  root,
  source,
  parse,
  getString,
  getName,
  getExpression,
  getProperty,
  getCommand,
  findImportedComponentSource,
  collectExecutedCommands,
  findArrayVariable,
  findObjectVariable,
  collectNamedImportSources,
} from "./audit-ast.mjs";

export const RUNTIME_COMMAND_GROUPS = [
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
export function collectRegisteredCommands() {
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

export function collectBuiltinCommands() {
  const file = parse("src/core/commands/builtinCommands.ts");
  return new Set(
    findArrayVariable(file, "OASIS_BUILTIN_COMMANDS")
      .elements.map(getString)
      .filter(Boolean),
  );
}

export function collectPresetItems() {
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
  for (const variable of [
    "ALIGN_BUTTONS",
    "LIST_BUTTONS",
    "TABLE_LAYOUT_BUTTONS",
    "TABLE_VERTICAL_ALIGN_BUTTONS",
  ]) {
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

export function collectPlacements() {
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

export function collectMenuCommands() {
  const file = parse("src/ui/components/Menubar/defaultMenuItems.ts");
  const visible = new Set();
  for (const item of findArrayVariable(file, "defaultMenuItems").elements) {
    const command = getCommand(getExpression(item, "command"));
    const hidden = getExpression(item, "hidden");
    if (command && hidden?.kind !== ts.SyntaxKind.TrueKeyword) visible.add(command);
  }
  return visible;
}

