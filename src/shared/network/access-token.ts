let accessToken: string | null = null;
const ACCESS_TOKEN_STORAGE_KEY = "conelp:auth:access-token";
const REFRESH_COOKIE_MARKER_STORAGE_KEY = "conelp:auth:has-refresh-cookie";

function readStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      return;
    }

    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Token storage is a browser refresh convenience. Keep in-memory auth usable.
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  writeStoredAccessToken(token);
}

export function getAccessToken() {
  if (!accessToken) {
    accessToken = readStoredAccessToken();
  }

  return accessToken;
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function markRefreshTokenCookieAvailable() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REFRESH_COOKIE_MARKER_STORAGE_KEY, "true");
  } catch {
    // Non-sensitive marker only. Auth still works through the in-memory token.
  }
}

export function hasRefreshTokenCookieMarker() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(REFRESH_COOKIE_MARKER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearRefreshTokenCookieMarker() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(REFRESH_COOKIE_MARKER_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}
