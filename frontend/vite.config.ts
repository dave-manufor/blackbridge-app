import path from "path";
import { defineConfig } from "vite";
import comlink from "vite-plugin-comlink";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    comlink(),
    react(),
    tailwindcss(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
      protocolImports: true,
    }),
  ],
  worker: {
    plugins: () => [comlink()],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@api": path.resolve(__dirname, "./src/api"),
      "@assets": path.resolve(__dirname, "./src/assets/"),
      "@components": path.resolve(__dirname, "./src/components/"),
      "@constants": path.resolve(__dirname, "./src/constants/"),
      "@contexts": path.resolve(__dirname, "./src/contexts/"),
      "@hooks": path.resolve(__dirname, "./src/hooks/"),
      "@lib": path.resolve(__dirname, "./src/lib/"),
      "@layouts": path.resolve(__dirname, "./src/layouts/"),
      "@services": path.resolve(__dirname, "./src/services/"),
      "@stores": path.resolve(__dirname, "./src/stores/"),
      "@utils": path.resolve(__dirname, "./src/utils/"),
      "@views": path.resolve(__dirname, "./src/views/"),
      "@src": path.resolve(__dirname, "./src"),
      "@types": path.resolve(__dirname, "./src/types/"),
    },
  },
});
