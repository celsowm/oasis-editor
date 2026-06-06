export type BrotliDecompress = (bytes: Uint8Array) => Promise<Uint8Array>;
export type BrotliDecompressSync = (bytes: Uint8Array) => Uint8Array;

function nodeBrotliModule():
  | { brotliDecompressSync?: (bytes: Uint8Array) => Uint8Array }
  | null {
  const processLike = (globalThis as { process?: unknown }).process as
    | { getBuiltinModule?: (name: string) => unknown }
    | undefined;
  const getBuiltinModule = processLike?.getBuiltinModule;
  if (typeof getBuiltinModule !== "function") {
    return null;
  }
  return (
    (getBuiltinModule("node:zlib") as {
      brotliDecompressSync?: (bytes: Uint8Array) => Uint8Array;
    }) ??
    (getBuiltinModule("zlib") as {
      brotliDecompressSync?: (bytes: Uint8Array) => Uint8Array;
    }) ??
    null
  );
}

export const decompressBrotliSync: BrotliDecompressSync = (bytes) => {
  const zlib = nodeBrotliModule();
  if (typeof zlib?.brotliDecompressSync !== "function") {
    throw new Error("Synchronous Brotli decompression is unavailable");
  }
  return new Uint8Array(zlib.brotliDecompressSync(bytes));
};

export const decompressBrotli: BrotliDecompress = async (bytes) => {
  const zlib = nodeBrotliModule();
  if (typeof zlib?.brotliDecompressSync === "function") {
    return decompressBrotliSync(bytes);
  }

  if (typeof DecompressionStream !== "undefined") {
    try {
      const stream = new DecompressionStream("br" as CompressionFormat);
      const writer = stream.writable.getWriter();
      await writer.write(bytes as BufferSource);
      await writer.close();

      const chunks: Uint8Array[] = [];
      const reader = stream.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return result;
    } catch {
      // Browsers may expose DecompressionStream but reject "br"; use JS below.
    }
  }

  const module = await import("brotli/decompress.js");
  const output = module.default(bytes);
  return output instanceof Uint8Array ? output : new Uint8Array(output);
};
