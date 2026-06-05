#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

function usage() {
  console.error("usage: extract-pdf-lines.mjs <pdf-path>");
  process.exit(2);
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  usage();
}

const bytes = readFileSync(pdfPath);
const source = bytes.toString("latin1");
const objects = parseObjects(source);
const pages = parsePages(objects).map((page) => extractPage(page, objects));

console.log(JSON.stringify({ pages }));

function parseObjects(pdf) {
  const map = new Map();
  const pattern = /(\d+)\s+(\d+)\s+obj\s*([\s\S]*?)\s*endobj/g;
  for (const match of pdf.matchAll(pattern)) {
    const id = Number(match[1]);
    const body = match[3];
    const streamMatch = /([\s\S]*?)stream\r?\n([\s\S]*?)\r?\nendstream/.exec(
      body,
    );
    map.set(id, {
      id,
      body,
      dict: streamMatch ? streamMatch[1] : body,
      stream: streamMatch ? Buffer.from(streamMatch[2], "latin1") : null,
    });
  }
  return map;
}

function parsePages(objects) {
  const pages = [];
  for (const object of objects.values()) {
    if (!/\/Type\s*\/Page\b/.test(object.body)) {
      continue;
    }
    const mediaBox = /\/MediaBox\s*\[\s*([^\]]+)\]/.exec(object.body);
    const values = mediaBox
      ? mediaBox[1].trim().split(/\s+/).map(Number)
      : [0, 0, 0, 0];
    const [x0, y0, x1, y1] = values;
    pages.push({
      id: object.id,
      body: object.body,
      width: x1 - x0,
      height: y1 - y0,
      contentIds: parseContentIds(object.body),
      fonts: parsePageFonts(object.body, objects),
    });
  }
  return pages.sort((a, b) => a.id - b.id);
}

function parseContentIds(body) {
  const array = /\/Contents\s*\[\s*([^\]]+)\]/.exec(body);
  if (array) {
    return Array.from(array[1].matchAll(/(\d+)\s+0\s+R/g), (m) =>
      Number(m[1]),
    );
  }
  const single = /\/Contents\s+(\d+)\s+0\s+R/.exec(body);
  return single ? [Number(single[1])] : [];
}

function parsePageFonts(body, objects) {
  const fontBlock = /\/Font\s*<<([\s\S]*?)>>/.exec(body)?.[1] ?? "";
  const fonts = new Map();
  for (const match of fontBlock.matchAll(/\/([A-Za-z0-9._-]+)\s+(\d+)\s+0\s+R/g)) {
    fonts.set(match[1], parseFont(Number(match[2]), objects));
  }
  return fonts;
}

function parseFont(id, objects) {
  const object = objects.get(id);
  if (!object) {
    return defaultFont();
  }

  const toUnicodeId = readRef(object.body, "ToUnicode");
  const descendantId = readRef(object.body, "DescendantFonts");
  const descendant = descendantId ? objects.get(descendantId) : null;
  const descriptorId =
    readRef(object.body, "FontDescriptor") ??
    (descendant ? readRef(descendant.body, "FontDescriptor") : null);
  const descriptor = descriptorId ? objects.get(descriptorId) : null;

  return {
    toUnicode: toUnicodeId ? parseToUnicode(objects.get(toUnicodeId)) : null,
    ascent: readNumber(descriptor?.body ?? "", "Ascent") ?? 750,
    descent: readNumber(descriptor?.body ?? "", "Descent") ?? -250,
  };
}

function defaultFont() {
  return { toUnicode: null, ascent: 750, descent: -250 };
}

function readRef(body, name) {
  const match = new RegExp(`/${name}\\s+(?:\\[\\s*)?(\\d+)\\s+0\\s+R`).exec(
    body,
  );
  return match ? Number(match[1]) : null;
}

function readNumber(body, name) {
  const match = new RegExp(`/${name}\\s+(-?\\d+(?:\\.\\d+)?)`).exec(body);
  return match ? Number(match[1]) : null;
}

