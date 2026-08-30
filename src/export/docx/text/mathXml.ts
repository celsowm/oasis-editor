import type { EditorMathExpression, EditorMathNode } from "@/core/model.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";

function attr(name: string, value: string | boolean | undefined): string {
  return value === undefined ? "" : ` m:${name}="${escapeXml(String(value))}"`;
}

function content(nodes: EditorMathNode[]): string {
  return nodes.map(serializeNode).join("");
}

function serializeRun(node: Extract<EditorMathNode, { kind: "text" }>): string {
  const style = node.style;
  const rPr = style
    ? `<m:rPr>${style.bold ? "<m:b/>" : ""}${style.italic ? "<m:i/>" : ""}${style.normalText ? "<m:nor/>" : ""}${style.script ? `<m:sty m:val="${escapeXml(style.script)}"/>` : ""}</m:rPr>`
    : "";
  return `<m:r>${rPr}<m:t xml:space="preserve">${escapeXml(node.value)}</m:t></m:r>`;
}

function serializeNode(node: EditorMathNode): string {
  switch (node.kind) {
    case "text":
      return serializeRun(node);
    case "fraction":
      return `<m:f>${node.bar === false ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ""}<m:num>${content(node.numerator)}</m:num><m:den>${content(node.denominator)}</m:den></m:f>`;
    case "radical":
      return node.degree
        ? `<m:rad><m:deg>${content(node.degree)}</m:deg><m:e>${content(node.radicand)}</m:e></m:rad>`
        : `<m:rad><m:e>${content(node.radicand)}</m:e></m:rad>`;
    case "script": {
      const tag =
        node.subscript && node.superscript
          ? "sSubSup"
          : node.subscript
            ? "sSub"
            : "sSup";
      return `<m:${tag}><m:e>${content(node.base)}</m:e>${node.subscript ? `<m:sub>${content(node.subscript)}</m:sub>` : ""}${node.superscript ? `<m:sup>${content(node.superscript)}</m:sup>` : ""}</m:${tag}>`;
    }
    case "delimiter":
      return `<m:d><m:dPr>${attr("begChr", node.begin)}${attr("endChr", node.end)}${attr("sepChr", node.separator)}${node.grow === false ? '<m:grow m:val="0"/>' : ""}</m:dPr>${node.children.map((part) => `<m:e>${content(part)}</m:e>`).join("")}</m:d>`;
    case "accent":
      return `<m:acc><m:accPr><m:chr${attr("val", node.accent)}/></m:accPr><m:e>${content(node.children)}</m:e></m:acc>`;
    case "nary":
      return `<m:nary><m:naryPr><m:chr${attr("val", node.operator)}/>${node.grow === false ? '<m:grow m:val="0"/>' : ""}</m:naryPr>${node.subscript ? `<m:sub>${content(node.subscript)}</m:sub>` : ""}${node.superscript ? `<m:sup>${content(node.superscript)}</m:sup>` : ""}<m:e>${content(node.children)}</m:e></m:nary>`;
    case "limit":
      return node.operator === "low"
        ? `<m:limLow><m:e>${content(node.base)}</m:e><m:lim>${content(node.limit)}</m:lim></m:limLow>`
        : `<m:limUpp><m:e>${content(node.base)}</m:e><m:lim>${content(node.limit)}</m:lim></m:limUpp>`;
    case "matrix":
      return `<m:m>${node.rows.map((row) => `<m:mr>${row.map((cell) => `<m:e>${content(cell)}</m:e>`).join("")}</m:mr>`).join("")}</m:m>`;
    case "box":
      return `<m:${node.hidden ? "phant" : node.border ? "borderBox" : "box"}><m:e>${content(node.children)}</m:e></m:${node.hidden ? "phant" : node.border ? "borderBox" : "box"}>`;
    case "group":
      return content(node.children);
    case "raw":
      return node.xml;
  }
}

export function serializeMathExpression(
  expression: EditorMathExpression,
): string {
  const math = `<m:oMath>${content(expression.children)}</m:oMath>`;
  return expression.display ? `<m:oMathPara>${math}</m:oMathPara>` : math;
}
