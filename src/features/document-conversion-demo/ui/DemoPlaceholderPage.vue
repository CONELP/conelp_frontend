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

<style scoped src="./styles/DemoPlaceholderPage.css"></style>