function parseToUnicode(object) {
  if (!object?.stream) {
    return null;
  }
  const cmap = decodeStream(object).toString("latin1");
  const map = new Map();

  for (const block of cmap.matchAll(/beginbfchar\s*([\s\S]*?)\s*endbfchar/g)) {
    for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(match[1].toUpperCase(), unicodeHexToString(match[2]));
    }
  }

  for (const block of cmap.matchAll(/beginbfrange\s*([\s\S]*?)\s*endbfrange/g)) {
    for (const match of block[1].matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([^\]]+)\])/g,
    )) {
      const start = Number.parseInt(match[1], 16);
      const end = Number.parseInt(match[2], 16);
      const width = match[1].length;
      if (match[3]) {
        const unicodeStart = Number.parseInt(match[3], 16);
        for (let code = start; code <= end; code += 1) {
          map.set(
            code.toString(16).toUpperCase().padStart(width, "0"),
            String.fromCodePoint(unicodeStart + code - start),
          );
        }
      } else if (match[4]) {
        const values = Array.from(
          match[4].matchAll(/<([0-9A-Fa-f]+)>/g),
          (m) => unicodeHexToString(m[1]),
        );
        for (let code = start; code <= end; code += 1) {
          map.set(
            code.toString(16).toUpperCase().padStart(width, "0"),
            values[code - start] ?? "",
          );
        }
      }
    }
  }

  return map;
}

function unicodeHexToString(hex) {
  const chars = [];
  for (let index = 0; index < hex.length; index += 4) {
    chars.push(String.fromCodePoint(Number.parseInt(hex.slice(index, index + 4), 16)));
  }
  return chars.join("");
}

function decodeStream(object) {
  const stream = object.stream ?? Buffer.alloc(0);
  return /\/FlateDecode\b/.test(object.dict) ? inflateSync(stream) : stream;
}

function extractPage(page, objects) {
  const chunks = [];
  for (const contentId of page.contentIds) {
    const object = objects.get(contentId);
    if (object?.stream) {
      chunks.push(decodeStream(object).toString("latin1"));
    }
  }

  const items = [];
  for (const content of chunks) {
    items.push(...extractTextItems(content, page));
  }

  const lines = mergeLineItems(items);
  return {
    width: page.width,
    height: page.height,
    lines,
  };
}

function extractTextItems(content, page) {
  const tokens = tokenize(content);
  const stack = [];
  const items = [];
  let fontName = null;
  let fontSize = 0;
  let textMatrix = [1, 0, 0, 1, 0, 0];

  const emit = (value) => {
    const font = page.fonts.get(fontName) ?? defaultFont();
    const text = decodeTextValue(value, font).replace(/\u00A0/g, " ");
    if (!text.trim()) {
      return;
    }
    const baselineX = textMatrix[4];
    const baselineY = textMatrix[5];
    const ascent = (font.ascent / 1000) * fontSize;
    const descent = (font.descent / 1000) * fontSize;
    items.push({
      text,
      x: baselineX,
      y: page.height - (baselineY + ascent),
      width: 0,
      height: ascent - descent,
    });
  };

  for (const token of tokens) {
    if (token === "[") {
      stack.push(token);
      continue;
    }
    if (token === "]") {
      const array = [];
      while (stack.length && stack.at(-1) !== "[") {
        array.unshift(stack.pop());
      }
      stack.pop();
      stack.push(array);
      continue;
    }
    if (typeof token !== "string" || !isOperator(token)) {
      stack.push(token);
      continue;
    }

    if (token === "Tf") {
      fontSize = numberValue(stack.pop());
      fontName = nameValue(stack.pop());
    } else if (token === "Tm") {
      const f = numberValue(stack.pop());
      const e = numberValue(stack.pop());
      const d = numberValue(stack.pop());
      const c = numberValue(stack.pop());
      const b = numberValue(stack.pop());
      const a = numberValue(stack.pop());
      textMatrix = [a, b, c, d, e, f];
    } else if (token === "Td" || token === "TD") {
      const ty = numberValue(stack.pop());
      const tx = numberValue(stack.pop());
      textMatrix[4] += tx;
      textMatrix[5] += ty;
    } else if (token === "Tj" || token === "'") {
      emit(stack.pop());
    } else if (token === "TJ") {
      const array = stack.pop();
      if (Array.isArray(array)) {
        emit(array.filter(isTextToken));
      }
    } else if (token === '"') {
      emit(stack.pop());
    }
  }

  return items;
}

