import JSZip from "jszip";

export interface ZipLimits {
  maxUncompressedSize: number;
  maxFileCount: number;
  maxCompressionRatio: number;
  maxEntrySize: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxUncompressedSize: 100 * 1024 * 1024, // 100 MB
  maxFileCount: 1000,
  maxCompressionRatio: 100,
  maxEntrySize: 50 * 1024 * 1024, // 50 MB per entry
};

export interface ZipEntry {
  name: string;
  content: Uint8Array;
  isDirectory: boolean;
}

export class ZipSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipSecurityError";
  }
}

export class SafeZipReader {
  private limits: ZipLimits;

  constructor(limits: Partial<ZipLimits> = {}) {
    this.limits = { ...DEFAULT_ZIP_LIMITS, ...limits };
  }

  async read(buffer: ArrayBuffer): Promise<Map<string, ZipEntry>> {
    const zip = await JSZip.loadAsync(buffer);
    const entries = new Map<string, ZipEntry>();

    const fileCount = Object.keys(zip.files).length;
    if (fileCount > this.limits.maxFileCount) {
      throw new ZipSecurityError(
        `ZIP file count ${fileCount} exceeds limit ${this.limits.maxFileCount}`,
      );
    }

    let totalUncompressed = 0;

    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) {
        entries.set(name, { name, content: new Uint8Array(), isDirectory: true });
        continue;
      }

      const jsEntry = entry as any;
      const compressedSize = jsEntry._data?.compressedSize ?? 0;
      const uncompressedSize = jsEntry._data?.uncompressedSize ?? compressedSize;

      if (uncompressedSize > this.limits.maxEntrySize) {
        throw new ZipSecurityError(
          `ZIP entry ${name} size ${uncompressedSize} exceeds limit ${this.limits.maxEntrySize}`,
        );
      }

      if (compressedSize > 0) {
        const ratio = uncompressedSize / compressedSize;
        if (ratio > this.limits.maxCompressionRatio) {
          throw new ZipSecurityError(
            `ZIP entry ${name} compression ratio ${ratio.toFixed(1)} exceeds limit ${this.limits.maxCompressionRatio}`,
          );
        }
      }

      totalUncompressed += uncompressedSize;
      if (totalUncompressed > this.limits.maxUncompressedSize) {
        throw new ZipSecurityError(
          `Total uncompressed size exceeds limit ${this.limits.maxUncompressedSize}`,
        );
      }

      // Prevent path traversal
      const normalized = this.normalizePath(name);
      if (normalized.startsWith("..") || normalized.includes("/../")) {
        throw new ZipSecurityError(`Path traversal detected: ${name}`);
      }

      const content = await entry.async("uint8array");
      entries.set(normalized, { name: normalized, content, isDirectory: false });
    }

    return entries;
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, "/").replace(/^\//, "");
  }
}
