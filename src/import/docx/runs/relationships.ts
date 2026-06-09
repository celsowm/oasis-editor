import JSZip from "jszip";
import { type Element as XmlElement } from "@xmldom/xmldom";
import { imageMimeFromPath } from "../../../utils/imageFormats.js";
import { type AssetRegistry, registerImageAsset } from "../assetRegistry.js";

export function isAbsoluteUri(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith("//");
}

export function parseRelationshipId(element: XmlElement): string | undefined {
  for (let i = 0; i < element.attributes.length; i += 1) {
    const attr = element.attributes[i];
    if (!attr) {
      continue;
    }
    if (attr.localName === "id" || attr.name === "r:id") {
      return attr.value;
    }
  }
  return undefined;
}

export function parseBlipRels(blip: XmlElement): { embed?: string; link?: string } {
  const result: { embed?: string; link?: string } = {};
  for (let i = 0; i < blip.attributes.length; i += 1) {
    const attr = blip.attributes[i];
    if (!attr) {
      continue;
    }
    if (attr.localName === "embed" || attr.name === "r:embed") {
      result.embed = attr.value;
    } else if (attr.localName === "link" || attr.name === "r:link") {
      result.link = attr.value;
    }
  }
  return result;
}

export async function loadEmbeddedImage(
  zip: JSZip,
  assets: AssetRegistry,
  target: string,
): Promise<string | undefined> {
  let zipPath = target;
  if (zipPath.startsWith("/")) zipPath = zipPath.slice(1);
  if (!zipPath.startsWith("word/")) zipPath = "word/" + target;
  const file = zip.file(zipPath);
  const mime = imageMimeFromPath(target) ?? "image/png";
  const base64 = await file?.async("base64");
  if (!base64) {
    return undefined;
  }
  return registerImageAsset(assets, zipPath, `data:${mime};base64,${base64}`);
}
