import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-pdf', 'pdfjs-dist'],
    esbuildOptions: {
      // Ensure Node.js globals are available
      define: {
        global: 'globalThis',
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      nodePolyfills({
        protocolImports: true,
      }),
    ],
  },
});
