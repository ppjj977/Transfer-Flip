import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static site, no backend. Base is './' so it works on GitHub Pages subpaths
// and Cloudflare Pages alike.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
