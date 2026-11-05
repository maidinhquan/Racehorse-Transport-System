import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 100,
    },

    proxy: {
      "/api": {
        target:
          process.env.API_PROXY_TARGET ??
          "http://localhost:5129",
        changeOrigin: true,
      },
      "/hubs": {
        target:
          process.env.API_PROXY_TARGET ??
          "http://localhost:5129",
        changeOrigin: true,
        ws: true,
      },
      "/osrm": {
        target: "https://router.project-osrm.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osrm/, ""),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RacehorseTransport/1.0",
        },
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/shared/test/setup.ts"],
    css: true,
    clearMocks: true,
    testTimeout: 15000,
  },
});
