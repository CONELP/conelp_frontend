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
      <input
        ref="fileInput"
        class="upload-input"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileSelection"
      />

      <div class="upload-dropzone">
        <button
          class="upload-dropzone__trigger"
          type="button"
          aria-label="사진 업로드"
          @click="openFilePicker"
        >
          <img class="upload-dropzone__icon" :src="uploadIcon" alt="" />
        </button>

        <div class="upload-dropzone__guide-list">
          <p
            v-for="guideItem in uploadGuideItems"
            :key="guideItem.label"
            class="upload-dropzone__guide-item"
          >
            <span
              class="upload-dropzone__status"
              :class="{
                'upload-dropzone__status--inspecting':
                  guideItem.status === 'inspecting',
                'upload-dropzone__status--error':
                  guideItem.status === 'error',
              }"
              aria-hidden="true"
            >
              <span
                v-if="guideItem.status === 'inspecting'"
                class="upload-dropzone__status-spinner"
              />

              <img
                v-else-if="guideItem.status === 'matched'"
                class="upload-dropzone__selected-indicator-icon"
                :src="checkIcon"
                alt=""
              />

              <img
                v-else-if="guideItem.status === 'error'"
                class="upload-dropzone__status-icon upload-dropzone__status-icon--error"
                :src="dismissIcon"
                alt=""
              />

              <span
                v-else
                class="upload-dropzone__status-bullet"
              />

            </span>
            <span>{{ guideItem.label }}</span>
          </p>
        </div>

        <div
          v-if="uploadedFiles.length > 0"
          class="upload-dropzone__selected"
        >
          <div class="upload-dropzone__selected-header">
            <p class="upload-dropzone__selected-title">
              업로드된 사진
            </p>

            <button
              class="upload-dropzone__selected-clear"
              type="button"
              aria-label="업로드된 사진 비우기"
              @click="handleClearUploadedFiles"
            >
              비우기
            </button>
          </div>

          <div class="upload-dropzone__selected-list">
            <div
              v-for="file in uploadedFiles"
              :key="file.id"
              class="upload-dropzone__selected-item"
            >
              <img
                class="upload-dropzone__selected-indicator-icon"
                :src="checkIcon"
                alt=""
                aria-hidden="true"
              />

              <span class="upload-dropzone__selected-name">
                {{ file.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
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
import { ref, watchEffect } from "vue";
import { RouterLink } from "vue-router";
import { useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import checkIcon from "@fluentui/svg-icons/icons/checkmark_16_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";
import uploadIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";

import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadPageCopy,
  selectedDocument,
  requiresUpload,
  uploadedFiles,
  uploadGuideItems,
  canReview,
  uploadFeedbackRoute,
  backToSelectionRoute,
  addUploadedImageFiles,
  clearUpload,
} = useDocumentUploadDemoViewModel();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

watchEffect(() => {
  if (!requiresUpload.value) {
    void router.replace("/preview/loading");
  }
});

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileSelection(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

  if (files.length > 0) {
    addUploadedImageFiles(files);
  }

  if (input) {
    input.value = "";
  }
}

function handleClearUploadedFiles() {
  clearUpload();
}

function handleGenerate() {
  if (!canReview.value) {
    return;
  }

  void router.push(uploadFeedbackRoute);
}
</script>

<style scoped src="./styles/DocumentUploadPage.css"></style>
