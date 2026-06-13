<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goLogin() {
  router.push({ name: "login" });
}
</script>

<template>
  <div class="landing-login-bar">
    <div class="landing-login-bar__inner">
      <button type="button" class="landing-login" @click="goLogin">로그인</button>
    </div>
  </div>
</template>

<style scoped>
.landing-login-bar {
  position: sticky;
  top: 0;
  z-index: 20;
}

.landing-login-bar__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0.75rem 1.25rem;
  display: flex;
  justify-content: flex-end;
}

.landing-login {
  padding: 0.55rem 1.4rem;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.18s ease;
}

.landing-login:hover {
  background: var(--primary-hover);
}

@media (min-width: 768px) {
  .landing-login-bar__inner {
    padding: 0.9rem 2rem;
  }
}
</style>
