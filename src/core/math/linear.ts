import type { EditorMathExpression, EditorMathNode } from "@/core/model.js";

const text = (value: string): EditorMathNode => ({ kind: "text", value });

function readGroup(
  input: string,
  start: number,
): { value: string; next: number } {
  if (input[start] !== "{")
    return { value: input[start] ?? "", next: start + 1 };
  let depth = 0;
  for (let index = start; index < input.length; index += 1) {
    if (input[index] === "{") depth += 1;
    if (input[index] === "}") depth -= 1;
    if (depth === 0)
      return { value: input.slice(start + 1, index), next: index + 1 };
  }
  return { value: input.slice(start + 1), next: input.length };
}

export function parseLinearMath(linear: string): EditorMathExpression {
  const source = linear.trim();
  const nodes: EditorMathNode[] = [];
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("\\frac", index)) {
      const numerator = readGroup(source, index + 5);
      const denominator = readGroup(source, numerator.next);
      nodes.push({
        kind: "fraction",
        numerator: parseLinearMath(numerator.value).children,
        denominator: parseLinearMath(denominator.value).children,
      });
      index = denominator.next;
      continue;
    }
    if (source.startsWith("\\sqrt", index)) {
      const radicand = readGroup(source, index + 5);
      nodes.push({
        kind: "radical",
        radicand: parseLinearMath(radicand.value).children,
      });
      index = radicand.next;
      continue;
    }
    const character = source[index]!;
    if (character === "^" || character === "_") {
      const group = readGroup(source, index + 1);
      const previous = nodes.pop() ?? text("");
      const script: Extract<EditorMathNode, { kind: "script" }> =
        previous.kind === "script"
          ? previous
          : { kind: "script", base: [previous] };
      const next = parseLinearMath(group.value).children;
      if (script.kind === "script") {
        if (character === "^") script.superscript = next;
        else script.subscript = next;
      }
      nodes.push(script);
      index = group.next;
      continue;
    }
    nodes.push(text(character));
    index += 1;
  }
  return { version: 1, children: nodes };
}

export function serializeLinearMathNodes(nodes: EditorMathNode[]): string {
  return nodes
    .map((node): string => {
      switch (node.kind) {
        case "text":
          return node.value;
        case "fraction":
          return `\\frac{${serializeLinearMathNodes(node.numerator)}}{${serializeLinearMathNodes(node.denominator)}}`;
        case "radical":
          return `\\sqrt{${serializeLinearMathNodes(node.radicand)}}`;
        case "script":
          return `${serializeLinearMathNodes(node.base)}${node.subscript ? `_{${serializeLinearMathNodes(node.subscript)}}` : ""}${node.superscript ? `^{${serializeLinearMathNodes(node.superscript)}}` : ""}`;
        case "delimiter":
          return `${node.begin ?? "("}${node.children.map(serializeLinearMathNodes).join(node.separator ?? ",")}${node.end ?? ")"}`;
        case "accent":
          return `${node.accent}{${serializeLinearMathNodes(node.children)}}`;
        case "nary":
          return `${node.operator}${node.subscript ? `_{${serializeLinearMathNodes(node.subscript)}}` : ""}${node.superscript ? `^{${serializeLinearMathNodes(node.superscript)}}` : ""}${serializeLinearMathNodes(node.children)}`;
        case "limit":
          return `${serializeLinearMathNodes(node.base)}_{${serializeLinearMathNodes(node.limit)}}`;
        case "matrix":
          return `\\matrix{${node.rows.map((row) => row.map(serializeLinearMathNodes).join(" & ")).join(" \\ ")}}`;
        case "box":
        case "group":
          return serializeLinearMathNodes(node.children);
        case "raw":
          return node.fallbackText ?? "";
      }
    })
    .join("");
}

export function serializeLinearMath(expression: EditorMathExpression): string {
  return serializeLinearMathNodes(expression.children);
}
