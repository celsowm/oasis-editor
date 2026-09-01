import type { EditorDocumentDesign } from "@/core/model.js";
import { escapeXml } from "./xmlUtils.js";

const themes: Record<
  string,
  { accent: string; heading: string; body: string }
> = {
  oasis: { accent: "0F766E", heading: "115E59", body: "1F2937" },
  office: { accent: "4472C4", heading: "2F5597", body: "1F2937" },
  facet: { accent: "8064A2", heading: "604A7B", body: "262626" },
  integral: { accent: "70AD47", heading: "548235", body: "1F2937" },
  ion: { accent: "ED7D31", heading: "C55A11", body: "262626" },
  retrospect: { accent: "5B9BD5", heading: "2F75B5", body: "1F2937" },
};

export function buildThemeXml(design?: EditorDocumentDesign): string {
  const source = design?.themeData?.sourceXml;
  if (source) return source;
  const preset = themes[design?.themeId ?? "oasis"] ?? themes.oasis;
  const data = design?.themeData;
  const color = (slot: string, fallback: string): string =>
    (data?.colors?.[slot] ?? fallback).replace(/^#/, "").toUpperCase();
  const colors: Record<string, string> = {
    dk1: color("dk1", "000000"),
    lt1: color("lt1", "FFFFFF"),
    dk2: color("dk2", preset.body),
    lt2: color("lt2", "FFFFFF"),
    accent1: color("accent1", preset.accent),
    accent2: color("accent2", preset.heading),
    accent3: color("accent3", "5B9BD5"),
    accent4: color("accent4", "70AD47"),
    accent5: color("accent5", "ED7D31"),
    accent6: color("accent6", "A5A5A5"),
    hlink: color("hlink", "0563C1"),
    folHlink: color("folHlink", "954F72"),
  };
  const colorXml = Object.entries(colors)
    .map(
      ([slot, value]) => `<a:${slot}><a:srgbClr val="${value}"/></a:${slot}>`,
    )
    .join("");
  const font = (
    group: "major" | "minor",
    key: string,
    fallback: string,
  ): string => escapeXml(data?.fonts?.[group]?.[key] ?? fallback);
  const themeName =
    data?.name ??
    `${(design?.themeId ?? "oasis")[0]!.toUpperCase()}${(design?.themeId ?? "oasis").slice(1)}`;
  const name = escapeXml(themeName);
  const effects =
    data?.effectsXml ??
    "<a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/>";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${name}"><a:themeElements><a:clrScheme name="${name}">${colorXml}</a:clrScheme><a:fontScheme name="${name}"><a:majorFont><a:latin typeface="${font("major", "majorHAnsi", "Aptos Display")}"/><a:ea typeface="${font("major", "majorEastAsia", "Aptos Display")}"/><a:cs typeface="${font("major", "majorBidi", "Aptos Display")}"/></a:majorFont><a:minorFont><a:latin typeface="${font("minor", "minorHAnsi", "Aptos")}"/><a:ea typeface="${font("minor", "minorEastAsia", "Aptos")}"/><a:cs typeface="${font("minor", "minorBidi", "Aptos")}"/></a:minorFont></a:fontScheme><a:fmtScheme name="${name}">${effects}</a:fmtScheme></a:themeElements></a:theme>`;
}
