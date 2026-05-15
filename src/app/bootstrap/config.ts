const DEFAULT_API_BASE_URL = "/api";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL,
  wsUrl: import.meta.env.VITE_WS_URL?.replace(/\/$/, "") ?? null,
} as const;
