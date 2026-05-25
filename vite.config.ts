import { fileURLToPath, URL } from "node:url";
import { existsSync, readFileSync } from "node:fs";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const localHttpsKeyPath = fileURLToPath(new URL("./.cert/dev.key", import.meta.url));
const localHttpsCertPath = fileURLToPath(new URL("./.cert/dev.crt", import.meta.url));
const localHttps =
  existsSync(localHttpsKeyPath) && existsSync(localHttpsCertPath)
    ? {
        key: readFileSync(localHttpsKeyPath),
        cert: readFileSync(localHttpsCertPath),
      }
    : undefined;

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    https: localHttps,
    proxy: {
      "/api": {
        target: "https://dev.conelp.kr",
        changeOrigin: true,
        secure: true,
      },
      "/ws": {
        target: "wss://dev.conelp.kr",
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
