import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // `@prism-pact/shared` is a linked TS source package outside this folder.
    fs: { allow: ['..'] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
