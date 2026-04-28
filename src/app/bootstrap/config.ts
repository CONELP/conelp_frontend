const DEFAULT_API_BASE_URL = "https://dev.conelp.kr/api";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL,
} as const;
