<template>
  <main class="placeholder-page">
    <section class="placeholder-shell">
      <p class="placeholder-eyebrow">{{ eyebrow }}</p>
      <h1 class="placeholder-title">{{ title }}</h1>
      <p class="placeholder-description">{{ description }}</p>

      <div class="placeholder-panel">
        <p class="placeholder-panel__title">다음 작업 예정</p>
        <p class="placeholder-panel__body">
          현재는 Stage 5까지 진행되어 첫 화면 미리보기만 구현되어 있습니다.
          다음 stage에서 이 화면의 실제 레이아웃과 상호작용을 이어서 구현합니다.
        </p>
      </div>

      <RouterLink class="placeholder-link" to="/preview/documents">
        문서 선택 화면으로 돌아가기
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--canvas);
}

.placeholder-shell {
  display: grid;
  gap: 1rem;
  max-width: 42rem;
  margin: 0 auto;
  padding: 1.6rem;
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-card);
  background: var(--surface-1);
  box-shadow: var(--shadow-soft);
}

.placeholder-eyebrow {
  margin: 0;
  color: var(--primary);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.placeholder-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 800;
  line-height: 1.05;
}

.placeholder-description {
  margin: 0;
  color: var(--ink-muted);
  line-height: 1.7;
}

.placeholder-panel {
  padding: 1rem 1.1rem;
  border-radius: var(--radius-panel);
  background: var(--primary-soft);
}

.placeholder-panel__title {
  margin: 0 0 0.4rem;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.placeholder-panel__body {
  margin: 0;
  color: var(--ink);
  line-height: 1.65;
}

.placeholder-link {
  display: inline-flex;
  width: fit-content;
  padding: 0.95rem 1.2rem;
  border-radius: var(--radius-control);
  background: var(--primary);
  color: #fff;
  font-weight: 800;
}
</style>
