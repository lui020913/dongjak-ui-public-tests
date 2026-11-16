import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages hosts this public UI workbench below /dongjak-ui-public-tests/.
  // Cloudflare/local builds keep the root path and are not changed.
  base: process.env.DONGJAK_PUBLIC_BASE || '/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4173, strictPort: true }
});
