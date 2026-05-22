import type {
  ApiErrorBody,
  FieldErrors,
  LoginCredentials,
  SignupCredentials,
  SignupInput,
  TokenResponse,
  User,
} from "@/features/auth/model/auth.types";
import { getAccessToken, setAccessToken } from "@/shared/network/access-token";
import { toApiUrl } from "@/shared/network/api-config";
import { importPublicKey, rsaEncrypt } from "@/shared/utils/rsa-encrypt";

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

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(toApiUrl(`/auth${path}`), {
    ...init,
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

let refreshInFlight: Promise<TokenResponse> | null = null;

async function performRefresh(): Promise<TokenResponse> {
  const tokenData = await authFetch<TokenResponse>("/refresh", {
    method: "POST",
  });

  setAccessToken(tokenData.accessToken);
  return tokenData;
}

async function buildLoginBody(email: string, password: string): Promise<LoginCredentials> {
  const publicKeyPem = await authApi.getPublicKey();
  const cryptoKey = await importPublicKey(publicKeyPem);

  return {
    encryptedEmail: await rsaEncrypt(cryptoKey, email),
    encryptedPassword: await rsaEncrypt(cryptoKey, password),
  };
}

async function buildSignupBody(input: SignupInput): Promise<SignupCredentials> {
  const publicKeyPem = await authApi.getPublicKey();
  const cryptoKey = await importPublicKey(publicKeyPem);

  return {
    encryptedEmail: await rsaEncrypt(cryptoKey, input.email),
    encryptedPassword: await rsaEncrypt(cryptoKey, input.password),
    encryptedPasswordConfirm: await rsaEncrypt(cryptoKey, input.passwordConfirm),
    userName: input.userName,
    phoneNumber: input.phoneNumber,
    jobTitle: input.jobTitle,
    companyId: input.companyId,
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

    return authApi.me();
  },

  async signup(input: SignupInput) {
    const body = await buildSignupBody(input);
    return authFetch<TokenResponse>("/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async refresh() {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }

    return refreshInFlight;
  },

  async me() {
    return authFetch<User>("/me");
  },

  async logout() {
    await authFetch<void>("/logout", {
      method: "POST",
    });
    setAccessToken(null);
  },
};
