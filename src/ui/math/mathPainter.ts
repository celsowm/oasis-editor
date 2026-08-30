import type { EditorMathExpression, EditorMathNode } from "@/core/model.js";
import { serializeLinearMath } from "@/core/math/linear.js";

export function mathDisplayText(expression: EditorMathExpression): string {
  return serializeLinearMath(expression) || "□";
}

export interface MathMeasure {
  width: number;
  height: number;
}

function measureNodes(nodes: EditorMathNode[], fontSize: number): MathMeasure {
  return nodes.reduce(
    (total, node): MathMeasure => {
      const item = measureNode(node, fontSize);
      return {
        width: total.width + item.width,
        height: Math.max(total.height, item.height),
      };
    },
    { width: 0, height: fontSize },
  );
}

function measureNode(node: EditorMathNode, fontSize: number): MathMeasure {
  switch (node.kind) {
    case "text":
      return {
        width: Math.max(fontSize * 0.35, node.value.length * fontSize * 0.55),
        height: fontSize,
      };
    case "fraction": {
      const numerator = measureNodes(node.numerator, fontSize * 0.82);
      const denominator = measureNodes(node.denominator, fontSize * 0.82);
      return {
        width: Math.max(numerator.width, denominator.width) + 8,
        height: numerator.height + denominator.height + 8,
      };
    }
    case "radical": {
      const radicand = measureNodes(node.radicand, fontSize);
      return {
        width: radicand.width + fontSize * 0.7,
        height: radicand.height + 4,
      };
    }
    case "script": {
      const base = measureNodes(node.base, fontSize);
      const sub = node.subscript
        ? measureNodes(node.subscript, fontSize * 0.65)
        : { width: 0, height: 0 };
      const sup = node.superscript
        ? measureNodes(node.superscript, fontSize * 0.65)
        : { width: 0, height: 0 };
      return {
        width: base.width + Math.max(sub.width, sup.width),
        height: base.height + sub.height + sup.height * 0.35,
      };
    }
    case "delimiter": {
      const inner = node.children.reduce(
        (sum, part) => sum + measureNodes(part, fontSize).width,
        0,
      );
      return { width: inner + fontSize * 0.8, height: fontSize * 1.3 };
    }
    case "accent":
      return {
        ...measureNodes(node.children, fontSize),
        height: fontSize * 1.35,
      };
    case "nary":
      return {
        width: fontSize * 0.9 + measureNodes(node.children, fontSize).width,
        height: fontSize * 1.5,
      };
    case "limit":
      return {
        width: Math.max(
          measureNodes(node.base, fontSize).width,
          measureNodes(node.limit, fontSize * 0.65).width,
        ),
        height: fontSize * 1.5,
      };
    case "matrix":
      return {
        width: Math.max(
          1,
          ...node.rows.map((row) =>
            row.reduce(
              (sum, cell) => sum + measureNodes(cell, fontSize).width + 10,
              0,
            ),
          ),
        ),
        height: Math.max(fontSize, node.rows.length * fontSize * 1.35),
      };
    case "box":
      return measureNodes(node.children, fontSize);
    case "group":
      return measureNodes(node.children, fontSize);
    case "raw":
      return {
        width: Math.max(
          fontSize * 0.35,
          (node.fallbackText ?? "□").length * fontSize * 0.55,
        ),
        height: fontSize,
      };
  }
}

export function measureMathExpression(
  expression: EditorMathExpression,
  fontSize: number,
): MathMeasure {
  return measureNodes(expression.children, fontSize);
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: EditorMathNode[],
  x: number,
  baseline: number,
  fontSize: number,
): number {
  let cursor = x;
  for (const node of nodes)
    cursor += drawNode(ctx, node, cursor, baseline, fontSize);
  return cursor - x;
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: EditorMathNode,
  x: number,
  baseline: number,
  fontSize: number,
): number {
  if (node.kind === "text" || node.kind === "raw") {
    const value =
      node.kind === "text" ? node.value : (node.fallbackText ?? "□");
    ctx.font = `${fontSize}px "Cambria Math", "Times New Roman", serif`;
    ctx.fillText(value, x, baseline);
    return ctx.measureText(value).width;
  }
  if (node.kind === "group" || node.kind === "box")
    return drawNodes(ctx, node.children, x, baseline, fontSize);
  if (node.kind === "fraction") {
    const numerator = measureNodes(node.numerator, fontSize * 0.82);
    const denominator = measureNodes(node.denominator, fontSize * 0.82);
    const width = Math.max(numerator.width, denominator.width) + 8;
    drawNodes(
      ctx,
      node.numerator,
      x + (width - numerator.width) / 2,
      baseline - fontSize * 0.55,
      fontSize * 0.82,
    );
    ctx.beginPath();
    ctx.moveTo(x + 2, baseline - fontSize * 0.3);
    ctx.lineTo(x + width - 2, baseline - fontSize * 0.3);
    ctx.stroke();
    drawNodes(
      ctx,
      node.denominator,
      x + (width - denominator.width) / 2,
      baseline + fontSize * 0.7,
      fontSize * 0.82,
    );
    return width;
  }
  if (node.kind === "radical") {
    const radicand = measureNodes(node.radicand, fontSize);
    ctx.font = `${fontSize}px "Cambria Math", "Times New Roman", serif`;
    ctx.fillText("√", x, baseline);
    ctx.beginPath();
    ctx.moveTo(x + fontSize * 0.65, baseline - fontSize);
    ctx.lineTo(x + fontSize * 0.65 + radicand.width, baseline - fontSize);
    ctx.stroke();
    drawNodes(ctx, node.radicand, x + fontSize * 0.7, baseline, fontSize);
    return radicand.width + fontSize * 0.7;
  }
  if (node.kind === "script") {
    const baseWidth = drawNodes(ctx, node.base, x, baseline, fontSize);
    const scriptX = x + baseWidth;
    if (node.superscript)
      drawNodes(
        ctx,
        node.superscript,
        scriptX,
        baseline - fontSize * 0.55,
        fontSize * 0.65,
      );
    if (node.subscript)
      drawNodes(
        ctx,
        node.subscript,
        scriptX,
        baseline + fontSize * 0.45,
        fontSize * 0.65,
      );
    const subWidth = node.subscript
      ? measureNodes(node.subscript, fontSize * 0.65).width
      : 0;
    const supWidth = node.superscript
      ? measureNodes(node.superscript, fontSize * 0.65).width
      : 0;
    return baseWidth + Math.max(subWidth, supWidth);
  }
  const fallback = mathDisplayText({ version: 1, children: [node] });
  ctx.font = `${fontSize}px "Cambria Math", "Times New Roman", serif`;
  ctx.fillText(fallback, x, baseline);
  return ctx.measureText(fallback).width;
}

export function drawMathExpression(
  ctx: CanvasRenderingContext2D,
  expression: EditorMathExpression,
  x: number,
  baseline: number,
  fontSize: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  drawNodes(ctx, expression.children, x, baseline, fontSize);
  ctx.restore();
}

export function mathNodeText(node: EditorMathNode): string {
  return node.kind === "text"
    ? node.value
    : node.kind === "raw"
      ? (node.fallbackText ?? "□")
      : mathDisplayText({ version: 1, children: [node] });
}
