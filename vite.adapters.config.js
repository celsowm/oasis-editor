import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Separate Vite build for the React/Vue/UI subpath adapter files.
// Each entry externalises oasis-editor + its own framework so the output
// contains only the thin wrapper and import declarations.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: {
        ui: resolve(__dirname, 'src/adapters/ui.ts'),
        react: resolve(__dirname, 'src/adapters/react.ts'),
        vue: resolve(__dirname, 'src/adapters/vue.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'vue', 'oasis-editor'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    dts({
      outDir: 'dist',
      entryRoot: 'src/adapters',
      include: ['src/adapters'],
      compilerOptions: {
        paths: {
          '@/*': ['src/*'],
          'oasis-editor': ['./src/index.ts'],
        },
      },
    }),
  ],
});
