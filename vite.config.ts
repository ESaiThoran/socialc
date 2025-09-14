import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cartographer } from "@replit/vite-plugin-cartographer";
import replitRuntimeErrorModal from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    cartographer(),
    replitRuntimeErrorModal(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  root: path.resolve(__dirname, "./frontend"),
  build: {
    outDir: path.resolve(__dirname, "./backend/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
  },
});