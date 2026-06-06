declare module "brotli/decompress.js" {
  const decompress: (bytes: Uint8Array) => Uint8Array;
  export default decompress;
}
