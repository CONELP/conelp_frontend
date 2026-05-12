import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const demoDataRoot = fileURLToPath(new URL("./data", import.meta.url));
const demoDataRoutePrefix = "/data";

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function resolveDemoDataFilePath(requestUrl: string | undefined) {
  const pathname = new URL(requestUrl ?? "", "http://localhost").pathname;

  if (!pathname.startsWith(demoDataRoutePrefix)) {
    return null;
  }

  let relativePath = "";

  try {
    relativePath = decodeURIComponent(pathname.slice(demoDataRoutePrefix.length));
  } catch {
    return null;
  }

  const filePath = path.resolve(demoDataRoot, relativePath.replace(/^\/+/, ""));
  const isInsideDemoDataRoot =
    filePath === demoDataRoot || filePath.startsWith(`${demoDataRoot}${path.sep}`);

  return isInsideDemoDataRoot ? filePath : null;
}

function createDemoDataMiddleware() {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    const filePath = resolveDemoDataFilePath(request.url);

    if (!filePath) {
      next();
      return;
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        next();
        return;
      }

      response.setHeader("Content-Type", getContentType(filePath));
      createReadStream(filePath)
        .on("error", next)
        .pipe(response);
    } catch {
      next();
    }
  };
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "conelp-demo-data",
      configureServer(server) {
        server.middlewares.use(createDemoDataMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createDemoDataMiddleware());
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
