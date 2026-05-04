import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    base: isLib ? './' : '/',
    build: {
      outDir: isLib ? 'dist' : 'dist-app',
      lib: isLib ? {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'OasisEditor',
        fileName: 'oasis-editor',
        formats: ['es', 'umd'],
      } : undefined,
      rollupOptions: {
        input: isLib ? undefined : {
          root: resolve(__dirname, 'index.html'),
          oasisEditor: resolve(__dirname, 'oasis-editor/index.html'),
          oasisEditorLegacy: resolve(__dirname, 'oasis-editor-legacy/index.html'),
        },
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
