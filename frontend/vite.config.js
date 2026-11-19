import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server forwards /api to the backend, so the browser sees a single origin: the refresh
// cookie (ss_refresh, SameSite=Strict, path /api/auth) and the guest device cookie (ss_device,
// path /api) are sent, and no CORS is needed. The target is 127.0.0.1 because Node may resolve
// localhost to ::1 first. API_PROXY_TARGET lets the Playwright run use its own backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
    },
  },
});
