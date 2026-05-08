import type {
  ApiErrorBody,
  FieldErrors,
  LoginCredentials,
  TokenResponse,
  User,
} from "@/features/auth/model/auth.types";
import {
  clearRefreshTokenCookieMarker,
  getAccessToken,
  markRefreshTokenCookieAvailable,
  setAccessToken,
} from "@/shared/network/access-token";
import { toApiUrl } from "@/shared/network/api-config";
import { importPublicKey, rsaEncrypt } from "@/shared/utils/rsa-encrypt";

interface AuthFetchOptions extends RequestInit {
  includeAuthorization?: boolean;
}

export class ValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class RateLimitError extends Error {
  remainingSeconds: number;

  constructor(message: string, remainingSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.remainingSeconds = remainingSeconds;
  }
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function toRequestError(status: number, body: unknown) {
  const data = typeof body === "object" && body !== null ? (body as ApiErrorBody) : undefined;

  if (status === 403 && data?.details?.blocked) {
    return new RateLimitError(
      data.message ?? "잠시 후 다시 시도해주세요.",
      data.details.remainingSeconds ?? 60,
    );
  }

  if (data?.messages && Object.keys(data.messages).length > 0) {
    return new ValidationError(
      data.error ?? data.message ?? "입력값을 확인해주세요.",
      data.messages,
    );
  }

  const message =
    data?.message ??
    data?.error ??
    (typeof body === "string" && body ? body : "요청 처리 중 오류가 발생했습니다.");

  return new Error(message);
}

async function authFetch<T>(path: string, init?: AuthFetchOptions): Promise<T> {
  const { includeAuthorization = false, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers);
  const token = getAccessToken();

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuthorization && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(toApiUrl(`/auth${path}`), {
    ...requestInit,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw toRequestError(response.status, await readResponseBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return readResponseBody(response) as Promise<T>;
}

async function buildLoginBody(email: string, password: string): Promise<LoginCredentials> {
  const publicKeyPem = await authApi.getPublicKey();
  const cryptoKey = await importPublicKey(publicKeyPem);

  return {
    encryptedEmail: await rsaEncrypt(cryptoKey, email),
    encryptedPassword: await rsaEncrypt(cryptoKey, password),
  };
}

export const authApi = {
  async getPublicKey() {
    return authFetch<string>("/getPublicKey");
  },

  async login(email: string, password: string) {
    const body = await buildLoginBody(email, password);
    const tokenData = await authFetch<TokenResponse>("/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setAccessToken(tokenData.accessToken);
    markRefreshTokenCookieAvailable();

    return authApi.me();
  },

  async refresh() {
    const tokenData = await authFetch<TokenResponse>("/refresh", {
      method: "POST",
    });

    setAccessToken(tokenData.accessToken);
    markRefreshTokenCookieAvailable();
    return tokenData;
  },

  async me() {
    return authFetch<User>("/me", {
      includeAuthorization: true,
    });
  },

  async logout() {
    await authFetch<void>("/logout", {
      method: "POST",
    });
    setAccessToken(null);
    clearRefreshTokenCookieMarker();
  },
};
