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

<style scoped>
.feedback-page {
  --page-inline: 1.2rem;
  --surface-radius: 0.95rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding: 0 var(--page-inline) 1rem;
  background: var(--surface-1);
}

.feedback-shell {
  width: min(100%, 42rem);
  margin: 0 auto;
}

.feedback-topbar {
  display: flex;
  align-items: flex-end;
  min-height: 4.15rem;
  margin-left: calc(var(--page-inline) * -0.84);
  padding-bottom: 0.35rem;
}

.feedback-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--ink);
}

.feedback-back__icon {
  width: 1.5rem;
  height: 1.5rem;
  opacity: 0.84;
}

.feedback-intro {
  padding: 3rem 0 1rem;
}

.feedback-intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.52rem, 5vw, 2.05rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.feedback-stack,
.feedback-list {
  display: grid;
  gap: 0.78rem;
}

.feedback-summary {
  display: flex;
  gap: 0.78rem;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid var(--outline-soft);
  border-radius: var(--surface-radius);
  background: var(--surface-1);
}

.feedback-summary__icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid var(--outline-soft);
  border-radius: 999px;
}

.feedback-summary__icon {
  width: 1.18rem;
  height: 1.18rem;
  object-fit: contain;
  opacity: 0.55;
}

.feedback-summary__title {
  margin: 0;
  font-size: 1.04rem;
  font-weight: 800;
}

.feedback-summary__helper,
.feedback-summary__counts {
  margin: 0.24rem 0 0;
  color: var(--ink-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.feedback-summary__counts {
  color: var(--ink);
  font-weight: 700;
}

.feedback-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  min-height: 3.5rem;
  padding: 0.82rem 0.9rem;
  border: 1px solid var(--outline-soft);
  border-radius: var(--surface-radius);
  background: var(--surface-1);
}

.feedback-row__label {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
}

.feedback-row__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.2rem;
  height: 1.9rem;
  padding: 0 0.52rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}

.feedback-row__status--matched {
  border: 1px solid rgba(28, 125, 72, 0.24);
  background: rgba(28, 125, 72, 0.08);
  color: #1c7d48;
}

.feedback-row__status--missing {
  border: 1px solid rgba(192, 49, 49, 0.22);
  background: rgba(192, 49, 49, 0.08);
  color: #c03131;
}

.feedback-footer {
  display: inline-flex;
  margin-top: auto;
  padding-top: 1rem;
}

.feedback-footer__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.45rem;
  padding: 0.98rem 1.15rem;
  border-radius: var(--surface-radius);
  background: var(--primary);
  color: #fff;
  font-weight: 800;
}

@media (min-width: 768px) {
  .feedback-page {
    --page-inline: 1.6rem;
    padding: 0 var(--page-inline) 1.4rem;
  }

  .feedback-shell {
    width: min(100%, 52rem);
  }

  .feedback-topbar {
    min-height: 4.45rem;
    margin-left: calc(var(--page-inline) * -1);
    padding-bottom: 0.42rem;
  }

  .feedback-back {
    width: 2.15rem;
    height: 2.15rem;
  }

  .feedback-back__icon {
    width: 1.6rem;
    height: 1.6rem;
  }

  .feedback-intro {
    padding-top: 3.6rem;
    padding-bottom: 1.1rem;
  }

  .feedback-stack,
  .feedback-list {
    gap: 0.92rem;
  }
}
</style>
