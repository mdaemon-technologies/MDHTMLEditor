import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import dts from 'vite-plugin-dts';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  plugins: [
    // Enable HTTPS with self-signed cert for the dev server (needed for microphone access)
    basicSsl(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      afterBuild: () => {
        copyFileSync(
          resolve(__dirname, 'src/styles.d.ts'),
          resolve(__dirname, 'dist/styles.d.ts'),
        );
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MDHTMLEditor',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'index.mjs';
        if (format === 'umd') return 'index.umd.js';
        return 'index.js'; // cjs
      },
      cssFileName: 'styles',
    },
    rolldownOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    sourcemap: mode !== 'production',
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
}));
