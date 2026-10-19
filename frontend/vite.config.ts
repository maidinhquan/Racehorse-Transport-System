import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    proxy: {
      "/api": {
        target:
          process.env.API_PROXY_TARGET ??
          "http://localhost:5129",
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/shared/test/setup.ts"],
    css: true,
    clearMocks: true,
  },
});
