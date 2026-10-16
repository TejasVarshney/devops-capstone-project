import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the browser still calls relative /api/... URLs;
// Vite forwards them to FastAPI, just like Nginx and the Ingress do in production.
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      // Swagger UI, so the sidebar's "API docs" link also works in development.
      "/docs": { target: apiTarget, changeOrigin: true },
      "/openapi.json": { target: apiTarget, changeOrigin: true },
    },
  },
});
