import decompressBrotliJs from "brotli/decompress.js";

export type BrotliDecompress = (bytes: Uint8Array) => Promise<Uint8Array>;
export type BrotliDecompressSync = (bytes: Uint8Array) => Uint8Array;

/**
 * Pure-JS synchronous brotli decode, statically bundled. This is what lets the
 * browser decode the bundled WOFF2 metric fonts *synchronously* on the very
 * first layout pass — so text is measured with real font metrics from the
 * start, with no async preload window during which a heuristic would be used.
 */
function decompressBrotliJsSync(bytes: Uint8Array): Uint8Array {
  const output = decompressBrotliJs(bytes);
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

function nodeBrotliModule(): {
  brotliDecompressSync?: (bytes: Uint8Array) => Uint8Array;
} | null {
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
  if (typeof zlib?.brotliDecompressSync === "function") {
    // Node: native zlib brotli is fastest.
    return new Uint8Array(zlib.brotliDecompressSync(bytes));
  }
  // Browser: no Node zlib — decode synchronously with the bundled JS decoder.
  return decompressBrotliJsSync(bytes);
};

export const decompressBrotli: BrotliDecompress = async (bytes) =>
  decompressBrotliSync(bytes);
