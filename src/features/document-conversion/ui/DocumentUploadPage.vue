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
          <template v-else-if="isConcreteStrengthTest">
            <span class="upload-intro__title-line">콘크리트 압축강도 자료를</span>
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
          v-if="isConcreteStrengthTest"
          class="upload-strength-documents"
          aria-label="생성된 콘크리트 반입시험 문서"
        >
          <div class="upload-strength-documents__header">
            <p class="upload-strength-documents__title">
              생성된 콘크리트 반입시험 문서
            </p>
          </div>

          <div
            v-if="linkedConcreteDeliveryDocumentOptions.length > 0"
            class="upload-strength-documents__select"
            :class="{
              'upload-strength-documents__select--open':
                isLinkedConcreteDeliveryDropdownOpen,
            }"
          >
            <button
              class="upload-strength-documents__selected"
              type="button"
              aria-haspopup="listbox"
              :aria-expanded="isLinkedConcreteDeliveryDropdownOpen"
              @click="toggleLinkedConcreteDeliveryDropdown"
            >
              <span
                class="upload-strength-documents__item-icon-frame"
                aria-hidden="true"
              >
                <img
                  class="upload-strength-documents__item-icon"
                  :src="documentIcon"
                  alt=""
                />
              </span>
              <span class="upload-strength-documents__item-copy">
                <span class="upload-strength-documents__item-title">
                  {{ selectedLinkedConcreteDeliveryDocument?.title }}
                </span>
                <span class="upload-strength-documents__item-subtitle">
                  {{
                    selectedLinkedConcreteDeliveryDocument?.subtitle ||
                    "생성 시간 없음"
                  }}
                </span>
              </span>
              <img
                class="upload-strength-documents__chevron"
                :src="chevronDownIcon"
                alt=""
                aria-hidden="true"
              />
            </button>

            <Transition name="upload-strength-documents-menu">
              <div
                v-if="isLinkedConcreteDeliveryDropdownOpen"
                class="upload-strength-documents__list"
                role="listbox"
                aria-label="생성된 콘크리트 반입시험 문서 목록"
              >
                <button
                  v-for="document in linkedConcreteDeliveryDocumentOptions"
                  :key="document.id"
                  class="upload-strength-documents__item"
                  :class="{
                    'upload-strength-documents__item--selected': document.isSelected,
                  }"
                  type="button"
                  role="option"
                  :aria-selected="document.isSelected"
                  @click="handleLinkedConcreteDeliveryDocumentSelection(document.id)"
                >
                  <span
                    class="upload-strength-documents__item-icon-frame"
                    aria-hidden="true"
                  >
                    <img
                      class="upload-strength-documents__item-icon"
                      :src="documentIcon"
                      alt=""
                    />
                  </span>
                  <span class="upload-strength-documents__item-copy">
                    <span class="upload-strength-documents__item-title">
                      {{ document.title }}
                    </span>
                    <span class="upload-strength-documents__item-subtitle">
                      {{ document.subtitle || "생성 시간 없음" }}
                    </span>
                  </span>
                </button>
              </div>
            </Transition>
          </div>

          <p v-else class="upload-strength-documents__state">
            생성된 콘크리트 반입시험 문서가 없어요.
          </p>
        </section>

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
                :placeholder="workContextHint.workTypeName"
                role="combobox"
                :aria-expanded="isWorkTypeSuggestionListOpen"
                aria-autocomplete="list"
                :aria-activedescendant="
                  highlightedWorkTypeSuggestionIndex >= 0 &&
                  workTypeSuggestions[highlightedWorkTypeSuggestionIndex]
                    ? `upload-work-type-option-${workTypeSuggestions[highlightedWorkTypeSuggestionIndex]?.id}`
                    : undefined
                "
                @input="handleWorkTypeNameInput"
                @keydown.down.prevent="moveHighlightedWorkTypeSuggestion(1)"
                @keydown.up.prevent="moveHighlightedWorkTypeSuggestion(-1)"
                @keydown.enter="handleWorkTypeSuggestionEnter"
                @keydown.esc.prevent="closeWorkTypeSuggestionList"
                @focus="openWorkTypeSuggestionList"
                @blur="scheduleCloseWorkTypeSuggestionList"
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
                      :id="`upload-work-type-option-${suggestion.id}`"
                      class="upload-typeahead__option"
                      :class="{
                        'upload-typeahead__option--highlighted':
                          highlightedWorkTypeSuggestionIndex === suggestionIndex,
                      }"
                      type="button"
                      role="option"
                      :aria-selected="
                        highlightedWorkTypeSuggestionIndex === suggestionIndex
                      "
                      @mouseenter="
                        setHighlightedWorkTypeSuggestionIndex(suggestionIndex)
                      "
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
              :placeholder="workContextHint.application"
            />
          </label>
        </section>

        <div
          v-if="isGroupedUpload"
          class="upload-batches"
        >
          <div
            v-for="(batch, batchIndex) in concreteUploadBatches"
            :key="batch.id"
            class="upload-dropzone upload-dropzone--batch"
            :class="{
              'upload-dropzone--drag-active': isConcreteBatchDragActive(batch.id),
            }"
            @dragenter.prevent="handleConcreteBatchDragEnter($event, batch.id)"
            @dragover.prevent="handleConcreteBatchDragOver($event, batch.id)"
            @dragleave="handleConcreteBatchDragLeave($event, batch.id)"
            @drop.prevent="handleConcreteBatchDrop($event, batch.id)"
          >
            <Transition name="upload-dropzone-overlay">
              <div
                v-if="isConcreteBatchDragActive(batch.id)"
                class="upload-dropzone__drop-overlay"
                aria-hidden="true"
              >
                <span class="upload-dropzone__drop-label">
                  이미지를 여기에 놓아주세요
                </span>
              </div>
            </Transition>

            <button
              v-if="isConcreteDeliveryTest"
              class="upload-dropzone__trigger"
              type="button"
              :aria-label="`${batchIndex + 1}${uploadBatchTitleUnitLabel} 사진 업로드`"
              @click="openFilePicker(batch.id)"
            >
              <img class="upload-dropzone__icon" :src="uploadIcon" alt="" />
            </button>

            <div class="upload-dropzone__batch-header">
              <p class="upload-dropzone__batch-title">
                [{{ batchIndex + 1 }}{{ uploadBatchTitleUnitLabel }}]
              </p>
              <button
                v-if="concreteUploadBatches.length > 1"
                class="upload-dropzone__batch-remove"
                type="button"
                :aria-label="`${batchIndex + 1}${uploadBatchTitleUnitLabel} 삭제`"
                @click="removeConcreteUploadBatch(batch.id)"
              >
                <img
                  class="upload-dropzone__batch-remove-icon"
                  :src="deleteIcon"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </div>

            <div
              v-if="!isConcreteStrengthTest"
              class="upload-dropzone__guide-list"
              :class="{
                'upload-dropzone__guide-list--two-column': isConcreteDeliveryTest,
              }"
            >
              <p
                v-for="guideItem in uploadGuideItems"
                :key="`${batch.id}-${guideItem.label}`"
                class="upload-dropzone__guide-item"
              >
                <span
                  class="upload-dropzone__status upload-dropzone__status--static"
                  aria-hidden="true"
                >
                  <span class="upload-dropzone__status-bullet" />
                </span>
                <span>{{ guideItem.label }}</span>
              </p>
            </div>

            <div
              v-if="isConcreteDeliveryTest && getConcreteBatchUploadedFiles(batch.id).length > 0"
              class="upload-dropzone__selected"
            >
              <TransitionGroup
                class="upload-dropzone__selected-list"
                name="upload-image-grid"
                tag="div"
              >
                <div
                  v-for="file in getConcreteBatchUploadedFiles(batch.id)"
                  :key="file.id"
                  class="upload-dropzone__selected-item"
                  :class="{
                    'upload-dropzone__selected-item--removing':
                      isUploadedFileRemoving(file.id),
                    'upload-dropzone__selected-item--dragging':
                      draggedUploadFileId === file.id,
                    'upload-dropzone__selected-item--drag-over-before':
                      dragOverUploadFileId === file.id &&
                      dragOverUploadPlacement === 'before',
                    'upload-dropzone__selected-item--drag-over-after':
                      dragOverUploadFileId === file.id &&
                      dragOverUploadPlacement === 'after',
                  }"
                  draggable="true"
                  @dragstart="handleUploadedFileDragStart($event, file.id)"
                  @dragover.prevent.stop="
                    handleConcreteBatchFileDragOver($event, batch.id, file.id)
                  "
                  @dragleave.stop="handleUploadedFileDragLeave(file.id)"
                  @drop.prevent.stop="
                    handleConcreteBatchFileDrop($event, batch.id, file.id)
                  "
                  @dragend="handleUploadedFileDragEnd"
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
                      draggable="false"
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

            <div
              v-else-if="isConcreteStrengthTest"
              class="upload-strength-sections"
            >
              <section
                v-for="section in strengthUploadSections"
                :key="`${batch.id}-${section.id}`"
                class="upload-strength-section"
                :class="{
                  'upload-strength-section--drag-active':
                    isStrengthSectionDragActive(batch.id, section.id),
                }"
                @dragenter.prevent.stop="
                  handleStrengthSectionDragEnter($event, batch.id, section.id)
                "
                @dragover.prevent.stop="
                  handleStrengthSectionDragOver($event, batch.id, section.id)
                "
                @dragleave.stop="
                  handleStrengthSectionDragLeave($event, batch.id, section.id)
                "
                @drop.prevent.stop="
                  handleStrengthSectionDrop($event, batch.id, section.id)
                "
              >
                <div class="upload-strength-section__header">
                  <p class="upload-strength-section__title">{{ section.label }}</p>
                  <button
                    class="upload-strength-section__add"
                    type="button"
                    :aria-label="`${batchIndex + 1}로트 ${section.label} 사진 업로드`"
                    @click="openFilePicker(batch.id, section.id)"
                  >
                    <img
                      class="upload-strength-section__add-icon"
                      :src="uploadIcon"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div
                  class="upload-dropzone__guide-list upload-strength-section__guide-list"
                >
                  <p class="upload-dropzone__guide-item">
                    <span
                      class="upload-dropzone__status upload-dropzone__status--static"
                      aria-hidden="true"
                    >
                      <span class="upload-dropzone__status-bullet" />
                    </span>
                    <span>공시체 강도 사진</span>
                  </p>
                </div>

                <div
                  v-if="getStrengthSectionUploadedFiles(batch.id, section.id).length > 0"
                  class="upload-dropzone__selected upload-strength-section__selected"
                >
                  <TransitionGroup
                    class="upload-dropzone__selected-list"
                    name="upload-image-grid"
                    tag="div"
                  >
                    <div
                      v-for="file in getStrengthSectionUploadedFiles(batch.id, section.id)"
                      :key="file.id"
                      class="upload-dropzone__selected-item"
                      :class="{
                        'upload-dropzone__selected-item--removing':
                          isUploadedFileRemoving(file.id),
                        'upload-dropzone__selected-item--dragging':
                          draggedUploadFileId === file.id,
                        'upload-dropzone__selected-item--drag-over-before':
                          dragOverUploadFileId === file.id &&
                          dragOverUploadPlacement === 'before',
                        'upload-dropzone__selected-item--drag-over-after':
                          dragOverUploadFileId === file.id &&
                          dragOverUploadPlacement === 'after',
                      }"
                      draggable="true"
                      @dragstart="handleUploadedFileDragStart($event, file.id)"
                      @dragover.prevent.stop="
                        handleStrengthSectionFileDragOver(
                          $event,
                          batch.id,
                          section.id,
                          file.id,
                        )
                      "
                      @dragleave.stop="handleUploadedFileDragLeave(file.id)"
                      @drop.prevent.stop="
                        handleStrengthSectionFileDrop(
                          $event,
                          batch.id,
                          section.id,
                          file.id,
                        )
                      "
                      @dragend="handleUploadedFileDragEnd"
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
                          draggable="false"
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
              </section>
            </div>

          </div>

          <button
            class="upload-batches__add"
            type="button"
            @click="addConcreteUploadBatch"
          >
            + {{ uploadBatchAddUnitLabel }} 추가하기
          </button>
        </div>

        <div v-else class="upload-single-upload">
          <div
            class="upload-dropzone"
            :class="{ 'upload-dropzone--drag-active': isDropzoneDragActive }"
            @dragenter.prevent="handleDropzoneDragEnter"
            @dragover.prevent="handleDropzoneDragOver"
            @dragleave="handleDropzoneDragLeave"
            @drop.prevent="handleDropzoneDrop"
          >
            <Transition name="upload-dropzone-overlay">
              <div
                v-if="isDropzoneDragActive"
                class="upload-dropzone__drop-overlay"
                aria-hidden="true"
              >
                <span class="upload-dropzone__drop-label">
                  이미지를 여기에 놓아주세요
                </span>
              </div>
            </Transition>

            <button
              class="upload-dropzone__trigger"
              type="button"
              aria-label="사진 업로드"
              @click="openFilePicker()"
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
                  :class="{
                    'upload-dropzone__selected-item--removing':
                      isUploadedFileRemoving(file.id),
                    'upload-dropzone__selected-item--dragging':
                      draggedUploadFileId === file.id,
                    'upload-dropzone__selected-item--drag-over-before':
                      dragOverUploadFileId === file.id &&
                      dragOverUploadPlacement === 'before',
                    'upload-dropzone__selected-item--drag-over-after':
                      dragOverUploadFileId === file.id &&
                      dragOverUploadPlacement === 'after',
                  }"
                  draggable="true"
                  @dragstart="handleUploadedFileDragStart($event, file.id)"
                  @dragover.prevent.stop="handleUploadedFileDragOver($event, file.id)"
                  @dragleave.stop="handleUploadedFileDragLeave(file.id)"
                  @drop.prevent.stop="handleUploadedFileDrop($event, file.id)"
                  @dragend="handleUploadedFileDragEnd"
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
                      draggable="false"
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
              ? "생성하기"
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
import { computed, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import chevronDownIcon from "@fluentui/svg-icons/icons/chevron_down_20_regular.svg";
import deleteIcon from "@fluentui/svg-icons/icons/delete_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_16_regular.svg";
import uploadIcon from "@fluentui/svg-icons/icons/add_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import type { UploadSampleFile } from "@/features/document-conversion/model/document-conversion-demo.types";
import { useDocumentUploadDemoViewModel } from "@/features/document-conversion/state/useDocumentUploadDemoViewModel";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type UploadFileDropPlacement = "before" | "after";
type StrengthUploadSectionId = "sevenDay" | "twentyEightDay";

const strengthUploadSections: Array<{
  id: StrengthUploadSectionId;
  label: string;
}> = [
  { id: "sevenDay", label: "7일 강도" },
  { id: "twentyEightDay", label: "28일 강도" },
];

const {
  uploadPageCopy,
  selectedDocument,
  hasSelectedDocument,
  isMaterialInspectionRequest,
  isConcreteDeliveryTest,
  isConcreteStrengthTest,
  requiresWorkContext,
  mirUploadApplication,
  mirUploadWorkTypeName,
  mirUploadWorkTypeId,
  workContextHint,
  workTypeSuggestions,
  highlightedWorkTypeSuggestionIndex,
  isWorkTypeSuggestionsLoading,
  workTypeSuggestionsErrorMessage,
  isWorkTypeSuggestionListOpen,
  requiresUpload,
  uploadedFiles,
  linkedConcreteDeliveryDocumentOptions,
  uploadGuideItems,
  canReview,
  uploadErrorMessage,
  backToSelectionRoute,
  addUploadedImageFiles,
  removeUploadedImageFile,
  reorderUploadedImageFiles,
  saveConcreteDeliveryUploadBatches,
  saveConcreteStrengthUploadLots,
  selectLinkedConcreteDeliveryDocument,
  selectUploadDocument,
  updateMirUploadWorkTypeName,
  moveHighlightedWorkTypeSuggestion,
  handleWorkTypeSuggestionEnter,
  closeWorkTypeSuggestionList,
  setHighlightedWorkTypeSuggestionIndex,
  openWorkTypeSuggestionList,
  scheduleCloseWorkTypeSuggestionList,
  selectWorkTypeSuggestion,
} = useDocumentUploadDemoViewModel();
const router = useRouter();
const route = useRoute();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedPreviewFile = ref<UploadSampleFile | null>(null);
const isDropzoneDragActive = ref(false);
const isLinkedConcreteDeliveryDropdownOpen = ref(false);
const removingUploadedFileIds = ref(new Set<string>());
const removeAnimationTimers: ReturnType<typeof setTimeout>[] = [];
let dropzoneDragDepth = 0;
let concreteBatchIdSequence = 0;
const activeConcreteBatchId = ref<string | null>(null);
const concreteUploadBatches = ref<Array<{ id: string }>>([]);
const concreteBatchFileIds = ref<Record<string, string[]>>({});
const concreteBatchDragDepths = ref<Record<string, number>>({});
const activeStrengthUploadSectionId = ref<StrengthUploadSectionId | null>(null);
const strengthBatchFileIds = ref<
  Record<string, Record<StrengthUploadSectionId, string[]>>
>({});
const strengthSectionDragDepths = ref<Record<string, number>>({});
const draggedUploadFileId = ref<string | null>(null);
const dragOverUploadFileId = ref<string | null>(null);
const dragOverUploadPlacement = ref<UploadFileDropPlacement>("before");
const uploadErrorMessageLines = computed(() =>
  (uploadErrorMessage.value.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [])
    .map((line) => line.trim())
    .filter(Boolean),
);
const isGroupedUpload = computed(
  () => isConcreteDeliveryTest.value || isConcreteStrengthTest.value,
);
const uploadBatchTitleUnitLabel = computed(() =>
  isConcreteStrengthTest.value ? "로트" : "회",
);
const uploadBatchAddUnitLabel = computed(() =>
  isConcreteStrengthTest.value ? "로트" : "회차",
);
const selectedLinkedConcreteDeliveryDocument = computed(
  () =>
    linkedConcreteDeliveryDocumentOptions.value.find(
      (document) => document.isSelected,
    ) ??
    linkedConcreteDeliveryDocumentOptions.value[0] ??
    null,
);

function toggleLinkedConcreteDeliveryDropdown() {
  isLinkedConcreteDeliveryDropdownOpen.value =
    !isLinkedConcreteDeliveryDropdownOpen.value;
}

function handleLinkedConcreteDeliveryDocumentSelection(documentId: string) {
  selectLinkedConcreteDeliveryDocument(documentId);
  isLinkedConcreteDeliveryDropdownOpen.value = false;
}

function createConcreteBatchId() {
  concreteBatchIdSequence += 1;
  return `concrete-upload-batch-${concreteBatchIdSequence}`;
}

function createStrengthBatchFileSlots() {
  return {
    sevenDay: [],
    twentyEightDay: [],
  } satisfies Record<StrengthUploadSectionId, string[]>;
}

function getStrengthSectionKey(
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  return `${batchId}:${sectionId}`;
}

function resetConcreteUploadBatches() {
  const firstBatchId = createConcreteBatchId();

  concreteUploadBatches.value = [{ id: firstBatchId }];
  concreteBatchFileIds.value = { [firstBatchId]: [] };
  concreteBatchDragDepths.value = {};
  strengthBatchFileIds.value = { [firstBatchId]: createStrengthBatchFileSlots() };
  strengthSectionDragDepths.value = {};
  activeConcreteBatchId.value = null;
  activeStrengthUploadSectionId.value = null;
}

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
    void router.replace({
      path: "/documents/generation",
      query: { documentType: selectedDocument.value.type },
    });
  }
});

