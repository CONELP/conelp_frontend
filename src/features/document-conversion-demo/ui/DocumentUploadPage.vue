<template>
  <div
    v-if="requiresUpload"
    class="upload-frame"
  >
    <DesktopAppHeader class="upload-page__desktop-header" />

    <main
      class="upload-page"
      :class="{
        'upload-page--single-card': requiresUpload,
      }"
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

      <section
        v-if="uploadErrorMessage"
        class="upload-shell upload-error-card"
        role="alert"
      >
        <span
          v-for="line in uploadErrorMessageLines"
          :key="line"
          class="upload-error-card__line"
        >
          {{ line }}
        </span>
      </section>

      <section class="upload-shell upload-intro">
        <h1 class="upload-intro__title">
          <template v-if="isMaterialInspectionRequest">
            <span class="upload-intro__title-line">반입 자재 등록 자료를</span>
            <span class="upload-intro__title-line">업로드 해주세요.</span>
          </template>
          <template v-else-if="isConcreteDeliveryTest">
            <span class="upload-intro__title-line">콘크리트 반입시험 자료를</span>
            <span class="upload-intro__title-line">업로드 해주세요.</span>
          </template>
          <template v-else>
            <span class="upload-intro__title-line">{{ selectedDocument.label }}</span>
            <span class="upload-intro__title-line">자료를 업로드 해주세요.</span>
          </template>
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

        <section
          v-if="requiresWorkContext"
          class="upload-form"
          :aria-label="`${selectedDocument.label} 기본 정보`"
        >
          <label class="upload-field">
            <span class="upload-field__label">공종명</span>
            <span class="upload-field__control">
              <input
                :value="mirUploadWorkTypeName"
                class="upload-field__input"
                type="text"
                autocomplete="off"
                placeholder="철근콘크리트공사"
                role="combobox"
                :aria-expanded="isWorkTypeSuggestionListOpen"
                aria-autocomplete="list"
                @input="handleWorkTypeNameInput"
                @focus="openWorkTypeSuggestionList"
                @blur="scheduleCloseWorkTypeSuggestionList"
                @keydown="handleWorkTypeKeydown"
              />

              <Transition name="upload-typeahead">
                <div
                  v-if="isWorkTypeSuggestionListOpen"
                  class="upload-typeahead"
                  role="listbox"
                  aria-label="공종명 후보"
                  @mousedown.prevent
                >
                  <p
                    v-if="isWorkTypeSuggestionsLoading"
                    class="upload-typeahead__state"
                  >
                    불러오는 중
                  </p>

                  <p
                    v-else-if="workTypeSuggestionsErrorMessage"
                    class="upload-typeahead__state"
                  >
                    {{ workTypeSuggestionsErrorMessage }}
                  </p>

                  <template v-else-if="workTypeSuggestions.length > 0">
                    <button
                      v-for="(suggestion, suggestionIndex) in workTypeSuggestions"
                      :key="suggestion.id"
                      class="upload-typeahead__option"
                      :class="{
                        'upload-typeahead__option--highlighted':
                          workTypeHighlightedIndex === suggestionIndex,
                      }"
                      type="button"
                      role="option"
                      :aria-selected="workTypeHighlightedIndex === suggestionIndex"
                      @mouseenter="setWorkTypeHighlightedIndex(suggestionIndex)"
                      @click="selectWorkTypeSuggestion(suggestion)"
                    >
                      {{ suggestion.name }}
                    </button>
                  </template>

                  <p
                    v-else-if="mirUploadWorkTypeName.trim() && mirUploadWorkTypeId === null"
                    class="upload-typeahead__state"
                  >
                    매칭되는 공종명이 없어요
                  </p>
                </div>
              </Transition>
            </span>
          </label>

          <label class="upload-field">
            <span class="upload-field__label">사용 위치</span>
            <input
              v-model="mirUploadApplication"
              class="upload-field__input"
              type="text"
              autocomplete="off"
              placeholder="B동 북측 야적장"
            />
          </label>
        </section>

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
                  'upload-dropzone__status--static': requiresUpload,
                }"
                aria-hidden="true"
              >
                <span class="upload-dropzone__status-bullet" />
              </span>
              <span>{{ guideItem.label }}</span>
            </p>
          </div>

          <div
            v-if="uploadedFiles.length > 0"
            class="upload-dropzone__selected"
          >
            <TransitionGroup
              class="upload-dropzone__selected-list"
              name="upload-image-grid"
              tag="div"
            >
              <div
                v-for="file in uploadedFiles"
                :key="file.id"
                class="upload-dropzone__selected-item"
              >
                <button
                  class="upload-dropzone__preview-button"
                  type="button"
                  :aria-label="`${file.name} 크게 보기`"
                  @click="handleOpenImagePreview(file)"
                >
                  <img
                    v-if="file.thumbnail"
                    class="upload-dropzone__selected-thumbnail"
                    :src="file.thumbnail"
                    :alt="file.name"
                  />
                </button>

                <button
                  class="upload-dropzone__selected-remove"
                  type="button"
                  :aria-label="`${file.name} 삭제`"
                  @click="handleRemoveUploadedFile(file.id)"
                >
                  <img
                    class="upload-dropzone__selected-remove-icon"
                    :src="dismissIcon"
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              </div>
            </TransitionGroup>
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
          {{
            requiresWorkContext
              ? "분석하기"
              : uploadPageCopy.actionLabel
          }}
        </button>
      </footer>
    </main>

    <Transition name="upload-preview-modal">
      <div
        v-if="selectedPreviewFile"
        class="upload-preview-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${selectedPreviewFile.name} 원본 이미지 보기`"
        @click.self="handleCloseImagePreview"
      >
        <button
          class="upload-preview-modal__close"
          type="button"
          aria-label="원본 이미지 닫기"
          @click="handleCloseImagePreview"
        >
          <img
            class="upload-preview-modal__close-icon"
            :src="dismissIcon"
            alt=""
            aria-hidden="true"
          />
        </button>

        <img
          class="upload-preview-modal__image"
          :src="selectedPreviewFile.thumbnail"
          :alt="selectedPreviewFile.name"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";
import uploadIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import type { UploadSampleFile } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadPageCopy,
  selectedDocument,
  hasSelectedDocument,
  isMaterialInspectionRequest,
  isConcreteDeliveryTest,
  requiresWorkContext,
  mirUploadApplication,
  mirUploadWorkTypeName,
  mirUploadWorkTypeId,
  workTypeSuggestions,
  isWorkTypeSuggestionsLoading,
  workTypeSuggestionsErrorMessage,
  isWorkTypeSuggestionListOpen,
  workTypeHighlightedIndex,
  requiresUpload,
  uploadedFiles,
  uploadGuideItems,
  canReview,
  uploadErrorMessage,
  backToSelectionRoute,
  addUploadedImageFiles,
  removeUploadedImageFile,
  selectUploadDocument,
  updateMirUploadWorkTypeName,
  openWorkTypeSuggestionList,
  scheduleCloseWorkTypeSuggestionList,
  selectWorkTypeSuggestion,
  setWorkTypeHighlightedIndex,
  handleWorkTypeKeydown,
} = useDocumentUploadDemoViewModel();
const router = useRouter();
const route = useRoute();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedPreviewFile = ref<UploadSampleFile | null>(null);
const uploadErrorMessageLines = computed(() =>
  (uploadErrorMessage.value.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [])
    .map((line) => line.trim())
    .filter(Boolean),
);

watchEffect(() => {
  const routeDocumentType = route.query.documentType;

  if (typeof routeDocumentType === "string") {
    selectUploadDocument(routeDocumentType);
  }
});

watchEffect(() => {
  if (!hasSelectedDocument.value) {
    void router.replace(backToSelectionRoute);
    return;
  }

  if (!requiresUpload.value) {
    void router.replace("/preview/loading");
  }
});

function openFilePicker() {
  fileInput.value?.click();
}

function handleWorkTypeNameInput(event: Event) {
  const input = event.target as HTMLInputElement | null;

  updateMirUploadWorkTypeName(input?.value ?? "");
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

function handleRemoveUploadedFile(fileId: string) {
  removeUploadedImageFile(fileId);

  if (selectedPreviewFile.value?.id === fileId) {
    selectedPreviewFile.value = null;
  }
}

function handleOpenImagePreview(file: UploadSampleFile) {
  selectedPreviewFile.value = file;
}

function handleCloseImagePreview() {
  selectedPreviewFile.value = null;
}

function handleGenerate() {
  if (!canReview.value) {
    return;
  }

  void router.push("/preview/loading");
}
</script>

<style scoped src="./styles/DocumentUploadPage.css"></style>
