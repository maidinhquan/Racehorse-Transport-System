import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test configuration is independent of local development proxy edits.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/shared/test/setup.ts"],
    css: true,
    clearMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/**", "tests-e2e/**", "node_modules/**", "dist/**"],
    testTimeout: 20000,
  },
});
