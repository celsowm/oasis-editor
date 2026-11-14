/**
 * Shared AST query helpers for the source-level Ribbon inventory.
 * Nothing in here is ribbon-specific; it exists so collectors and validators
 * stay small and single-purpose.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

export const root = resolve(import.meta.dirname, "../..");
export const source = (path) => readFileSync(resolve(root, path), "utf8");

export const getName = (name) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
export const getProperty = (node, key) =>
  node && ts.isObjectLiteralExpression(node)
    ? node.properties.find((prop) =>
        ts.isPropertyAssignment(prop) && getName(prop.name) === key)
    : undefined;
export const getExpression = (node, key) => getProperty(node, key)?.initializer;
export const getString = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
export const getCommand = (node) =>
  getString(node) ??
  (node && ts.isObjectLiteralExpression(node)
    ? getString(getExpression(node, "name"))
    : undefined);

export function parse(path) {
  return ts.createSourceFile(
    path,
    source(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

export function resolveImportedSource(importerPath, specifier) {
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

export function collectNamedImportSources(file, importerPath) {
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

export function findImportedComponentSource(render, imports) {
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

export function collectExecutedCommands(path) {
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

export function findArrayVariable(file, variable) {
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

export function findObjectVariable(file, variable) {
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

