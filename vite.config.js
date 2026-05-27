import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'fs';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import solidPlugin from 'vite-plugin-solid';

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
      solidPlugin(),
      isLib && {
        name: 'copy-pdf-font-assets',
        writeBundle() {
          cpSync(
            resolve(__dirname, 'src/export/pdf/fonts/assets'),
            resolve(__dirname, 'dist/assets'),
            { recursive: true },
          );
        },
      },
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
