// The project's `font-base64` Vite plugin inlines `?base64` asset imports as a
// raw base64 string (in dev, build, and vitest's SSR transform alike).
declare module "*.woff2?base64" {
  const base64: string;
  export default base64;
}

declare module "*.webp?base64" {
  const base64: string;
  export default base64;
}
