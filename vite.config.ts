import { fileURLToPath, URL } from "node:url";
import { existsSync, readFileSync } from "node:fs";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CONELP",
        short_name: "CONELP",
        description: "건설현장 문서 변환 서비스",
        lang: "ko",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#1e1888",
        background_color: "#f4f4f4",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff,woff2,webmanifest}"],
        navigateFallback: "index.html",
        // /api·/ws 요청이 index.html 셸로 fallback 되지 않도록 방어 (방어용; 프로덕션 API는 cross-origin)
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/ws(?:\/|$)/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
