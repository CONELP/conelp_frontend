import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { authApi, RateLimitError, ValidationError } from "@/features/auth/services/auth-api";
import type { FieldErrors, User } from "@/features/auth/model/auth.types";
import {
  clearAccessToken,
  clearRefreshTokenCookieMarker,
  getAccessToken,
  hasRefreshTokenCookieMarker,
} from "@/shared/network/access-token";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const error = ref<string | null>(null);
  const fieldErrors = ref<FieldErrors>({});
  const blockCountdown = ref(0);
  let blockTimer: ReturnType<typeof setInterval> | null = null;

  const isAuthenticated = computed(() => !!user.value);
  const isLoginBlocked = computed(() => blockCountdown.value > 0);

  function clearBlockTimer() {
    if (blockTimer) {
      clearInterval(blockTimer);
      blockTimer = null;
    }
  }

  function startBlockCountdown(seconds: number) {
    clearBlockTimer();
    blockCountdown.value = seconds;
    blockTimer = setInterval(() => {
      blockCountdown.value -= 1;
      if (blockCountdown.value <= 0) {
        clearBlockTimer();
        error.value = null;
      }
    }, 1000);
  }

  function setRequestError(requestError: unknown, fallbackMessage: string) {
    if (requestError instanceof RateLimitError) {
      error.value = requestError.message;
      startBlockCountdown(requestError.remainingSeconds);
      return;
    }

    if (requestError instanceof ValidationError) {
      error.value = requestError.message;
      fieldErrors.value = requestError.fieldErrors;
      return;
    }

    if (requestError instanceof Error) {
      error.value = requestError.message;
      return;
    }

    error.value = fallbackMessage;
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    error.value = null;
    fieldErrors.value = {};

    try {
      user.value = await authApi.login(email, password);
    } catch (requestError) {
      setRequestError(requestError, "로그인에 실패했습니다.");
      throw requestError;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;

    try {
      await authApi.logout();
    } catch {
      clearAccessToken();
      clearRefreshTokenCookieMarker();
    } finally {
      user.value = null;
      localStorage.removeItem("selectedProjectId");
      isLoading.value = false;
    }
  }

  async function initialize() {
    if (isInitialized.value) return;

    isLoading.value = true;

    try {
      if (getAccessToken()) {
        try {
          user.value = await authApi.me();
          return;
        } catch {
          clearAccessToken();
        }
      }

      if (!hasRefreshTokenCookieMarker()) {
        user.value = null;
        return;
      }

      await authApi.refresh();
      user.value = await authApi.me();
    } catch {
      clearAccessToken();
      clearRefreshTokenCookieMarker();
      user.value = null;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  function clearError() {
    error.value = null;
    fieldErrors.value = {};
    blockCountdown.value = 0;
    clearBlockTimer();
  }

  return {
    user,
    isLoading,
    isInitialized,
    error,
    fieldErrors,
    blockCountdown,
    isAuthenticated,
    isLoginBlocked,
    login,
    logout,
    initialize,
    clearError,
  };
});
