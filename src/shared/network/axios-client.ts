import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { authApi } from "@/features/auth/services/auth-api";
import { apiBaseUrl } from "@/shared/network/api-config";
import { clearAccessToken, getAccessToken } from "@/shared/network/access-token";
import { shouldSendProjectHeader } from "@/shared/network/project-header-policy";

const SELECTED_PROJECT_ID_STORAGE_KEY = "selectedProjectId";

function readSelectedProjectId() {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(SELECTED_PROJECT_ID_STORAGE_KEY);
  if (!value || value === "undefined" || value === "null") return null;
  return value;
}

interface AxiosRetryConfig extends InternalAxiosRequestConfig {
  _retryOnUnauthorized?: boolean;
}

export const axiosClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  const projectId = readSelectedProjectId();
  if (projectId && !config.headers.has("X-Project-Id") && shouldSendProjectHeader(config.url)) {
    config.headers.set("X-Project-Id", projectId);
  }

  return config;
});

async function redirectToLogin() {
  const { router } = await import("@/app/router");
  const currentPath = router.currentRoute.value.fullPath;
  if (router.currentRoute.value.path !== "/login") {
    await router.push({ path: "/login", query: { redirect: currentPath } });
  }
}

function readMessageFromAxiosError(error: AxiosError) {
  const data = error.response?.data as { message?: string; error?: string } | undefined;
  return (
    data?.message ??
    data?.error ??
    error.message ??
    `API 요청 실패 (${error.response?.status ?? "unknown"})`
  );
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as AxiosRetryConfig | undefined;

    if (config && !config._retryOnUnauthorized && (status === 401 || status === 403)) {
      config._retryOnUnauthorized = true;
      try {
        await authApi.refresh();
        return axiosClient.request(config);
      } catch {
        clearAccessToken();
        await redirectToLogin();
        throw new Error("로그인이 필요합니다.");
      }
    }

    throw new Error(readMessageFromAxiosError(error));
  },
);

export default axiosClient;
