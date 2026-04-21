<template>
  <main class="feedback-page">
    <section class="feedback-shell feedback-topbar">
      <RouterLink
        class="feedback-back"
        to="/preview/upload"
        aria-label="업로드 화면으로 돌아가기"
      >
        <img class="feedback-back__icon" :src="backIcon" alt="" aria-hidden="true" />
      </RouterLink>
    </section>

    <section class="feedback-shell feedback-intro">
      <h1 class="feedback-intro__title">{{ uploadFeedbackPageCopy.title }}</h1>
    </section>

    <section class="feedback-shell feedback-stack">
      <article class="feedback-summary">
        <span class="feedback-summary__icon-frame" aria-hidden="true">
          <img class="feedback-summary__icon" :src="selectedDocument.iconSrc" alt="" />
        </span>

        <div class="feedback-summary__body">
          <p class="feedback-summary__title">{{ selectedDocument.label }}</p>
          <p class="feedback-summary__helper">{{ uploadFeedbackPageCopy.summaryLabel }}</p>
          <p class="feedback-summary__counts">
            확인 {{ matchedCount }}건 · 추가 필요 {{ missingCount }}건
          </p>
        </div>
      </article>

      <section class="feedback-list">
        <article
          v-for="item in feedbackItems"
          :key="item.id"
          class="feedback-row"
        >
          <p class="feedback-row__label">{{ item.label }}</p>
          <span
            class="feedback-row__status"
            :class="{
              'feedback-row__status--matched': item.status === 'matched',
              'feedback-row__status--missing': item.status === 'missing',
            }"
          >
            {{ item.status === "matched" ? "[체크]" : "[X]" }}
          </span>
        </article>
      </section>
    </section>

    <footer class="feedback-shell feedback-footer">
      <RouterLink class="feedback-footer__primary" :to="primaryFeedbackRoute">
        {{ primaryFeedbackActionLabel }}
      </RouterLink>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";

import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadFeedbackPageCopy,
  selectedDocument,
  feedbackItems,
  matchedCount,
  missingCount,
  primaryFeedbackActionLabel,
  primaryFeedbackRoute,
} = useDocumentUploadDemoViewModel();
</script>

<style scoped src="./styles/UploadFeedbackPage.css"></style>
