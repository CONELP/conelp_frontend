<template>
  <main class="upload-page">
    <section class="upload-shell upload-topbar">
      <RouterLink
        class="upload-back"
        :to="backToSelectionRoute"
        aria-label="문서 선택으로 돌아가기"
      >
        <img class="upload-back__icon" :src="backIcon" alt="" aria-hidden="true" />
      </RouterLink>
    </section>

    <section class="upload-shell upload-intro">
      <h1 class="upload-intro__title">
        <span class="upload-intro__title-line">{{ selectedDocument.label }}</span>
        <span class="upload-intro__title-line">자료를 업로드 해주세요.</span>
      </h1>
    </section>

    <section class="upload-shell upload-stack">
      <button
        class="upload-dropzone"
        type="button"
        @click="loadSampleUpload"
      >
        <span class="upload-dropzone__icon-frame" aria-hidden="true">
          <img class="upload-dropzone__icon" :src="uploadIcon" alt="" />
        </span>

        <div class="upload-dropzone__guide-list">
          <p
            v-for="guideItem in selectedPreset.guideItems"
            :key="guideItem"
            class="upload-dropzone__guide-item"
          >
            <span class="upload-dropzone__checkbox" aria-hidden="true" />
            <span>{{ guideItem }}</span>
          </p>
        </div>
      </button>
    </section>

    <footer class="upload-shell upload-footer">
      <RouterLink
        class="upload-footer__primary"
        :class="{ 'upload-footer__primary--disabled': !canReview }"
        :to="canReview ? uploadFeedbackRoute : '/preview/upload'"
      >
        {{ uploadPageCopy.actionLabel }}
      </RouterLink>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import uploadIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";

import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadPageCopy,
  selectedDocument,
  selectedPreset,
  canReview,
  uploadFeedbackRoute,
  backToSelectionRoute,
  loadSampleUpload,
} = useDocumentUploadDemoViewModel();
</script>

<style scoped>
.upload-page {
  --page-inline: 1.2rem;
  --surface-radius: 0.95rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding: 0 var(--page-inline) 1rem;
  background: var(--surface-1);
}

.upload-shell {
  width: min(100%, 42rem);
  margin: 0 auto;
}

.upload-topbar {
  display: flex;
  align-items: flex-end;
  min-height: 4.15rem;
  margin-left: calc(var(--page-inline) * -0.84);
  padding-bottom: 0.35rem;
}

.upload-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--ink);
}

.upload-back__icon {
  width: 1.5rem;
  height: 1.5rem;
  opacity: 0.84;
}

.upload-intro {
  padding: 3rem 0 1.45rem;
}

.upload-intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.52rem, 5vw, 2.05rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.upload-intro__title-line {
  display: block;
}

.upload-intro__title-line + .upload-intro__title-line {
  margin-top: 0.92rem;
}

.upload-stack {
  display: grid;
  flex: 1;
  place-items: center;
  padding-bottom: 2.55rem;
}

.upload-dropzone {
  display: grid;
  justify-items: center;
  gap: 1.55rem;
  width: min(100%, 29rem);
  padding: 1.3rem 1rem 1.35rem;
  border: 1px dashed rgba(0, 0, 0, 0.16);
  border-radius: var(--surface-radius);
  background: #f7f7f8;
  color: var(--ink);
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.upload-dropzone:hover {
  border-color: rgba(30, 24, 136, 0.28);
}

.upload-dropzone__icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4.15rem;
  height: 4.15rem;
  border: 1px solid var(--outline-soft);
  border-radius: 999px;
  background: #fff;
}

.upload-dropzone__icon {
  width: 1.96rem;
  height: 1.96rem;
  object-fit: contain;
  opacity: 0.56;
}

.upload-dropzone__guide-list {
  display: grid;
  gap: 0.48rem;
  width: fit-content;
  max-width: 100%;
}

.upload-dropzone__guide-item {
  display: flex;
  gap: 0.42rem;
  align-items: flex-start;
  margin: 0;
  color: var(--ink-faint);
  font-size: 0.89rem;
  line-height: 1.45;
  font-weight: 400;
}

.upload-dropzone__checkbox {
  flex: 0 0 auto;
  width: 0.78rem;
  height: 0.78rem;
  margin-top: 0.22rem;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: 0.1rem;
}

.upload-footer {
  display: inline-flex;
  padding-top: 1rem;
}

.upload-footer__primary {
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

.upload-footer__primary--disabled {
  pointer-events: none;
  background: rgba(30, 24, 136, 0.35);
}

@media (min-width: 768px) {
  .upload-page {
    --page-inline: 1.6rem;
    padding: 0 var(--page-inline) 1.4rem;
  }

  .upload-shell {
    width: min(100%, 52rem);
  }

  .upload-topbar {
    min-height: 4.45rem;
    margin-left: calc(var(--page-inline) * -1);
    padding-bottom: 0.42rem;
  }

  .upload-back {
    width: 2.15rem;
    height: 2.15rem;
  }

  .upload-back__icon {
    width: 1.6rem;
    height: 1.6rem;
  }

  .upload-intro {
    padding-top: 3.6rem;
    padding-bottom: 1.7rem;
  }

  .upload-intro__title-line + .upload-intro__title-line {
    margin-top: 1.08rem;
  }

  .upload-dropzone {
    gap: 1.7rem;
    width: min(100%, 31rem);
    padding: 1.45rem 1.15rem 1.45rem;
  }

  .upload-stack {
    padding-bottom: 3rem;
  }

  .upload-dropzone__icon-frame {
    width: 4.45rem;
    height: 4.45rem;
  }

  .upload-dropzone__icon {
    width: 2.08rem;
    height: 2.08rem;
  }

  .upload-dropzone__guide-item {
    font-size: 0.92rem;
  }
}
</style>