watch(
  () => selectedDocument.value.type,
  () => {
    resetConcreteUploadBatches();
  },
  { immediate: true },
);

function openFilePicker(
  batchId: string | null = null,
  strengthSectionId: StrengthUploadSectionId | null = null,
) {
  activeConcreteBatchId.value = batchId;
  activeStrengthUploadSectionId.value = strengthSectionId;
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

  if (files.length > 0 && isGroupedUpload.value) {
    const batchId = activeConcreteBatchId.value ?? concreteUploadBatches.value[0]?.id;

    if (batchId && isConcreteStrengthTest.value && activeStrengthUploadSectionId.value) {
      addFilesToStrengthSection(
        batchId,
        activeStrengthUploadSectionId.value,
        files,
      );
    } else if (batchId) {
      addFilesToConcreteBatch(batchId, files);
    }
  } else if (files.length > 0) {
    const addedFileIds = addUploadedImageFiles(files);
    trackUploadedFiles(addedFileIds.length, "picker");
  }

  activeConcreteBatchId.value = null;
  activeStrengthUploadSectionId.value = null;

  if (input) {
    input.value = "";
  }
}

function hasDraggedFiles(event: DragEvent) {
  const types = Array.from(event.dataTransfer?.types ?? []);

  return types.includes("Files");
}

