<template>
  <main class="login-page">
    <section class="login-page__panel" aria-labelledby="login-title">
      <RouterLink class="login-page__brand" to="/schedule" aria-label="CONELP">
        <img class="login-page__logo" :src="logoSrc" alt="CONELP" />
      </RouterLink>

      <div class="login-page__heading">
        <h1 id="login-title">{{ mode === "login" ? "로그인" : "회원가입" }}</h1>
      </div>

      <p v-if="signupSuccess" class="login-page__notice">
        회원가입이 완료되었습니다. 로그인해 주세요.
      </p>

      <p v-if="authStore.isLoginBlocked" class="login-page__alert">
        로그인 시도가 너무 많습니다. {{ authStore.blockCountdown }}초 후 다시 시도해주세요.
      </p>

      <p v-else-if="authStore.error && !hasFieldErrors" class="login-page__alert">
        {{ authStore.error }}
      </p>

      <form v-if="mode === 'login'" class="login-page__form" @submit.prevent="handleLogin">
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

        <p class="login-page__switch">
          계정이 없으신가요?
          <button type="button" class="login-page__switch-button" @click="switchMode('signup')">
            회원가입
          </button>
        </p>
      </form>

      <form v-else class="login-page__form" @submit.prevent="handleSignup">
        <label class="login-page__field">
          <span>이메일</span>
          <input
            v-model.trim="email"
            autocomplete="username"
            inputmode="email"
            type="email"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.userEmail">
            {{ authStore.fieldErrors.userEmail }}
          </small>
        </label>

        <label class="login-page__field">
          <span>비밀번호</span>
          <input
            v-model="password"
            autocomplete="new-password"
            type="password"
            placeholder="8자 이상"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.userPassword">
            {{ authStore.fieldErrors.userPassword }}
          </small>
        </label>

        <label class="login-page__field">
          <span>비밀번호 확인</span>
          <input
            v-model="passwordConfirm"
            autocomplete="new-password"
            type="password"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.userPasswordConfirm">
            {{ authStore.fieldErrors.userPasswordConfirm }}
          </small>
          <small v-if="authStore.fieldErrors.passwordMatching">
            {{ authStore.fieldErrors.passwordMatching }}
          </small>
        </label>

        <label class="login-page__field">
          <span>이름</span>
          <input
            v-model.trim="userName"
            autocomplete="name"
            type="text"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.userName">
            {{ authStore.fieldErrors.userName }}
          </small>
        </label>

        <label class="login-page__field">
          <span>전화번호 <em class="login-page__hint">(- 없이 입력)</em></span>
          <input
            v-model.trim="phoneNumber"
            autocomplete="tel"
            inputmode="numeric"
            type="tel"
            placeholder="01012345678"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.phoneNumber">
            {{ authStore.fieldErrors.phoneNumber }}
          </small>
        </label>

        <label class="login-page__field">
          <span>직책 <em class="login-page__hint">(선택)</em></span>
          <input
            v-model.trim="jobTitle"
            type="text"
            placeholder="예: 현장소장, 공무팀장"
            :disabled="authStore.isLoading"
          />
          <small v-if="authStore.fieldErrors.jobTitle">
            {{ authStore.fieldErrors.jobTitle }}
          </small>
        </label>

        <button
          class="login-page__submit"
          type="submit"
          :disabled="authStore.isLoading"
        >
          {{ authStore.isLoading ? "가입 중" : "회원가입" }}
        </button>

        <p class="login-page__switch">
          이미 계정이 있으신가요?
          <button type="button" class="login-page__switch-button" @click="switchMode('login')">
            로그인
          </button>
        </p>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import "@/features/auth/ui/login-page.css";

type Mode = "login" | "signup";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const mode = ref<Mode>("login");
const signupSuccess = ref(false);

const email = ref("");
const password = ref("");
const passwordConfirm = ref("");
const userName = ref("");
const phoneNumber = ref("");
const jobTitle = ref("");

const hasFieldErrors = computed(() => Object.keys(authStore.fieldErrors).length > 0);
const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;

onMounted(() => {
  authStore.clearError();
});

function switchMode(next: Mode) {
  if (mode.value === next) return;
  mode.value = next;
  signupSuccess.value = false;
  authStore.clearError();
  passwordConfirm.value = "";
  userName.value = "";
  phoneNumber.value = "";
  jobTitle.value = "";
}

async function handleLogin() {
  signupSuccess.value = false;
  try {
    await authStore.login(email.value, password.value);
    await router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/schedule");
  } catch {
    // The store owns the visible error state.
  }
}

async function handleSignup() {
  try {
    await authStore.signup({
      email: email.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      userName: userName.value,
      phoneNumber: phoneNumber.value,
      jobTitle: jobTitle.value || undefined,
    });
    signupSuccess.value = true;
    mode.value = "login";
    password.value = "";
    passwordConfirm.value = "";
    userName.value = "";
    phoneNumber.value = "";
    jobTitle.value = "";
  } catch {
    // The store owns the visible error state.
  }
}
</script>
