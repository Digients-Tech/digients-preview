import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy API + video requests to the Hono server so the frontend and backend
// share an origin (cookies just work). In production the Hono server serves the build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
      "/videos": { target: "http://localhost:8787", changeOrigin: true },
      "/posters": { target: "http://localhost:8787", changeOrigin: true },
      "/captions": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
});
