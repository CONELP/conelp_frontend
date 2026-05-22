import { authApi } from "@/features/auth/services/auth-api";
import { clearAccessToken, getAccessToken } from "@/shared/network/access-token";
import { toApiUrl } from "@/shared/network/api-config";
import { shouldSendProjectHeader } from "@/shared/network/project-header-policy";

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

function buildHeaders(path: string, body: ApiBody | undefined, initHeaders?: HeadersInit) {
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
    !headers.has("X-Project-Id") &&
    shouldSendProjectHeader(path)
  ) {
    headers.set("X-Project-Id", selectedProjectId);
  }

  if (body !== undefined && body !== null && !isFormBody(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
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

async function rawApiFetch(path: string, options: ApiFetchOptions): Promise<Response> {
  const { body, retryOnUnauthorized = true, ...init } = options;
  const response = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    body: resolveBody(body),
    headers: buildHeaders(path, body, init.headers),
  });

  if ((response.status === 401 || response.status === 403) && retryOnUnauthorized) {
    try {
      await authApi.refresh();
      return rawApiFetch(path, { ...options, retryOnUnauthorized: false });
    } catch {
      clearAccessToken();
      await redirectToLogin();
      throw new Error("로그인이 필요합니다.");
    }
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await rawApiFetch(path, options);
  return parseSuccessResponse<T>(response);
}

function parseAttachmentFilename(disposition: string | null): string {
  if (!disposition) {
    return "";
  }

  const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = disposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = disposition.match(/filename\s*=\s*([^;]+)/i);
  if (bareMatch?.[1]) {
    return bareMatch[1].trim();
  }

  return "";
}

export async function apiFetchAttachment(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const response = await rawApiFetch(path, options);
  const blob = await response.blob();
  const filename = parseAttachmentFilename(response.headers.get("content-disposition"));
  return { blob, filename };
}
