import { clearAccessToken, getAccessToken, setAccessToken } from "@/shared/network/access-token";
import { toApiUrl } from "@/shared/network/api-config";
import type { TokenResponse } from "@/features/auth/model/auth.types";

type ApiBody = BodyInit | Record<string, unknown> | unknown[] | null;

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: ApiBody;
  retryOnUnauthorized?: boolean;
}

function isFormBody(body: ApiBody): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function resolveBody(body: ApiBody | undefined) {
  if (body === undefined || body === null || isFormBody(body) || typeof body === "string") {
    return body as BodyInit | null | undefined;
  }

  return JSON.stringify(body);
}

function buildHeaders(body: ApiBody | undefined, initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  const token = getAccessToken();
  const selectedProjectId = localStorage.getItem("selectedProjectId");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    selectedProjectId &&
    selectedProjectId !== "undefined" &&
    selectedProjectId !== "null" &&
    !headers.has("X-Project-Id")
  ) {
    headers.set("X-Project-Id", selectedProjectId);
  }

  if (body !== undefined && body !== null && !isFormBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function refreshAccessToken() {
  const response = await fetch(toApiUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("인증이 만료되었습니다.");
  }

  const tokenData = (await response.json()) as TokenResponse;
  setAccessToken(tokenData.accessToken);
}

async function redirectToLogin() {
  const { router } = await import("@/app/router");
  const currentPath = router.currentRoute.value.fullPath;

  if (router.currentRoute.value.path !== "/login") {
    await router.push({
      path: "/login",
      query: { redirect: currentPath },
    });
  }
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? `API 요청 실패 (${response.status})`;
  }

  const text = await response.text();
  return text || `API 요청 실패 (${response.status})`;
}

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response.blob() as Promise<T>;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, retryOnUnauthorized = true, ...init } = options;
  const response = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    body: resolveBody(body),
    headers: buildHeaders(body, init.headers),
  });

  if ((response.status === 401 || response.status === 403) && retryOnUnauthorized) {
    try {
      await refreshAccessToken();
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    } catch {
      clearAccessToken();
      await redirectToLogin();
      throw new Error("로그인이 필요합니다.");
    }
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return parseSuccessResponse<T>(response);
}
