import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the backend (DO NOT strip /api prefix)
      // Backend mounts routes at /api/auth, /api/tenancy, etc.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // No rewrite — backend expects the full /api/... path
      },
    },
  },
});
