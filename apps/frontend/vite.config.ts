import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
    host: 'localhost',
    // Allow public dev tunnels (e.g. *.trycloudflare.com) to reach the dev
    // server; Vite otherwise rejects non-localhost Host headers.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.ngrok.io'],
    // The subject catalogs import the canonical taxonomy from the monorepo root
    // (../../scripts/taxonomy-data.mjs), which sits outside the frontend root —
    // allow the dev server to serve it.
    fs: { allow: ['../..'] },
  },
});
