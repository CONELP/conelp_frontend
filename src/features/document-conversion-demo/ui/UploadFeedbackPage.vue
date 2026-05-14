<template>
  <div class="feedback-frame">
    <DesktopAppHeader class="feedback-page__desktop-header" />

    <main
      class="feedback-page"
      :class="{ 'feedback-page--ocr': needsOcrValidation }"
    >
      <section class="feedback-shell feedback-topbar">
        <RouterLink
          class="feedback-back"
          to="/preview/upload"
          aria-label="업로드 화면으로 돌아가기"
        >
          <img
            class="feedback-back__icon"
            :src="backIcon"
            alt=""
            aria-hidden="true"
          />
        </RouterLink>
      </section>

      <template v-if="needsOcrValidation">
        <section class="feedback-shell feedback-ocr-card feedback-ocr-card--compare">
          <section class="feedback-intro feedback-intro--ocr">
            <h1 class="feedback-intro__title">
              AI 추출 결과물을 확인해주세요.
            </h1>
          </section>

          <section v-if="currentValidationItem" class="feedback-ocr-stage">
            <article class="feedback-ocr-panel">
              <div class="feedback-ocr-panel__heading">
                <p class="feedback-ocr-panel__eyebrow">업로드 이미지</p>
                <span class="feedback-ocr-panel__side-title">
                  {{ currentValidationItem.fileName }}
                </span>
              </div>

              <div
                class="feedback-ocr-image-frame"
                @contextmenu.prevent="handleNextValidationImage"
              >
                <button
                  class="feedback-ocr-image-hitbox feedback-ocr-image-hitbox--previous"
                  type="button"
                  aria-label="이전 이미지"
                  @click="handlePreviousValidationImage"
                >
                  <span class="feedback-ocr-image-hitbox__label" aria-hidden="true">
                    <img
                      class="feedback-ocr-image-hitbox__icon"
                      :src="backIcon"
                      alt=""
                    />
                  </span>
                </button>

                <img
                  class="feedback-ocr-image"
                  :src="currentValidationItem.previewUrl"
                  :alt="currentValidationItem.label"
                />

                <button
                  class="feedback-ocr-image-hitbox feedback-ocr-image-hitbox--next"
                  type="button"
                  aria-label="다음 이미지"
                  @click="handleNextValidationImage"
                >
                  <span class="feedback-ocr-image-hitbox__label" aria-hidden="true">
                    <img
                      class="feedback-ocr-image-hitbox__icon"
                      :src="chevronRightIcon"
                      alt=""
                    />
                  </span>
                </button>
              </div>

              <div class="feedback-ocr-image-controls" aria-label="이미지 이동">
                <button
                  class="feedback-ocr-image-control"
                  type="button"
                  aria-label="이전 이미지"
                  @click="handlePreviousValidationImage"
                >
                  이전
                </button>

                <div class="feedback-ocr-image-dots" aria-label="이미지 순서">
                  <button
                    v-for="(item, index) in ocrValidationItems"
                    :key="item.id"
                    class="feedback-ocr-image-dot"
                    :class="{
                      'feedback-ocr-image-dot--active':
                        index === currentValidationIndex,
                    }"
                    type="button"
                    :aria-label="`${index + 1}번째 이미지 보기`"
                    @click="handleSelectValidationItem(index)"
                  />
                </div>

                <button
                  class="feedback-ocr-image-control"
                  type="button"
                  aria-label="다음 이미지"
                  @click="handleNextValidationImage"
                >
                  다음
                </button>
              </div>

            </article>

            <article class="feedback-ocr-panel feedback-ocr-review">
              <p class="feedback-ocr-panel__eyebrow">
                {{ reviewPanelTitle }}
              </p>

              <div class="feedback-review-row feedback-review-row--top">
                <div class="feedback-review-field">
                  <span class="feedback-review-field__label">사용 위치</span>
                  <input
                    v-model="materialReview.application"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="사용 위치"
                    :placeholder="workContextHint.application"
                    :title="toHoverTitle(materialReview.application)"
                  />
                </div>

                <div class="feedback-review-field">
                  <span class="feedback-review-field__label">공종 이름</span>
                  <input
                    v-model="materialReview.workTypeName"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="공종 이름"
                    :placeholder="workContextHint.workTypeName"
                    :title="toHoverTitle(materialReview.workTypeName)"
                  />
                </div>
              </div>

              <div class="feedback-review-row feedback-review-row--two">
                <div class="feedback-review-field">
                  <span class="feedback-review-field__label">공급업체</span>
                  <input
                    v-model="materialReview.supplier"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="공급업체"
                    placeholder="공급업체명"
                    :title="toHoverTitle(materialReview.supplier)"
                  />
                </div>

                <div class="feedback-review-field">
                  <span class="feedback-review-field__label">납품일</span>
                  <input
                    v-model="materialReview.deliveryDate"
                    class="feedback-review-field__input"
                    type="date"
                    aria-label="납품일"
                    placeholder="YYYY-MM-DD"
                    :title="toHoverTitle(materialReview.deliveryDate)"
                  />
                </div>
              </div>

              <div
                ref="materialReviewTableRef"
                class="feedback-review-table"
                aria-label="자재 목록"
              >
                <div
                  class="feedback-review-table__header"
                  :style="materialTableGridStyle"
                >
                  <span class="feedback-review-table__header-cell">
                    제조사
                    <button
                      class="feedback-review-table__resize-handle"
                      type="button"
                      aria-label="제조사 열 너비 조절"
                      @pointerdown="handleColumnResizeStart(0, $event)"
                    />
                  </span>
                  <span class="feedback-review-table__header-cell">
                    자재 종류
                    <button
                      class="feedback-review-table__resize-handle"
                      type="button"
                      aria-label="자재 종류 열 너비 조절"
                      @pointerdown="handleColumnResizeStart(1, $event)"
                    />
                  </span>
                  <span class="feedback-review-table__header-cell">
                    규격
                    <button
                      class="feedback-review-table__resize-handle"
                      type="button"
                      aria-label="규격 열 너비 조절"
                      @pointerdown="handleColumnResizeStart(2, $event)"
                    />
                  </span>
                  <span class="feedback-review-table__header-cell">
                    수량
                  </span>
                  <span aria-hidden="true" />
                </div>

                <div
                  v-for="row in materialRows"
                  :key="row.id"
                  class="feedback-review-table__row"
                  :style="materialTableGridStyle"
                >
                  <input
                    v-model="row.manufacturer"
                    class="feedback-review-table__input"
                    type="text"
                    aria-label="제조사"
                    placeholder="제조사"
                    :title="toHoverTitle(row.manufacturer)"
                  />
                  <input
                    v-model="row.materialTypeName"
                    class="feedback-review-table__input"
                    type="text"
                    aria-label="자재 종류"
                    placeholder="자재 종류"
                    :title="toHoverTitle(row.materialTypeName)"
                  />
                  <input
                    v-model="row.materialSpecName"
                    class="feedback-review-table__input"
                    type="text"
                    aria-label="규격"
                    placeholder="규격"
                    :title="toHoverTitle(row.materialSpecName)"
                  />
                  <input
                    v-model="row.quantity"
                    class="feedback-review-table__input feedback-review-table__input--quantity"
                    type="text"
                    inputmode="decimal"
                    aria-label="수량"
                    placeholder="수량"
                    :title="toHoverTitle(row.quantity)"
                  />
                  <button
                    class="feedback-review-table__remove"
                    type="button"
                    aria-label="행 삭제"
                    @click="handleRemoveMaterialRow(row.id)"
                  >
                    x
                  </button>
                </div>
              </div>

              <button
                class="feedback-review-add"
                type="button"
                @click="handleAddMaterialRow"
              >
                행 추가
              </button>

              <section
                v-if="isConcreteDeliveryReview"
                class="feedback-cat-review"
                aria-label="콘크리트 반입시험 배치 목록"
              >
                <p class="feedback-cat-review__title">배치 시험값</p>

                <div class="feedback-cat-table">
                  <div class="feedback-cat-table__header">
                    <span>배치</span>
                    <span>슬럼프</span>
                    <span>공기량</span>
                    <span>온도</span>
                    <span>염화물</span>
                    <span>함수율</span>
                  </div>

                  <div
                    v-for="batchRow in catBatchRows"
                    :key="batchRow.id"
                    class="feedback-cat-table__row"
                  >
                    <input
                      v-model="batchRow.batch"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="numeric"
                      aria-label="배치"
                      :title="toHoverTitle(batchRow.batch)"
                    />
                    <input
                      v-model="batchRow.slump"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="decimal"
                      aria-label="슬럼프"
                      :title="toHoverTitle(batchRow.slump)"
                    />
                    <input
                      v-model="batchRow.air"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="decimal"
                      aria-label="공기량"
                      :title="toHoverTitle(batchRow.air)"
                    />
                    <input
                      v-model="batchRow.temp"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="decimal"
                      aria-label="온도"
                      :title="toHoverTitle(batchRow.temp)"
                    />
                    <input
                      v-model="batchRow.chloride"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="decimal"
                      aria-label="염화물"
                      :title="toHoverTitle(batchRow.chloride)"
                    />
                    <input
                      v-model="batchRow.water"
                      class="feedback-review-table__input feedback-review-table__input--quantity"
                      type="text"
                      inputmode="decimal"
                      aria-label="함수율"
                      :title="toHoverTitle(batchRow.water)"
                    />
                  </div>
                </div>
              </section>
            </article>
          </section>

          <p
            v-if="submitErrorMessage"
            class="feedback-error"
            role="alert"
          >
            {{ submitErrorMessage }}
          </p>

          <footer class="feedback-footer feedback-footer--ocr">
            <button
              class="feedback-footer__primary"
              :class="{ 'feedback-footer__primary--disabled': isSubmittingDocument }"
              type="button"
              :disabled="isSubmittingDocument"
              @click="handleCreateDocument"
            >
              {{ isSubmittingDocument ? "생성 중" : createDocumentButtonLabel }}
            </button>
          </footer>
        </section>
      </template>

      <template v-else>
        <section class="feedback-shell feedback-intro">
          <h1 class="feedback-intro__title">
            {{ uploadFeedbackPageCopy.title }}
          </h1>
        </section>

        <section class="feedback-shell feedback-stack">
          <article class="feedback-summary">
            <span class="feedback-summary__icon-frame" aria-hidden="true">
              <img
                class="feedback-summary__icon"
                :src="selectedDocument.iconSrc"
                alt=""
              />
            </span>

            <div class="feedback-summary__body">
              <p class="feedback-summary__title">
                {{ selectedDocument.label }}
              </p>
              <p class="feedback-summary__helper">
                {{ uploadFeedbackPageCopy.summaryLabel }}
              </p>
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
          <RouterLink
            class="feedback-footer__primary"
            :to="primaryFeedbackRoute"
          >
            {{ primaryFeedbackActionLabel }}
          </RouterLink>
        </footer>
      </template>
    </main>

    <Teleport to="body">
      <div
        v-if="isMaterialActiveConfirmOpen"
        class="material-active-confirm__backdrop"
        role="presentation"
        @click.self="handleCancelMaterialActive"
      >
        <section
          class="material-active-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-active-confirm-title"
        >
          <header class="material-active-confirm__header">
            <h2 id="material-active-confirm-title">반입자재도 함께 만들까요?</h2>
            <p>
              "예" 를 선택하면 이번 입고 데이터가 전체 반입자재에 산입됩니다.<br />
              "아니오" 를 선택하면 산입에서 제외됩니다.
            </p>
          </header>
          <footer class="material-active-confirm__footer">
            <button
              type="button"
              class="material-active-confirm__button material-active-confirm__button--secondary"
              @click="handleMaterialActiveChoice(false)"
            >
              아니오
            </button>
            <button
              type="button"
              class="material-active-confirm__button material-active-confirm__button--primary"
              @click="handleMaterialActiveChoice(true)"
            >
              예
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { RouterLink, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import type {
  CatAnalysisBatch,
  CatAnalysisPhoto,
  CatAnalysisResponse,
  CreateCatDocumentRequest,
  CreateMirDocumentRequest,
  MirAnalysisLine,
  MirAnalysisPhoto,
  MirAnalysisResponse,
  UpdateCatBatchRequest,
  UpdateCatDataRequest,
  UpdateMirDataRequest,
  UpdateMirLineRequest,
} from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import { useDocumentUploadDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentUploadDemoViewModel";

const {
  uploadFeedbackPageCopy,
  selectedDocument,
  needsOcrValidation,
  ocrValidationItems,
  feedbackItems,
  matchedCount,
  missingCount,
  primaryFeedbackActionLabel,
  primaryFeedbackRoute,
  workContextHint,
} = useDocumentUploadDemoViewModel();
const documentStore = useDocumentConversionDemoStore();
const router = useRouter();
const currentValidationIndex = ref(0);
const materialReview = ref({
  application: "",
  workTypeName: "",
  supplier: "",
  deliveryDate: "",
});
const originalWorkTypeId = ref<number | null>(null);
const originalWorkTypeName = ref("");
const materialRows = ref<MaterialReviewRow[]>([]);
const catBatchRows = ref<CatBatchReviewRow[]>([]);
const isSubmittingDocument = ref(false);
const submitErrorMessage = ref("");
const materialReviewTableRef = ref<HTMLElement | null>(null);
const materialTableColumnFractions = ref([1, 1, 1, 0.72]);

const MIN_MATERIAL_TABLE_COLUMN_FRACTION = 0.42;

let columnResizeState: {
  index: number;
  startX: number;
  startFractions: number[];
  tableWidth: number;
} | null = null;

interface MaterialReviewRow {
  id: string;
  lineKey: string | null;
  manufacturer: string;
  materialSpecId: number | null;
  materialSpecName: string;
  originalMaterialSpecName: string;
  materialTypeId: number | null;
  materialTypeName: string;
  originalMaterialTypeName: string;
  quantity: string;
}

interface CatBatchReviewRow {
  id: string;
  batch: string;
  originalBatch: string;
  slump: string;
  air: string;
  temp: string;
  chloride: string;
  water: string;
  photos: CatAnalysisPhoto[];
}

const currentValidationItem = computed(
  () => ocrValidationItems.value[currentValidationIndex.value],
);

const isConcreteDeliveryReview = computed(
  () => selectedDocument.value.type === "concrete_delivery_csi",
);
const reviewPanelTitle = computed(() =>
  isConcreteDeliveryReview.value
    ? "콘크리트 반입시험 검토 결과"
    : "자재 반입 검수요청 검토 결과",
);
const createDocumentButtonLabel = computed(() =>
  isConcreteDeliveryReview.value
    ? "콘크리트 반입시험서 생성하기"
    : "검수요청서 생성하기",
);

const materialTableGridStyle = computed(() => ({
  gridTemplateColumns: `${materialTableColumnFractions.value
    .map((fraction) => `minmax(0, ${fraction}fr)`)
    .join(" ")} 1.5rem`,
}));

function normalizeNullableText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function normalizeComparableText(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toHoverTitle(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function toRowId(line: MirAnalysisLine, index: number) {
  return line.lineKey || `material-row-${index + 1}`;
}

function toReviewRow(line: MirAnalysisLine, index: number): MaterialReviewRow {
  return {
    id: toRowId(line, index),
    lineKey: line.lineKey,
    manufacturer: line.manufacturer ?? "",
    materialSpecId: line.materialSpecId,
    materialSpecName: line.materialSpecName ?? "",
    originalMaterialSpecName: line.materialSpecName ?? "",
    materialTypeId: line.materialTypeId,
    materialTypeName: line.materialTypeName ?? "",
    originalMaterialTypeName: line.materialTypeName ?? "",
    quantity: line.quantity === null ? "" : String(line.quantity),
  };
}

function toCatBatchReviewRow(
  batch: CatAnalysisBatch,
  index: number,
): CatBatchReviewRow {
  return {
    id: `cat-batch-${batch.batch}-${index}`,
    batch: String(batch.batch),
    originalBatch: String(batch.batch),
    slump: batch.lineData.slump === null ? "" : String(batch.lineData.slump),
    air: batch.lineData.air === null ? "" : String(batch.lineData.air),
    temp: batch.lineData.temp === null ? "" : String(batch.lineData.temp),
    chloride:
      batch.lineData.chloride === null ? "" : String(batch.lineData.chloride),
    water: batch.lineData.water === null ? "" : String(batch.lineData.water),
    photos: batch.photos,
  };
}

function hydrateMirReview(result: MirAnalysisResponse) {
  const fallbackApplication = documentStore.mirUploadApplication;
  const fallbackWorkTypeName = documentStore.mirUploadWorkTypeName;

  materialReview.value = {
    application: result.application ?? fallbackApplication,
    workTypeName: result.workTypeName ?? fallbackWorkTypeName,
    supplier: result.supplier ?? "",
    deliveryDate: result.deliveryDate ?? "",
  };
  originalWorkTypeId.value = result.workTypeId;
  originalWorkTypeName.value = result.workTypeName ?? fallbackWorkTypeName;
  materialRows.value = result.lines.map(toReviewRow);
  catBatchRows.value = [];
}

function hydrateCatReview(result: CatAnalysisResponse) {
  hydrateMirReview(result);
  catBatchRows.value = result.batches.map(toCatBatchReviewRow);
}

function hasLineValue(row: MaterialReviewRow) {
  return Boolean(
    row.manufacturer.trim() ||
      row.materialTypeName.trim() ||
      row.materialSpecName.trim() ||
      row.quantity.trim(),
  );
}

function isChangedName(originalName: string, nextName: string) {
  return Boolean(nextName.trim() && nextName.trim() !== originalName.trim());
}

function toUpdateLineRequest(row: MaterialReviewRow): UpdateMirLineRequest {
  const materialTypeNameChanged = isChangedName(
    row.originalMaterialTypeName,
    row.materialTypeName,
  );
  const materialSpecNameChanged = isChangedName(
    row.originalMaterialSpecName,
    row.materialSpecName,
  );

  return {
    lineKey: row.lineKey,
    manufacturer: row.manufacturer.trim(),
    materialSpecId: materialSpecNameChanged ? null : row.materialSpecId,
    newMaterialSpecName: materialSpecNameChanged
      ? row.materialSpecName.trim()
      : row.materialSpecId
        ? null
        : normalizeNullableText(row.materialSpecName),
    materialTypeId: materialTypeNameChanged ? null : row.materialTypeId,
    newMaterialTypeName: materialTypeNameChanged
      ? row.materialTypeName.trim()
      : row.materialTypeId
        ? null
        : normalizeNullableText(row.materialTypeName),
    quantity: row.quantity.trim(),
  };
}

function toComparableLine(row: MaterialReviewRow) {
  return {
    lineKey: normalizeComparableText(row.lineKey),
    manufacturer: normalizeComparableText(row.manufacturer),
    materialSpecId: row.materialSpecId ?? null,
    materialSpecName: normalizeComparableText(row.materialSpecName),
    materialTypeId: row.materialTypeId ?? null,
    materialTypeName: normalizeComparableText(row.materialTypeName),
    quantity: normalizeComparableText(row.quantity),
  };
}

function toComparableAnalysisLine(line: MirAnalysisLine) {
  return {
    lineKey: normalizeComparableText(line.lineKey),
    manufacturer: normalizeComparableText(line.manufacturer),
    materialSpecId: line.materialSpecId ?? null,
    materialSpecName: normalizeComparableText(line.materialSpecName),
    materialTypeId: line.materialTypeId ?? null,
    materialTypeName: normalizeComparableText(line.materialTypeName),
    quantity: normalizeComparableText(line.quantity),
  };
}

function toComparablePhoto(photo: MirAnalysisPhoto) {
  return {
    photoKey: photo.photoKey,
    type: photo.type,
    description: normalizeComparableText(photo.description),
  };
}

function toComparableCatPhoto(photo: CatAnalysisPhoto) {
  return {
    photoKey: photo.photoKey,
    type: photo.type,
    description: normalizeComparableText(photo.description),
  };
}

function toComparableCatBatchRow(row: CatBatchReviewRow) {
  return {
    batch: normalizeComparableText(row.batch),
    slump: normalizeComparableText(row.slump),
    air: normalizeComparableText(row.air),
    temp: normalizeComparableText(row.temp),
    chloride: normalizeComparableText(row.chloride),
    water: normalizeComparableText(row.water),
    photos: row.photos.map(toComparableCatPhoto),
  };
}

function toComparableCatAnalysisBatch(batch: CatAnalysisBatch) {
  return {
    batch: normalizeComparableText(batch.batch),
    slump: normalizeComparableText(batch.lineData.slump),
    air: normalizeComparableText(batch.lineData.air),
    temp: normalizeComparableText(batch.lineData.temp),
    chloride: normalizeComparableText(batch.lineData.chloride),
    water: normalizeComparableText(batch.lineData.water),
    photos: batch.photos.map(toComparableCatPhoto),
  };
}

function areComparableObjectsEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasMirReviewChanges(
  analysisResult: MirAnalysisResponse,
  finalRows: MaterialReviewRow[],
) {
  const reviewState = {
    application: normalizeComparableText(materialReview.value.application),
    supplier: normalizeComparableText(materialReview.value.supplier),
    deliveryDate: normalizeComparableText(materialReview.value.deliveryDate),
    workTypeName: normalizeComparableText(materialReview.value.workTypeName),
    lines: finalRows.map(toComparableLine),
    photos: analysisResult.photos.map(toComparablePhoto),
  };
  const analysisState = {
    application: normalizeComparableText(analysisResult.application),
    supplier: normalizeComparableText(analysisResult.supplier),
    deliveryDate: normalizeComparableText(analysisResult.deliveryDate),
    workTypeName: normalizeComparableText(
      analysisResult.workTypeName ?? documentStore.mirUploadWorkTypeName,
    ),
    lines: analysisResult.lines.map(toComparableAnalysisLine),
    photos: analysisResult.photos.map(toComparablePhoto),
  };

  return !areComparableObjectsEqual(reviewState, analysisState);
}

function hasCatReviewChanges(
  analysisResult: CatAnalysisResponse,
  finalRows: MaterialReviewRow[],
  finalBatchRows: CatBatchReviewRow[],
) {
  if (hasMirReviewChanges(analysisResult, finalRows)) {
    return true;
  }

  return !areComparableObjectsEqual(
    finalBatchRows.map(toComparableCatBatchRow),
    analysisResult.batches.map(toComparableCatAnalysisBatch),
  );
}

function toCreateMirDocumentRequest(
  result: MirAnalysisResponse,
  active: boolean,
): CreateMirDocumentRequest {
  return {
    application: result.application,
    supplier: result.supplier,
    deliveryDate: result.deliveryDate,
    workTypeId: result.workTypeId,
    lines: result.lines.map((line) => ({
      manufacturer: line.manufacturer ?? "",
      materialSpecId: line.materialSpecId,
      quantity: line.quantity === null ? "" : String(line.quantity),
    })),
    photos: result.photos.map((photo) => ({
      photoKey: photo.photoKey,
      type: photo.type,
      description: photo.description,
    })),
    active,
  };
}

function toCreateCatDocumentRequest(
  result: CatAnalysisResponse,
  active: boolean,
): CreateCatDocumentRequest {
  return {
    ...toCreateMirDocumentRequest(result, active),
    batches: result.batches.map((batch) => ({
      batch: String(batch.batch),
      lineData: {
        slump: batch.lineData.slump === null ? null : String(batch.lineData.slump),
        air: batch.lineData.air === null ? "" : String(batch.lineData.air),
        temp: batch.lineData.temp === null ? "" : String(batch.lineData.temp),
        chloride:
          batch.lineData.chloride === null ? "" : String(batch.lineData.chloride),
        water: batch.lineData.water === null ? "" : String(batch.lineData.water),
      },
      photos: batch.photos.map((photo) => ({
        photoKey: photo.photoKey,
        type: photo.type,
        description: photo.description,
      })),
    })),
  };
}

function toUpdateMirDataRequest(
  analysisResult: MirAnalysisResponse,
  finalRows: MaterialReviewRow[],
): UpdateMirDataRequest {
  const nextWorkTypeName = normalizeNullableText(materialReview.value.workTypeName);

  return {
    application: normalizeNullableText(materialReview.value.application),
    supplier: normalizeNullableText(materialReview.value.supplier),
    deliveryDate: normalizeNullableText(materialReview.value.deliveryDate),
    workTypeId: originalWorkTypeId.value,
    newWorkTypeName:
      originalWorkTypeId.value &&
      !isChangedName(originalWorkTypeName.value, materialReview.value.workTypeName)
        ? null
        : nextWorkTypeName,
    lines: finalRows.map(toUpdateLineRequest),
    photos: analysisResult.photos.map((photo) => ({
      photoKey: photo.photoKey,
      mimeType: photo.mimeType,
      data: photo.data,
      type: photo.type,
      description: photo.description,
    })),
  };
}

function toUpdateCatBatchRequest(row: CatBatchReviewRow): UpdateCatBatchRequest {
  return {
    batch: row.batch.trim(),
    lineData: {
      slump: normalizeNullableText(row.slump),
      air: normalizeNullableText(row.air),
      temp: normalizeNullableText(row.temp),
      chloride: normalizeNullableText(row.chloride),
      water: normalizeNullableText(row.water),
    },
    photos: row.photos.map((photo) => ({
      photoKey: photo.photoKey,
      mimeType: photo.mimeType,
      data: photo.data,
      type: photo.type,
      description: photo.description,
    })),
  };
}

function toUpdateCatDataRequest(
  analysisResult: CatAnalysisResponse,
  finalRows: MaterialReviewRow[],
  finalBatchRows: CatBatchReviewRow[],
): UpdateCatDataRequest {
  return {
    ...toUpdateMirDataRequest(analysisResult, finalRows),
    batches: finalBatchRows.map(toUpdateCatBatchRequest),
  };
}

function validateMirReviewRows(rows: MaterialReviewRow[]) {
  if (rows.length === 0) {
    return "자재 항목을 1개 이상 입력해 주세요.";
  }

  const hasInvalidLine = rows.some(
    (row) => !row.materialTypeName.trim() || !row.materialSpecName.trim(),
  );

  if (hasInvalidLine) {
    return "자재 종류, 규격을 모두 입력해 주세요.";
  }

  return "";
}

function validateCatBatchRows(rows: CatBatchReviewRow[]) {
  if (rows.length === 0) {
    return "배치 항목을 1개 이상 확인해 주세요.";
  }

  const seenBatchNumbers = new Set<string>();

  for (const row of rows) {
    const batch = Number(row.batch);

    if (!Number.isInteger(batch) || batch <= 0) {
      return "배치 번호는 양수로 입력해 주세요.";
    }

    if (seenBatchNumbers.has(row.batch.trim())) {
      return "배치 번호가 중복되지 않게 입력해 주세요.";
    }

    seenBatchNumbers.add(row.batch.trim());
  }

  return "";
}

function handleColumnResizeMove(event: PointerEvent) {
  if (!columnResizeState) {
    return;
  }

  const { index, startX, startFractions, tableWidth } = columnResizeState;
  const nextFractions = [...startFractions];
  const totalFraction = startFractions.reduce((sum, fraction) => sum + fraction, 0);
  const pairTotal = startFractions[index] + startFractions[index + 1];
  const deltaFraction = ((event.clientX - startX) / tableWidth) * totalFraction;
  const nextLeft = Math.min(
    Math.max(
      startFractions[index] + deltaFraction,
      MIN_MATERIAL_TABLE_COLUMN_FRACTION,
    ),
    pairTotal - MIN_MATERIAL_TABLE_COLUMN_FRACTION,
  );

  nextFractions[index] = nextLeft;
  nextFractions[index + 1] = pairTotal - nextLeft;
  materialTableColumnFractions.value = nextFractions;
}

function handleColumnResizeEnd() {
  window.removeEventListener("pointermove", handleColumnResizeMove);
  columnResizeState = null;
}

function handleColumnResizeStart(index: number, event: PointerEvent) {
  const tableWidth = materialReviewTableRef.value?.getBoundingClientRect().width;

  if (!tableWidth) {
    return;
  }

  columnResizeState = {
    index,
    startX: event.clientX,
    startFractions: [...materialTableColumnFractions.value],
    tableWidth,
  };

  event.preventDefault();
  window.addEventListener("pointermove", handleColumnResizeMove);
  window.addEventListener("pointerup", handleColumnResizeEnd, { once: true });
}

watchEffect(() => {
  if (!needsOcrValidation.value) {
    return;
  }

  if (ocrValidationItems.value.length === 0) {
    void router.replace("/preview/upload");
    return;
  }

  if (currentValidationIndex.value > ocrValidationItems.value.length - 1) {
    currentValidationIndex.value = ocrValidationItems.value.length - 1;
  }
});

watch(
  () => documentStore.mirAnalysisResult,
  (result) => {
    if (result && !isConcreteDeliveryReview.value) {
      hydrateMirReview(result);
    }
  },
  { immediate: true },
);

watch(
  () => documentStore.catAnalysisResult,
  (result) => {
    if (result && isConcreteDeliveryReview.value) {
      hydrateCatReview(result);
    }
  },
  { immediate: true },
);

function handleSelectValidationItem(index: number) {
  if (index < 0 || index > ocrValidationItems.value.length - 1) {
    return;
  }

  currentValidationIndex.value = index;
}

function handlePreviousValidationImage() {
  if (ocrValidationItems.value.length === 0) {
    return;
  }

  currentValidationIndex.value =
    (currentValidationIndex.value - 1 + ocrValidationItems.value.length) %
    ocrValidationItems.value.length;
}

function handleNextValidationImage() {
  if (ocrValidationItems.value.length === 0) {
    return;
  }

  currentValidationIndex.value =
    (currentValidationIndex.value + 1) % ocrValidationItems.value.length;
}

function handleCreateMirDocumentDraft(active: boolean) {
  const analysisResult = documentStore.mirAnalysisResult;

  if (!analysisResult || isSubmittingDocument.value) {
    return;
  }

  const finalRows = materialRows.value.filter(hasLineValue);
  const rowValidationMessage = validateMirReviewRows(finalRows);

  if (rowValidationMessage) {
    submitErrorMessage.value = rowValidationMessage;
    return;
  }

  submitErrorMessage.value = "";
  documentStore.saveMirDocumentSubmissionDraft(
    hasMirReviewChanges(analysisResult, finalRows)
      ? {
          updateRequest: toUpdateMirDataRequest(analysisResult, finalRows),
          createRequest: null,
          active,
        }
      : {
          updateRequest: null,
          createRequest: toCreateMirDocumentRequest(analysisResult, active),
          active,
        },
  );
  void router.push({
    path: "/preview/loading",
    query: {
      documentType: selectedDocument.value.type,
      phase: "mir-create",
    },
  });
}

function handleCreateCatDocumentDraft(active: boolean) {
  const analysisResult = documentStore.catAnalysisResult;

  if (!analysisResult || isSubmittingDocument.value) {
    return;
  }

  const finalRows = materialRows.value.filter(hasLineValue);
  const rowValidationMessage = validateMirReviewRows(finalRows);

  if (rowValidationMessage) {
    submitErrorMessage.value = rowValidationMessage;
    return;
  }

  const batchValidationMessage = validateCatBatchRows(catBatchRows.value);

  if (batchValidationMessage) {
    submitErrorMessage.value = batchValidationMessage;
    return;
  }

  submitErrorMessage.value = "";
  documentStore.saveCatDocumentSubmissionDraft(
    hasCatReviewChanges(analysisResult, finalRows, catBatchRows.value)
      ? {
          updateRequest: toUpdateCatDataRequest(
            analysisResult,
            finalRows,
            catBatchRows.value,
          ),
          createRequest: null,
          active,
        }
      : {
          updateRequest: null,
          createRequest: toCreateCatDocumentRequest(analysisResult, active),
          active,
        },
  );
  void router.push({
    path: "/preview/loading",
    query: {
      documentType: selectedDocument.value.type,
      phase: "cat-create",
    },
  });
}

const isMaterialActiveConfirmOpen = ref(false);

function handleCreateDocument() {
  if (isSubmittingDocument.value) return;

  const finalRows = materialRows.value.filter(hasLineValue);
  const rowValidationMessage = validateMirReviewRows(finalRows);
  if (rowValidationMessage) {
    submitErrorMessage.value = rowValidationMessage;
    return;
  }

  if (isConcreteDeliveryReview.value) {
    const batchValidationMessage = validateCatBatchRows(catBatchRows.value);
    if (batchValidationMessage) {
      submitErrorMessage.value = batchValidationMessage;
      return;
    }
  }

  submitErrorMessage.value = "";
  isMaterialActiveConfirmOpen.value = true;
}

function handleMaterialActiveChoice(active: boolean) {
  isMaterialActiveConfirmOpen.value = false;
  if (isConcreteDeliveryReview.value) {
    handleCreateCatDocumentDraft(active);
  } else {
    handleCreateMirDocumentDraft(active);
  }
}

function handleCancelMaterialActive() {
  isMaterialActiveConfirmOpen.value = false;
}

function handleAddMaterialRow() {
  materialRows.value.push({
    id: `material-row-${materialRows.value.length + 1}-${Date.now()}`,
    lineKey: null,
    manufacturer: "",
    materialSpecId: null,
    materialSpecName: "",
    originalMaterialSpecName: "",
    materialTypeId: null,
    materialTypeName: "",
    originalMaterialTypeName: "",
    quantity: "",
  });
}

function handleRemoveMaterialRow(rowId: string) {
  if (materialRows.value.length <= 1) {
    return;
  }

  materialRows.value = materialRows.value.filter((row) => row.id !== rowId);
}

onBeforeUnmount(() => {
  handleColumnResizeEnd();
});
</script>

<style scoped src="./styles/UploadFeedbackPage.css"></style>