function toDraggedImageFiles(dataTransfer: DataTransfer | null) {
  return Array.from(dataTransfer?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

function handleDropzoneDragEnter(event: DragEvent) {
  if (!hasDraggedFiles(event)) {
    return;
  }

  dropzoneDragDepth += 1;
  isDropzoneDragActive.value = true;
}

function handleDropzoneDragOver(event: DragEvent) {
  if (!hasDraggedFiles(event)) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  isDropzoneDragActive.value = true;
}

function handleDropzoneDragLeave(event: DragEvent) {
  if (!hasDraggedFiles(event)) {
    return;
  }

  dropzoneDragDepth = Math.max(dropzoneDragDepth - 1, 0);
  isDropzoneDragActive.value = dropzoneDragDepth > 0;
}

function handleDropzoneDrop(event: DragEvent) {
  dropzoneDragDepth = 0;
  isDropzoneDragActive.value = false;

  const files = toDraggedImageFiles(event.dataTransfer);

  if (files.length > 0) {
    const addedFileIds = addUploadedImageFiles(files);
    trackUploadedFiles(addedFileIds.length, "dropzone");
  }
}

function trackUploadedFiles(fileCount: number, source: string) {
  if (fileCount <= 0) {
    return;
  }

  analyticsClient.trackAction("document", "add_upload_files", "success", {
    document_type: selectedDocument.value.type,
    file_count: fileCount,
    source,
  });
}

function addFilesToConcreteBatch(batchId: string, files: File[]) {
  const addedFileIds = addUploadedImageFiles(files);

  if (addedFileIds.length === 0) {
    return;
  }

  trackUploadedFiles(addedFileIds.length, "grouped_batch");

  concreteBatchFileIds.value = {
    ...concreteBatchFileIds.value,
    [batchId]: [
      ...(concreteBatchFileIds.value[batchId] ?? []),
      ...addedFileIds,
    ],
  };
}

function addFilesToStrengthSection(
  batchId: string,
  sectionId: StrengthUploadSectionId,
  files: File[],
) {
  const addedFileIds = addUploadedImageFiles(files);

  if (addedFileIds.length === 0) {
    return;
  }

  trackUploadedFiles(addedFileIds.length, "strength_section");

  const currentBatchFileIds =
    strengthBatchFileIds.value[batchId] ?? createStrengthBatchFileSlots();

  strengthBatchFileIds.value = {
    ...strengthBatchFileIds.value,
    [batchId]: {
      ...currentBatchFileIds,
      [sectionId]: [
        ...(currentBatchFileIds[sectionId] ?? []),
        ...addedFileIds,
      ],
    },
  };
  concreteBatchFileIds.value = {
    ...concreteBatchFileIds.value,
    [batchId]: [
      ...(concreteBatchFileIds.value[batchId] ?? []),
      ...addedFileIds,
    ],
  };
}

function addConcreteUploadBatch() {
  const batchId = createConcreteBatchId();

  concreteUploadBatches.value = [...concreteUploadBatches.value, { id: batchId }];
  concreteBatchFileIds.value = {
    ...concreteBatchFileIds.value,
    [batchId]: [],
  };
  strengthBatchFileIds.value = {
    ...strengthBatchFileIds.value,
    [batchId]: createStrengthBatchFileSlots(),
  };
}

function removeConcreteUploadBatch(batchId: string) {
  if (concreteUploadBatches.value.length <= 1) {
    return;
  }

  const fileIds = concreteBatchFileIds.value[batchId] ?? [];

  if (selectedPreviewFile.value && fileIds.includes(selectedPreviewFile.value.id)) {
    selectedPreviewFile.value = null;
  }

  fileIds.forEach((fileId) => {
    removeUploadedImageFile(fileId);
  });

  const { [batchId]: removedFileIds, ...nextBatchFileIds } =
    concreteBatchFileIds.value;
  const { [batchId]: removedDragDepth, ...nextBatchDragDepths } =
    concreteBatchDragDepths.value;
  const { [batchId]: removedStrengthFileIds, ...nextStrengthBatchFileIds } =
    strengthBatchFileIds.value;
  const nextStrengthSectionDragDepths = Object.fromEntries(
    Object.entries(strengthSectionDragDepths.value).filter(
      ([sectionKey]) => !sectionKey.startsWith(`${batchId}:`),
    ),
  );

  void removedFileIds;
  void removedDragDepth;
  void removedStrengthFileIds;

  concreteBatchFileIds.value = nextBatchFileIds;
  concreteBatchDragDepths.value = nextBatchDragDepths;
  strengthBatchFileIds.value = nextStrengthBatchFileIds;
  strengthSectionDragDepths.value = nextStrengthSectionDragDepths;
  concreteUploadBatches.value = concreteUploadBatches.value.filter(
    (batch) => batch.id !== batchId,
  );

  if (activeConcreteBatchId.value === batchId) {
    activeConcreteBatchId.value = null;
  }

  activeStrengthUploadSectionId.value = null;
}

function isConcreteBatchDragActive(batchId: string) {
  return (concreteBatchDragDepths.value[batchId] ?? 0) > 0;
}

function setConcreteBatchDragDepth(batchId: string, depth: number) {
  concreteBatchDragDepths.value = {
    ...concreteBatchDragDepths.value,
    [batchId]: depth,
  };
}

function handleConcreteBatchDragEnter(event: DragEvent, batchId: string) {
  if (!isConcreteDeliveryTest.value) {
    return;
  }

  if (!hasDraggedFiles(event)) {
    return;
  }

  setConcreteBatchDragDepth(
    batchId,
    (concreteBatchDragDepths.value[batchId] ?? 0) + 1,
  );
}

function handleConcreteBatchDragOver(event: DragEvent, batchId: string) {
  if (!isConcreteDeliveryTest.value) {
    return;
  }

  if (!hasDraggedFiles(event)) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  setConcreteBatchDragDepth(
    batchId,
    Math.max(concreteBatchDragDepths.value[batchId] ?? 1, 1),
  );
}

function handleConcreteBatchDragLeave(event: DragEvent, batchId: string) {
  if (!isConcreteDeliveryTest.value) {
    return;
  }

  if (!hasDraggedFiles(event)) {
    return;
  }

  setConcreteBatchDragDepth(
    batchId,
    Math.max((concreteBatchDragDepths.value[batchId] ?? 0) - 1, 0),
  );
}

function handleConcreteBatchDrop(event: DragEvent, batchId: string) {
  if (!isConcreteDeliveryTest.value) {
    return;
  }

  setConcreteBatchDragDepth(batchId, 0);

  const files = toDraggedImageFiles(event.dataTransfer);

  if (files.length > 0) {
    addFilesToConcreteBatch(batchId, files);
  }
}

function isStrengthSectionDragActive(
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  return (
    (strengthSectionDragDepths.value[
      getStrengthSectionKey(batchId, sectionId)
    ] ?? 0) > 0
  );
}

function setStrengthSectionDragDepth(
  batchId: string,
  sectionId: StrengthUploadSectionId,
  depth: number,
) {
  strengthSectionDragDepths.value = {
    ...strengthSectionDragDepths.value,
    [getStrengthSectionKey(batchId, sectionId)]: depth,
  };
}

function handleStrengthSectionDragEnter(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  if (!isConcreteStrengthTest.value || !hasDraggedFiles(event)) {
    return;
  }

  setStrengthSectionDragDepth(
    batchId,
    sectionId,
    (strengthSectionDragDepths.value[
      getStrengthSectionKey(batchId, sectionId)
    ] ?? 0) + 1,
  );
}

function handleStrengthSectionDragOver(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  if (!isConcreteStrengthTest.value || !hasDraggedFiles(event)) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  setStrengthSectionDragDepth(
    batchId,
    sectionId,
    Math.max(
      strengthSectionDragDepths.value[
        getStrengthSectionKey(batchId, sectionId)
      ] ?? 1,
      1,
    ),
  );
}

function handleStrengthSectionDragLeave(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  if (!isConcreteStrengthTest.value || !hasDraggedFiles(event)) {
    return;
  }

  setStrengthSectionDragDepth(
    batchId,
    sectionId,
    Math.max(
      (strengthSectionDragDepths.value[
        getStrengthSectionKey(batchId, sectionId)
      ] ?? 0) - 1,
      0,
    ),
  );
}

function handleStrengthSectionDrop(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  if (!isConcreteStrengthTest.value) {
    return;
  }

  setStrengthSectionDragDepth(batchId, sectionId, 0);

  const files = toDraggedImageFiles(event.dataTransfer);

  if (files.length > 0) {
    addFilesToStrengthSection(batchId, sectionId, files);
  }
}

function getUploadFileDropPlacement(
  event: DragEvent,
): UploadFileDropPlacement {
  const target = event.currentTarget as HTMLElement | null;

  if (!target) {
    return "before";
  }

  const rect = target.getBoundingClientRect();
  const verticalRatio = (event.clientY - rect.top) / rect.height;
  const horizontalRatio = (event.clientX - rect.left) / rect.width;

  if (verticalRatio > 0.8) {
    return "after";
  }

  if (verticalRatio < 0.2) {
    return "before";
  }

  return horizontalRatio > 0.5 ? "after" : "before";
}

function hasFileOrderChanged(currentFileIds: string[], nextFileIds: string[]) {
  return (
    currentFileIds.length !== nextFileIds.length ||
    currentFileIds.some((fileId, index) => fileId !== nextFileIds[index])
  );
}

function moveFileIdNearTarget(
  fileIds: string[],
  sourceFileId: string,
  targetFileId: string,
  placement: UploadFileDropPlacement,
) {
  if (sourceFileId === targetFileId) {
    return fileIds;
  }

  const nextFileIds = fileIds.filter((fileId) => fileId !== sourceFileId);
  const targetIndex = nextFileIds.indexOf(targetFileId);

  if (targetIndex < 0) {
    return fileIds;
  }

  nextFileIds.splice(
    placement === "after" ? targetIndex + 1 : targetIndex,
    0,
    sourceFileId,
  );

  return nextFileIds;
}

function handleUploadedFileDragStart(event: DragEvent, fileId: string) {
  if (isUploadedFileRemoving(fileId)) {
    event.preventDefault();
    return;
  }

  draggedUploadFileId.value = fileId;
  dragOverUploadFileId.value = null;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", fileId);
  }
}

function handleUploadedFileDragOver(event: DragEvent, targetFileId: string) {
  const sourceFileId = draggedUploadFileId.value;

  if (!sourceFileId || sourceFileId === targetFileId) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dragOverUploadFileId.value = targetFileId;
  dragOverUploadPlacement.value = getUploadFileDropPlacement(event);
}

function handleUploadedFileDragLeave(fileId: string) {
  if (dragOverUploadFileId.value === fileId) {
    dragOverUploadFileId.value = null;
  }
}

function handleUploadedFileDrop(event: DragEvent, targetFileId: string) {
  const sourceFileId = draggedUploadFileId.value;

  if (!sourceFileId || sourceFileId === targetFileId) {
    handleUploadedFileDragEnd();
    return;
  }

  const currentFileIds = uploadedFiles.value.map((file) => file.id);
  const nextFileIds = moveFileIdNearTarget(
    currentFileIds,
    sourceFileId,
    targetFileId,
    getUploadFileDropPlacement(event),
  );

  if (hasFileOrderChanged(currentFileIds, nextFileIds)) {
    reorderUploadedImageFiles(nextFileIds);
  }

  handleUploadedFileDragEnd();
}

function syncConcreteBatchUploadOrder() {
  const orderedFileIds = concreteUploadBatches.value.flatMap(
    (batch) => concreteBatchFileIds.value[batch.id] ?? [],
  );

  if (orderedFileIds.length > 0) {
    reorderUploadedImageFiles(orderedFileIds);
  }
}

function syncStrengthUploadOrder() {
  const nextConcreteBatchFileIds = { ...concreteBatchFileIds.value };
  const orderedFileIds = concreteUploadBatches.value.flatMap((batch) => {
    const batchSections =
      strengthBatchFileIds.value[batch.id] ?? createStrengthBatchFileSlots();
    const batchFileIds = strengthUploadSections.flatMap(
      (section) => batchSections[section.id] ?? [],
    );

    nextConcreteBatchFileIds[batch.id] = batchFileIds;
    return batchFileIds;
  });

  concreteBatchFileIds.value = nextConcreteBatchFileIds;

  if (orderedFileIds.length > 0) {
    reorderUploadedImageFiles(orderedFileIds);
  }
}

function handleConcreteBatchFileDragOver(
  event: DragEvent,
  batchId: string,
  targetFileId: string,
) {
  const sourceFileId = draggedUploadFileId.value;
  const fileIds = concreteBatchFileIds.value[batchId] ?? [];

  if (
    !sourceFileId ||
    sourceFileId === targetFileId ||
    !fileIds.includes(sourceFileId) ||
    !fileIds.includes(targetFileId)
  ) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dragOverUploadFileId.value = targetFileId;
  dragOverUploadPlacement.value = getUploadFileDropPlacement(event);
}

function handleConcreteBatchFileDrop(
  event: DragEvent,
  batchId: string,
  targetFileId: string,
) {
  const sourceFileId = draggedUploadFileId.value;
  const currentFileIds = concreteBatchFileIds.value[batchId] ?? [];

  if (
    !sourceFileId ||
    sourceFileId === targetFileId ||
    !currentFileIds.includes(sourceFileId) ||
    !currentFileIds.includes(targetFileId)
  ) {
    handleUploadedFileDragEnd();
    return;
  }

  const nextFileIds = moveFileIdNearTarget(
    currentFileIds,
    sourceFileId,
    targetFileId,
    getUploadFileDropPlacement(event),
  );

  if (hasFileOrderChanged(currentFileIds, nextFileIds)) {
    concreteBatchFileIds.value = {
      ...concreteBatchFileIds.value,
      [batchId]: nextFileIds,
    };
    syncConcreteBatchUploadOrder();
  }

  handleUploadedFileDragEnd();
}

function handleStrengthSectionFileDragOver(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
  targetFileId: string,
) {
  const sourceFileId = draggedUploadFileId.value;
  const fileIds = strengthBatchFileIds.value[batchId]?.[sectionId] ?? [];

  if (
    !sourceFileId ||
    sourceFileId === targetFileId ||
    !fileIds.includes(sourceFileId) ||
    !fileIds.includes(targetFileId)
  ) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dragOverUploadFileId.value = targetFileId;
  dragOverUploadPlacement.value = getUploadFileDropPlacement(event);
}

function handleStrengthSectionFileDrop(
  event: DragEvent,
  batchId: string,
  sectionId: StrengthUploadSectionId,
  targetFileId: string,
) {
  const sourceFileId = draggedUploadFileId.value;
  const currentFileIds = strengthBatchFileIds.value[batchId]?.[sectionId] ?? [];

  if (
    !sourceFileId ||
    sourceFileId === targetFileId ||
    !currentFileIds.includes(sourceFileId) ||
    !currentFileIds.includes(targetFileId)
  ) {
    handleUploadedFileDragEnd();
    return;
  }

  const nextFileIds = moveFileIdNearTarget(
    currentFileIds,
    sourceFileId,
    targetFileId,
    getUploadFileDropPlacement(event),
  );

  if (hasFileOrderChanged(currentFileIds, nextFileIds)) {
    const currentBatchFileIds =
      strengthBatchFileIds.value[batchId] ?? createStrengthBatchFileSlots();

    strengthBatchFileIds.value = {
      ...strengthBatchFileIds.value,
      [batchId]: {
        ...currentBatchFileIds,
        [sectionId]: nextFileIds,
      },
    };
    syncStrengthUploadOrder();
  }

  handleUploadedFileDragEnd();
}

function handleUploadedFileDragEnd() {
  draggedUploadFileId.value = null;
  dragOverUploadFileId.value = null;
  dragOverUploadPlacement.value = "before";
}

function getConcreteBatchUploadedFiles(batchId: string) {
  const fileById = new Map(uploadedFiles.value.map((file) => [file.id, file]));

  return (concreteBatchFileIds.value[batchId] ?? [])
    .map((fileId) => fileById.get(fileId))
    .filter((file): file is UploadSampleFile => Boolean(file));
}

function getStrengthSectionUploadedFiles(
  batchId: string,
  sectionId: StrengthUploadSectionId,
) {
  const fileById = new Map(uploadedFiles.value.map((file) => [file.id, file]));

  return (strengthBatchFileIds.value[batchId]?.[sectionId] ?? [])
    .map((fileId) => fileById.get(fileId))
    .filter((file): file is UploadSampleFile => Boolean(file));
}

function isUploadedFileRemoving(fileId: string) {
  return removingUploadedFileIds.value.has(fileId);
}

function markUploadedFileRemoving(fileId: string) {
  const nextRemovingFileIds = new Set(removingUploadedFileIds.value);

  nextRemovingFileIds.add(fileId);
  removingUploadedFileIds.value = nextRemovingFileIds;
}

function unmarkUploadedFileRemoving(fileId: string) {
  const nextRemovingFileIds = new Set(removingUploadedFileIds.value);

  nextRemovingFileIds.delete(fileId);
  removingUploadedFileIds.value = nextRemovingFileIds;
}

function handleRemoveUploadedFile(fileId: string) {
  if (isUploadedFileRemoving(fileId)) {
    return;
  }

  if (selectedPreviewFile.value?.id === fileId) {
    selectedPreviewFile.value = null;
  }

  markUploadedFileRemoving(fileId);
  concreteBatchFileIds.value = Object.fromEntries(
    Object.entries(concreteBatchFileIds.value).map(([batchId, fileIds]) => [
      batchId,
      fileIds.filter((id) => id !== fileId),
    ]),
  );
  strengthBatchFileIds.value = Object.fromEntries(
    Object.entries(strengthBatchFileIds.value).map(([batchId, sections]) => [
      batchId,
      {
        sevenDay: sections.sevenDay.filter((id) => id !== fileId),
        twentyEightDay: sections.twentyEightDay.filter((id) => id !== fileId),
      },
    ]),
  );

  removeAnimationTimers.push(
    setTimeout(() => {
      removeUploadedImageFile(fileId);
      unmarkUploadedFileRemoving(fileId);
    }, 180),
  );
  analyticsClient.trackAction("document", "remove_upload_file", "success", {
    document_type: selectedDocument.value.type,
  });
}

function handleOpenImagePreview(file: UploadSampleFile) {
  selectedPreviewFile.value = file;
}

function handleCloseImagePreview() {
  selectedPreviewFile.value = null;
}

function handleGenerate() {
  if (!canReview.value) {
    analyticsClient.trackAction("document", "request_generation", "fail", {
      document_type: selectedDocument.value.type,
      file_count: uploadedFiles.value.length,
      error_kind: "invalid_inputs",
    });
    return;
  }

  if (isConcreteDeliveryTest.value) {
    saveConcreteDeliveryUploadBatches(
      concreteUploadBatches.value.map((batch) => ({
        id: batch.id,
        fileIds: concreteBatchFileIds.value[batch.id] ?? [],
      })),
    );
  }

  if (isConcreteStrengthTest.value) {
    saveConcreteStrengthUploadLots(
      concreteUploadBatches.value.map((batch) => {
        const slots =
          strengthBatchFileIds.value[batch.id] ?? createStrengthBatchFileSlots();

        return {
          id: batch.id,
          sevenDayFileIds: slots.sevenDay,
          twentyEightDayFileIds: slots.twentyEightDay,
        };
      }),
    );
  }

  analyticsClient.trackAction("document", "request_generation", "success", {
    document_type: selectedDocument.value.type,
    file_count: uploadedFiles.value.length,
  });

  void router.push({
    path: "/documents/generation",
    query: { documentType: selectedDocument.value.type },
  });
}

onBeforeUnmount(() => {
  removeAnimationTimers.forEach((timer) => clearTimeout(timer));
  removeAnimationTimers.length = 0;
});
</script>

<style scoped src="./styles/DocumentUploadPage.css"></style>
