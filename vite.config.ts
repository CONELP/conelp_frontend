import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://api.conelp.kr",
        changeOrigin: true,
        secure: true,
      },
      "/ws": {
        target: "wss://api.conelp.kr",
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
