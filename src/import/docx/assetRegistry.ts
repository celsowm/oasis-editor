import type { EditorAsset } from "@/core/model.js";
import { EDITOR_ASSET_REF_PREFIX } from "@/core/model.js";

/**
 * Mutable registry that collects unique image payloads encountered during
 * import and assigns each a stable id. Image runs reference the entry via
 * `image.src = "asset:<id>"` so the heavy base64 payload lives in
 * `document.assets` exactly once instead of being copied into every run.
 */
export interface AssetRegistry {
  /** id → asset record (stored as the document's `assets` map). */
  assets: Record<string, EditorAsset>;
  /** zip path → asset id, used to dedupe images that share a source file. */
  byPath: Map<string, string>;
  /** monotonically increasing counter used to mint new asset ids. */
  nextId: number;
}

export function createAssetRegistry(): AssetRegistry {
  return { assets: {}, byPath: new Map(), nextId: 1 };
}

export function registerImageAsset(
  registry: AssetRegistry,
  zipPath: string,
  url: string,
): string {
  const existing = registry.byPath.get(zipPath);
  if (existing) {
    return `${EDITOR_ASSET_REF_PREFIX}${existing}`;
  }
  const id = `img-${registry.nextId}`;
  registry.nextId += 1;
  registry.assets[id] = { id, url };
  registry.byPath.set(zipPath, id);
  return `${EDITOR_ASSET_REF_PREFIX}${id}`;
}
