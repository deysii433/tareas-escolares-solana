/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 1000 },
  // Las pruebas de tests-playground/ se ejecutan en Solana Playground, no aquí.
  test: { include: ["tests/**/*.test.ts"] },
});
