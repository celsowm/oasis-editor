#!/usr/bin/env node
/** Static name-resolution inventory. Browser rendering is a separate gate. */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import ts from "typescript";
import { icons } from "lucide";

const root = resolve(import.meta.dirname, "..");
const registryPath = "src/ui/utils/customIcons.tsx";
const registry = ts.createSourceFile(
  registryPath,
  readFileSync(resolve(root, registryPath), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const custom = new Set();
function findRegistry(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(registry) === "CUSTOM_ICONS"
  ) {
    for (const property of node.initializer.properties)
      custom.add(property.name.getText(registry).replaceAll('"', ""));
  }
  ts.forEachChild(node, findRegistry);
}
findRegistry(registry);
// Match Lucide's separator-to-PascalCase lookup, including interior case.
const normalize = (name) => {
  const camel = name
    .replace(/^[\s_-]+/, "")
    .replace(/[\s_-]+(.)/g, (_, character) => character.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};
const lucide = new Set(Object.keys(icons));
const uses = [];
const dynamic = [];
function walkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walkDirectory(path);
    else if (/\.tsx?$/.test(path)) scan(path);
  }
}
function scan(path) {
  const file = relative(root, path);
  const ast = ts.createSourceFile(
    file,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const visit = (node) => {
    let name;
    let expression;
    if (ts.isPropertyAssignment(node)) {
      name = node.name.getText(ast).replaceAll('"', "");
      expression = node.initializer;
    } else if (ts.isJsxAttribute(node)) {
      name = node.name.getText(ast);
      expression = node.initializer;
      if (expression && ts.isJsxExpression(expression))
        expression = expression.expression;
    }
    if (
      ["icon", "iconName", "collapsedIcon", "trailingIcon"].includes(name) &&
      expression
    ) {
      const location = {
        file,
        line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
        role: name,
      };
      if (ts.isStringLiteral(expression)) {
        const icon = expression.text;
        uses.push({
          ...location,
          name: icon,
          origin: custom.has(icon)
            ? "oasis"
            : lucide.has(normalize(icon))
              ? "lucide"
              : "unresolved",
        });
      } else dynamic.push({ ...location, expression: expression.getText(ast) });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}
walkDirectory(resolve(root, "src/ui/components/Toolbar"));
const catalog = {
  schemaVersion: 1,
  scope:
    "Toolbar literal icon properties/attributes, including menus, primitives and collapse defaults. Dynamic expressions and plugins require runtime checks. Custom SVG geometry and direct ToolIcon name expressions are not certified by this inventory.",
  licenses: {
    oasis: "MIT (repository)",
    lucide: "ISC (installed lucide package)",
  },
  customRegistry: [...custom].sort(),
  uses: uses.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  dynamic,
};
const output = JSON.stringify(catalog, null, 2) + "\n";
const target = resolve(root, "scripts/ribbon-parity/icons.json");
if (process.argv.includes("--write")) writeFileSync(target, output);
else if (readFileSync(target, "utf8") !== output)
  throw new Error(
    "Stale icon inventory. Run node scripts/audit-ribbon-icons.mjs --write",
  );
const unresolved = uses.filter((use) => use.origin === "unresolved");
if (unresolved.length) throw new Error(JSON.stringify(unresolved, null, 2));
console.log(
  `Ribbon icons: ${new Set(uses.map((use) => use.name)).size} literal names, ${uses.length} uses, ${dynamic.length} dynamic expressions; no unresolved literals. Runtime appearance unverified.`,
);
