<script setup lang="ts">
import { useRouter } from "vue-router";

import { LOGO_SRC } from "@/features/landing/data/landing.content";

const router = useRouter();

function goLogin() {
  router.push({ name: "login" });
}
</script>

<template>
  <header class="landing-header">
    <div class="landing-header__inner">
      <img class="landing-header__logo" :src="LOGO_SRC" alt="CONELP" />
      <button type="button" class="landing-header__login" @click="goLogin">로그인</button>
    </div>
  </header>
</template>

<style scoped>
.landing-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid var(--outline-soft);
}

.landing-header__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.landing-header__logo {
  height: 26px;
  width: auto;
}

.landing-header__login {
  padding: 0.55rem 1.4rem;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.18s ease;
}

.landing-header__login:hover {
  background: var(--primary-hover);
}

@media (min-width: 768px) {
  .landing-header__inner {
    padding: 0.9rem 2rem;
  }
  .landing-header__logo {
    height: 30px;
  }
}
</style>
