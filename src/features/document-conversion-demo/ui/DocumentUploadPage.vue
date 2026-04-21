<template>
  <main
    v-if="requiresUpload"
    class="upload-page"
  >
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
      <button
        class="upload-footer__primary"
        :class="{ 'upload-footer__primary--disabled': !canReview }"
        type="button"
        :disabled="!canReview"
        @click="handleGenerate"
      >
        {{ uploadPageCopy.actionLabel }}
      </button>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { RouterLink } from "vue-router";
import { useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import uploadIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";

import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadPageCopy,
  selectedDocument,
  selectedPreset,
  requiresUpload,
  canReview,
  uploadFeedbackRoute,
  backToSelectionRoute,
  loadSampleUpload,
} = useDocumentUploadDemoViewModel();
const router = useRouter();

watchEffect(() => {
  if (!requiresUpload.value) {
    void router.replace("/preview/loading");
  }
});

function handleGenerate() {
  if (!canReview.value) {
    return;
  }

  void router.push(uploadFeedbackRoute);
}
</script>

<style scoped src="./styles/DocumentUploadPage.css"></style>
