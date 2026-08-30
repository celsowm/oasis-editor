import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorMathExpression, EditorMathNode } from "@/core/model.js";

export const MATH_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/math";

const serializer = new XMLSerializer();

function children(element: XmlElement, name?: string): XmlElement[] {
  const result: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === MATH_NS &&
      (!name || (node as XmlElement).localName === name)
    ) {
      result.push(node as XmlElement);
    }
  }
  return result;
}

function child(element: XmlElement, name: string): XmlElement | undefined {
  return children(element, name)[0];
}

function value(
  element: XmlElement | undefined,
  name: string,
): string | undefined {
  return (
    element?.getAttributeNS(MATH_NS, name) ??
    element?.getAttribute(`m:${name}`) ??
    element?.getAttribute(name) ??
    undefined
  );
}

function sequence(element: XmlElement | undefined): EditorMathNode[] {
  return element ? children(element).map(parseNode) : [];
}

function parseRun(element: XmlElement): EditorMathNode {
  const text = child(element, "t")?.textContent ?? "";
  const rPr = child(element, "rPr");
  const style = rPr
    ? {
        ...(child(rPr, "sty")
          ? {
              script: value(child(rPr, "sty"), "val") as
                | "roman"
                | "script"
                | "fraktur"
                | "double-struck",
            }
          : {}),
        ...(child(rPr, "nor") ? { normalText: true } : {}),
        ...(child(rPr, "b")
          ? { bold: value(child(rPr, "b"), "val") !== "0" }
          : {}),
        ...(child(rPr, "i")
          ? { italic: value(child(rPr, "i"), "val") !== "0" }
          : {}),
      }
    : undefined;
  return {
    kind: "text",
    value: text,
    ...(style && Object.keys(style).length > 0 ? { style } : {}),
  };
}

function parseScript(element: XmlElement, kind: "script"): EditorMathNode {
  const base = sequence(child(element, "e"));
  const sub = sequence(child(element, "sub"));
  const sup = sequence(child(element, "sup"));
  return {
    kind,
    base,
    ...(sub.length > 0 ? { subscript: sub } : {}),
    ...(sup.length > 0 ? { superscript: sup } : {}),
  };
}

function parseNode(element: XmlElement): EditorMathNode {
  switch (element.localName) {
    case "r":
      return parseRun(element);
    case "f":
      return {
        kind: "fraction",
        numerator: sequence(child(element, "num")),
        denominator: sequence(child(element, "den")),
      };
    case "rad":
      return {
        kind: "radical",
        radicand: sequence(child(element, "e")),
        ...(child(element, "deg")
          ? { degree: sequence(child(element, "deg")) }
          : {}),
      };
    case "sSub":
    case "sSup":
    case "sSubSup":
      return parseScript(element, "script");
    case "d": {
      const dPr = child(element, "dPr");
      return {
        kind: "delimiter",
        children: children(element, "e").map(sequence),
        ...(value(child(dPr!, "begChr"), "val")
          ? { begin: value(child(dPr!, "begChr"), "val") }
          : {}),
        ...(value(child(dPr!, "endChr"), "val")
          ? { end: value(child(dPr!, "endChr"), "val") }
          : {}),
        ...(value(child(dPr!, "sepChr"), "val")
          ? { separator: value(child(dPr!, "sepChr"), "val") }
          : {}),
        grow: value(child(dPr!, "grow"), "val") !== "0",
      };
    }
    case "acc": {
      const pr = child(element, "accPr");
      return {
        kind: "accent",
        accent: value(child(pr!, "chr"), "val") ?? "¯",
        children: sequence(child(element, "e")),
      };
    }
    case "nary": {
      const pr = child(element, "naryPr");
      return {
        kind: "nary",
        operator: value(child(pr!, "chr"), "val") ?? "∑",
        children: sequence(child(element, "e")),
        ...(children(element, "sub").length > 0
          ? { subscript: sequence(child(element, "sub")) }
          : {}),
        ...(children(element, "sup").length > 0
          ? { superscript: sequence(child(element, "sup")) }
          : {}),
        grow: value(child(pr!, "grow"), "val") !== "0",
      };
    }
    case "limLow":
      return {
        kind: "limit",
        operator: "low",
        base: sequence(child(element, "e")),
        limit: sequence(child(element, "lim")),
      };
    case "limUpp":
      return {
        kind: "limit",
        operator: "upper",
        base: sequence(child(element, "e")),
        limit: sequence(child(element, "lim")),
      };
    case "m":
      return {
        kind: "matrix",
        rows: children(element, "mr").map((row) =>
          children(row, "e").map(sequence),
        ),
      };
    case "box":
      return {
        kind: "box",
        children: sequence(child(element, "e")),
        border: true,
      };
    case "borderBox":
      return {
        kind: "box",
        children: sequence(child(element, "e")),
        border: true,
      };
    case "phant":
      return {
        kind: "box",
        children: sequence(child(element, "e")),
        hidden: true,
      };
    case "groupChr": {
      const pr = child(element, "groupChrPr");
      return {
        kind: "accent",
        accent: value(child(pr!, "chr"), "val") ?? "¯",
        children: sequence(child(element, "e")),
      };
    }
    case "func":
      return {
        kind: "group",
        children: [
          ...sequence(child(element, "fName")),
          ...sequence(child(element, "e")),
        ],
      };
    default:
      return {
        kind: "raw",
        xml: serializer.serializeToString(element),
        fallbackText: element.textContent ?? "",
      };
  }
}

export function parseMathExpression(element: XmlElement): EditorMathExpression {
  const root =
    element.localName === "oMathPara" ? child(element, "oMath") : element;
  return {
    version: 1,
    children: root ? children(root).map(parseNode) : [],
    display: element.localName === "oMathPara",
    sourceXml: serializer.serializeToString(element),
  };
}
