import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
  server: {
    port: 5174,
  },
});
