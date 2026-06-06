import { defineConfig } from 'vite';
import { existsSync, promises as fsp } from 'fs';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import solidPlugin from 'vite-plugin-solid';

// Inlines `*.woff2?base64` imports as a base64 string in EVERY mode — dev server,
// `vite build`, and vitest's SSR transform. (Vite's built-in `?inline` only
// inlines during a production build; in dev/SSR it returns a URL, which would
// leave the font bytes unavailable at runtime.) This is what keeps the bundled
// metric fonts self-contained, with no runtime asset fetch.
function fontBase64Plugin() {
  const suffix = '?base64';
  return {
    name: 'font-base64',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith(suffix)) return null;
      const resolved = await this.resolve(id.slice(0, -suffix.length), importer, {
        skipSelf: true,
      });
      return resolved ? `${resolved.id}${suffix}` : null;
    },
    async load(id) {
      if (!id.endsWith(suffix)) return null;
      const filePath = id.slice(0, -suffix.length);
      const bytes = await fsp.readFile(filePath);
      return `export default ${JSON.stringify(bytes.toString('base64'))};`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    base: './',
    build: {
      outDir: isLib ? 'dist' : 'dist-app',
      assetsInlineLimit: isLib ? 0 : undefined,
      lib: isLib ? {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'OasisEditor',
        fileName: 'oasis-editor',
        formats: ['es', 'umd'],
      } : undefined,
      rollupOptions: {
        input: isLib ? undefined : Object.fromEntries(
          [
            ['root', 'index.html'],
            ['oasisEditor', 'oasis-editor/index.html'],
            ['oasisEditorLegacy', 'oasis-editor-legacy/index.html'],
          ]
            .filter(([, relativePath]) => existsSync(resolve(__dirname, relativePath)))
            .map(([key, relativePath]) => [key, resolve(__dirname, relativePath)]),
        ),
        output: isLib ? {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'oasis-editor.css';
            return assetInfo.name;
          },
        } : undefined,
      },
      minify: 'terser',
      terserOptions: {
        compress: true,
        mangle: true,
      },
    },
    plugins: [
      fontBase64Plugin(),
      solidPlugin(),
      // Font assets are embedded into the bundle as base64 (`?base64` imports in
      // officeFontAssets.ts), so there is no `dist/assets/*.woff2` to copy.
      isLib && dts({
        outDir: 'dist',
      }),
    ].filter(Boolean),
    test: {
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'dist-app', 'e2e/**'],
      environment: 'node',
      environmentMatchGlobs: [
        ['src/__tests__/ui/**', 'jsdom'],
      ],
    },
  };
});
