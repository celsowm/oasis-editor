import type {
  EditorDocument,
  EditorTextRun,
  EditorTextStyle,
} from "@/core/model.js";
import { resolveImageSrc } from "@/core/model.js";
import { escapeHtml } from "./htmlEscape.js";
import { getPrimaryTextLanguage, textRunStylesToCss } from "./styleCss.js";

function textLanguageToHtmlAttributes(
  language: EditorTextStyle["language"],
): string {
  if (!language) {
    return "";
  }
  const attrs: string[] = [];
  const primary = getPrimaryTextLanguage(language);
  if (primary) {
    attrs.push(`lang="${escapeHtml(primary)}"`);
  }
  if (language.value) {
    attrs.push(`data-oasis-lang-value="${escapeHtml(language.value)}"`);
  }
  if (language.eastAsia) {
    attrs.push(`data-oasis-lang-east-asia="${escapeHtml(language.eastAsia)}"`);
  }
  if (language.bidi) {
    attrs.push(`data-oasis-lang-bidi="${escapeHtml(language.bidi)}"`);
  }
  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

export function serializeImageRunToHtml(
  run: EditorTextRun,
  document?: Pick<EditorDocument, "assets">,
): string {
  if (run.kind !== "image") {
    return "";
  }

  const resolvedSrc = resolveImageSrc(document, run.image.src);
  const altAttr =
    run.image.alt !== undefined ? ` alt="${escapeHtml(run.image.alt)}"` : "";
  const img = `<img src="${escapeHtml(resolvedSrc)}" width="${Math.max(1, Math.round(run.image.width))}" height="${Math.max(1, Math.round(run.image.height))}"${altAttr}>`;
  if (run.styles?.link) {
    return `<a href="${escapeHtml(run.styles.link)}">${img}</a>`;
  }

  return img;
}

export function serializeTextRunToHtml(
  run: EditorTextRun,
  document?: Pick<EditorDocument, "assets">,
): string {
  if (run.kind === "image") {
    return serializeImageRunToHtml(run, document);
  }

  const text = escapeHtml(run.text).replace(/\n/g, "<br>");
  let html = text;
  const style = run.styles ?? undefined;
  if (style?.strike) {
    html = `<s>${html}</s>`;
  }
  if (style?.underline) {
    html = `<u>${html}</u>`;
  }
  if (style?.italic) {
    html = `<em>${html}</em>`;
  }
  if (style?.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (style?.superscript) {
    html = `<sup>${html}</sup>`;
  } else if (style?.subscript) {
    html = `<sub>${html}</sub>`;
  }

  const css = textRunStylesToCss(style);
  const languageAttrs = textLanguageToHtmlAttributes(style?.language);
  if (css.length > 0 || languageAttrs.length > 0) {
    const styleAttr = css.length > 0 ? ` style="${css}"` : "";
    html = `<span${styleAttr}${languageAttrs}>${html}</span>`;
  }
  if (style?.link) {
    html = `<a href="${escapeHtml(style.link)}">${html}</a>`;
  }
  return html;
}

export function serializeParagraphRunsToHtml(
  runs: EditorTextRun[],
  document?: Pick<EditorDocument, "assets">,
): string {
  return (
    runs.map((run): string => serializeTextRunToHtml(run, document)).join("") ||
    "<br>"
  );
}
