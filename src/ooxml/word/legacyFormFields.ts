/** Bounded `w:ffData` reader/writer for legacy form fields. Word treats a
 * field without ffData as invalid, and ignores label/tabIndex; those are not
 * modeled here. Entry/exit macros are preserved as text, never executed. */
import type { Element as XmlElement } from "@xmldom/xmldom";
import type { EditorLegacyFormFieldData } from "@/core/model.js";
import { parseFieldInstruction } from "./fieldInstruction.js";
import { escapeXml } from "@/export/docx/xmlUtils.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const allowed = new Set([
  "name",
  "enabled",
  "calcOnExit",
  "textInput",
  "checkBox",
  "ddList",
  "helpText",
  "statusText",
  "entryMacro",
  "exitMacro",
]);

function children(element: XmlElement, name: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes.item(i);
    if (
      child?.nodeType === 1 &&
      (child as XmlElement).localName === name &&
      (child as XmlElement).namespaceURI === WORD_NS
    )
      out.push(child as XmlElement);
  }
  return out;
}
function child(element: XmlElement, name: string): XmlElement | undefined {
  return children(element, name)[0];
}
function attr(element: XmlElement, name: string): string | undefined {
  return (
    element.getAttributeNS(WORD_NS, name) ||
    element.getAttribute(`w:${name}`) ||
    undefined
  );
}
function booleanAttr(
  element: XmlElement | undefined,
  defaultValue: boolean,
): boolean {
  if (!element) return defaultValue;
  const value = attr(element, "val");
  if (value === undefined) return defaultValue;
  if (["0", "false", "off", "no"].includes(value.toLowerCase())) return false;
  if (["1", "true", "on", "yes"].includes(value.toLowerCase())) return true;
  return defaultValue;
}
const plain = (
  value: string | null | undefined,
  max: number,
): string | undefined =>
  value == null
    ? undefined
    : value.length <= max &&
        ![...value].some(
          (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127,
        )
      ? value
      : undefined;

export function parseFfData(
  ffData: XmlElement,
): EditorLegacyFormFieldData | undefined {
  for (let i = 0; i < ffData.childNodes.length; i++) {
    const node = ffData.childNodes.item(i);
    if (
      node?.nodeType === 1 &&
      (!allowed.has((node as XmlElement).localName ?? "") ||
        (node as XmlElement).namespaceURI !== WORD_NS)
    )
      return undefined;
  }
  const nameElement = child(ffData, "name");
  const name = plain(nameElement ? attr(nameElement, "val") : undefined, 64);
  if (!name || !/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(name)) return undefined;
  const textInput = child(ffData, "textInput"),
    checkBox = child(ffData, "checkBox"),
    ddList = child(ffData, "ddList");
  if ([textInput, checkBox, ddList].filter(Boolean).length !== 1)
    return undefined;
  const data: EditorLegacyFormFieldData = {
    name,
    control: textInput ? "text" : checkBox ? "checkBox" : "dropDown",
    value: "",
    enabled: booleanAttr(child(ffData, "enabled"), true),
    calcOnExit: booleanAttr(child(ffData, "calcOnExit"), false),
  };
  if (textInput) {
    const maxLengthElement = child(textInput, "maxLength");
    const maxLengthRaw =
      attr(textInput, "maxLength") ??
      (maxLengthElement ? attr(maxLengthElement, "val") : undefined);
    const maxLength =
      maxLengthRaw === undefined ? undefined : Number(maxLengthRaw);
    if (
      maxLength !== undefined &&
      (!Number.isSafeInteger(maxLength) || maxLength < 0 || maxLength > 32767)
    )
      return undefined;
    const defaultElement = child(textInput, "default");
    const def = plain(
      defaultElement ? attr(defaultElement, "val") : undefined,
      255,
    );
    data.textInput = {
      ...(def !== undefined ? { default: def } : {}),
      ...(plain(attr(textInput, "format"), 32) !== undefined
        ? { format: attr(textInput, "format") }
        : {}),
      ...(maxLength !== undefined ? { maxLength } : {}),
      ...(plain(attr(textInput, "type"), 32) !== undefined
        ? { type: attr(textInput, "type") }
        : {}),
    };
    data.value = def ?? "";
  } else if (checkBox) {
    const checked = booleanAttr(child(checkBox, "checked"), false);
    const isDefault = booleanAttr(child(checkBox, "default"), false);
    const sizeElement = child(checkBox, "size");
    const sizeRaw = sizeElement ? attr(sizeElement, "val") : undefined;
    const size = sizeRaw === undefined ? undefined : Number(sizeRaw);
    if (
      size !== undefined &&
      (!Number.isSafeInteger(size) || size < 2 || size > 3168)
    )
      return undefined;
    data.checkBox = {
      checked,
      default: isDefault,
      ...(size !== undefined ? { size } : {}),
      ...(child(checkBox, "sizeAuto") ? { sizeAuto: true } : {}),
    };
    data.value = checked ? "x" : "";
  } else {
    const entries = children(ddList!, "listEntry").map((entry) =>
      plain(attr(entry, "val"), 255),
    );
    if (entries.some((entry) => entry === undefined) || entries.length > 25)
      return undefined;
    const defaultResultElement = child(ddList!, "defaultResult");
    const def = plain(
      attr(ddList!, "defaultResult") ??
        (defaultResultElement ? attr(defaultResultElement, "val") : undefined),
      255,
    );
    data.ddList = {
      ...(def !== undefined ? { defaultResult: def } : {}),
      listEntries: entries as string[],
    };
    data.value = def ?? "";
  }
  const helpElement = child(ffData, "helpText");
  const statusElement = child(ffData, "statusText");
  const help = plain(helpElement ? attr(helpElement, "val") : undefined, 255);
  const status = plain(
    statusElement ? attr(statusElement, "val") : undefined,
    138,
  );
  const entryMacro = plain(
    child(ffData, "entryMacro")?.textContent ?? undefined,
    32,
  );
  const exitMacro = plain(
    child(ffData, "exitMacro")?.textContent ?? undefined,
    32,
  );
  if (help !== undefined) data.helpText = help;
  if (status !== undefined) data.statusText = status;
  if (entryMacro !== undefined) data.entryMacro = entryMacro;
  if (exitMacro !== undefined) data.exitMacro = exitMacro;
  return data;
}

const flag = (name: string, value: boolean): string =>
  value ? `<w:${name} w:val="true"/>` : `<w:${name} w:val="false"/>`;
const val = (name: string, value: string): string =>
  `<w:${name} w:val="${escapeXml(value)}"/>`;

export function serializeFfData(data: EditorLegacyFormFieldData): string {
  let body =
    val("name", data.name) +
    flag("enabled", data.enabled) +
    flag("calcOnExit", data.calcOnExit);
  if (data.control === "text") {
    const input = data.textInput ?? {};
    body +=
      `<w:textInput${input.format ? ` w:format="${escapeXml(input.format)}"` : ""}${input.type ? ` w:type="${escapeXml(input.type)}"` : ""}` +
      (input.maxLength !== undefined
        ? ` w:maxLength="${input.maxLength}"`
        : "") +
      ">" +
      (input.default !== undefined ? val("default", input.default) : "") +
      "</w:textInput>";
  } else if (data.control === "checkBox") {
    const box = data.checkBox ?? { checked: false, default: false };
    body +=
      `<w:checkBox${box.size !== undefined ? ` w:size="${box.size}"` : ""}` +
      (box.sizeAuto ? ` w:sizeAuto="true"` : "") +
      ">" +
      flag("checked", box.checked) +
      flag("default", box.default) +
      "</w:checkBox>";
  } else {
    const list = data.ddList ?? { listEntries: [] };
    body +=
      "<w:ddList>" +
      list.listEntries.map((e) => val("listEntry", e)).join("") +
      (list.defaultResult !== undefined
        ? val("defaultResult", list.defaultResult)
        : "") +
      "</w:ddList>";
  }
  if (data.helpText !== undefined) body += val("helpText", data.helpText);
  if (data.statusText !== undefined) body += val("statusText", data.statusText);
  if (data.entryMacro !== undefined)
    body += `<w:entryMacro>${escapeXml(data.entryMacro)}</w:entryMacro>`;
  if (data.exitMacro !== undefined)
    body += `<w:exitMacro>${escapeXml(data.exitMacro)}</w:exitMacro>`;
  return `<w:ffData>${body}</w:ffData>`;
}

export function isLegacyFormInstruction(raw: string): boolean {
  const parsed = parseFieldInstruction(raw);
  return (
    parsed.command === "FORMTEXT" ||
    parsed.command === "FORMCHECKBOX" ||
    parsed.command === "FORMDROPDOWN"
  );
}
