import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'matrix-sdk': ['matrix-js-sdk'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
        }
      }
    }
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  define: {
    // matrix-js-sdk expects `global` to exist (Node.js convention)
    global: 'globalThis',
  },
  optimizeDeps: {
    // Ensure matrix-js-sdk and its crypto deps are pre-bundled
    include: ['matrix-js-sdk'],
  },
});
