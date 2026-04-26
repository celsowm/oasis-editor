import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    base: isLib ? './' : '/oasis-editor/',
    build: {
      outDir: isLib ? 'dist' : 'dist-app',
      lib: isLib ? {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'OasisEditor',
        fileName: 'oasis-editor',
        formats: ['es', 'umd'],
      } : undefined,
      rollupOptions: {
        input: isLib ? undefined : resolve(__dirname, 'index.html'),
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
  };
});
