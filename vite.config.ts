import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Renderer (React) — собирается в dist/, Electron грузит index.html через file://
export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false, target: 'chrome128' },
  optimizeDeps: { include: ['@tosmedia/ai-assistant'] },
  test: { environment: 'jsdom', globals: true },
} as any);