function mergeLineItems(items) {
  const sorted = items
    .filter((item) => item.text.trim().length > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];

  for (const item of sorted) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) < 0.75);
    if (!line) {
      lines.push({ ...item });
      continue;
    }
    if (item.x < line.x) {
      line.x = item.x;
    }
    line.text += item.text;
    line.height = Math.max(line.height, item.height);
  }

  return lines.map((line) => ({
    text: line.text,
    x: line.x,
    y: line.y,
    width: line.width,
    height: line.height,
  }));
}

function tokenize(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "%") {
      while (index < input.length && input[index] !== "\n") index += 1;
      continue;
    }
    if (char === "[" || char === "]") {
      tokens.push(char);
      index += 1;
      continue;
    }
    if (char === "/") {
      let end = index + 1;
      while (end < input.length && !/[\s<>\[\]()/%]/.test(input[end])) end += 1;
      tokens.push({ type: "name", value: input.slice(index + 1, end) });
      index = end;
      continue;
    }
    if (char === "<" && input[index + 1] !== "<") {
      const end = input.indexOf(">", index + 1);
      tokens.push({ type: "hex", value: input.slice(index + 1, end).replace(/\s+/g, "") });
      index = end + 1;
      continue;
    }
    if (char === "(") {
      const parsed = readLiteralString(input, index);
      tokens.push({ type: "literal", value: parsed.value });
      index = parsed.end;
      continue;
    }
    const number = /^[+-]?(?:\d+\.\d+|\d+|\.\d+)/.exec(input.slice(index));
    if (number) {
      tokens.push(Number(number[0]));
      index += number[0].length;
      continue;
    }
    const operator = /^[A-Za-z*'"`]+/.exec(input.slice(index));
    if (operator) {
      tokens.push(operator[0]);
      index += operator[0].length;
      continue;
    }
    index += 1;
  }
  return tokens;
}

function readLiteralString(input, start) {
  let depth = 1;
  let value = "";
  let index = start + 1;
  while (index < input.length && depth > 0) {
    const char = input[index++];
    if (char === "\\") {
      const escaped = input[index++];
      if (escaped === "n") value += "\n";
      else if (escaped === "r") value += "\r";
      else if (escaped === "t") value += "\t";
      else if (escaped === "b") value += "\b";
      else if (escaped === "f") value += "\f";
      else if (escaped === "\r" || escaped === "\n") {
        if (escaped === "\r" && input[index] === "\n") index += 1;
      } else value += escaped;
    } else if (char === "(") {
      depth += 1;
      value += char;
    } else if (char === ")") {
      depth -= 1;
      if (depth > 0) value += char;
    } else {
      value += char;
    }
  }
  return { value, end: index };
}

function isOperator(value) {
  return [
    "BT",
    "ET",
    "Tf",
    "Tm",
    "Td",
    "TD",
    "Tj",
    "TJ",
    "'",
    '"',
  ].includes(value);
}

function isTextToken(value) {
  return value?.type === "hex" || value?.type === "literal";
}

function decodeTextValue(value, font) {
  if (Array.isArray(value)) {
    return value.map((item) => decodeTextValue(item, font)).join("");
  }
  if (value?.type === "literal") {
    return value.value;
  }
  if (value?.type !== "hex") {
    return "";
  }
  if (!font.toUnicode) {
    return hexToLatin1(value.value);
  }
  let result = "";
  for (let index = 0; index < value.value.length; index += 4) {
    const code = value.value.slice(index, index + 4).toUpperCase();
    result += font.toUnicode.get(code) ?? "";
  }
  return result;
}

function hexToLatin1(hex) {
  let result = "";
  for (let index = 0; index < hex.length; index += 2) {
    result += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return result;
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nameValue(value) {
  return value?.type === "name" ? value.value : null;
}
