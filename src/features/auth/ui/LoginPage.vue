<template>
  <main class="login-page">
    <section class="login-page__panel" aria-labelledby="login-title">
      <RouterLink class="login-page__brand" to="/dashboard" aria-label="CONELP">
        <img class="login-page__logo" :src="logoSrc" alt="CONELP" />
      </RouterLink>

      <div class="login-page__heading">
        <h1 id="login-title">로그인</h1>
        <p>backend API 호출을 위해 계정으로 로그인하세요.</p>
      </div>

      <p v-if="authStore.isLoginBlocked" class="login-page__alert">
        로그인 시도가 너무 많습니다. {{ authStore.blockCountdown }}초 후 다시 시도해주세요.
      </p>

      <p v-else-if="authStore.error && !hasFieldErrors" class="login-page__alert">
        {{ authStore.error }}
      </p>

      <form class="login-page__form" @submit.prevent="handleLogin">
        <label class="login-page__field">
          <span>이메일</span>
          <input
            v-model.trim="email"
            autocomplete="username"
            inputmode="email"
            type="email"
            :disabled="authStore.isLoading || authStore.isLoginBlocked"
          />
          <small v-if="authStore.fieldErrors.userEmail">
            {{ authStore.fieldErrors.userEmail }}
          </small>
        </label>

        <label class="login-page__field">
          <span>비밀번호</span>
          <input
            v-model="password"
            autocomplete="current-password"
            type="password"
            :disabled="authStore.isLoading || authStore.isLoginBlocked"
          />
          <small v-if="authStore.fieldErrors.userPassword">
            {{ authStore.fieldErrors.userPassword }}
          </small>
        </label>

        <button
          class="login-page__submit"
          type="submit"
          :disabled="authStore.isLoading || authStore.isLoginBlocked"
        >
          {{ authStore.isLoading ? "로그인 중" : "로그인" }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import "@/features/auth/ui/login-page.css";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const hasFieldErrors = computed(() => Object.keys(authStore.fieldErrors).length > 0);
const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;

onMounted(() => {
  authStore.clearError();
});

async function handleLogin() {
  try {
    await authStore.login(email.value, password.value);
    await router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/dashboard");
  } catch {
    // The store owns the visible error state.
  }
}
</script>
