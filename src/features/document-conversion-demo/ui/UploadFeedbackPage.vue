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
                <img
                  class="feedback-ocr-image"
                  :src="currentValidationItem.previewUrl"
                  :alt="currentValidationItem.label"
                />
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
                자재 반입 서류 검토 결과
              </p>

              <div class="feedback-review-row feedback-review-row--top">
                <div class="feedback-review-field feedback-review-field--chip">
                  <span class="feedback-review-field__label">공종</span>
                  <input
                    v-model="materialReview.trade"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="공종"
                  />
                </div>

                <div class="feedback-review-field feedback-review-field--chip">
                  <span class="feedback-review-field__label">공사</span>
                  <input
                    v-model="materialReview.workType"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="공사"
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
                  />
                </div>

                <div class="feedback-review-field">
                  <span class="feedback-review-field__label">납품일</span>
                  <input
                    v-model="materialReview.deliveryDate"
                    class="feedback-review-field__input"
                    type="text"
                    aria-label="납품일"
                    placeholder="YYYY. MM. DD."
                  />
                </div>
              </div>

              <div class="feedback-review-field">
                <span class="feedback-review-field__label">사용부위</span>
                <input
                  v-model="materialReview.location"
                  class="feedback-review-field__input"
                  type="text"
                  aria-label="사용부위"
                  placeholder="사용 위치"
                />
              </div>

              <div class="feedback-review-table" aria-label="자재 목록">
                <div class="feedback-review-table__header">
                  <span>제조사</span>
                  <span>규격</span>
                  <span>수량</span>
                </div>

                <div
                  v-for="row in materialRows"
                  :key="row.id"
                  class="feedback-review-table__row"
                >
                  <input
                    v-model="row.manufacturer"
                    class="feedback-review-table__input"
                    type="text"
                    aria-label="제조사"
                    placeholder="제조사"
                  />
                  <input
                    v-model="row.spec"
                    class="feedback-review-table__input"
                    type="text"
                    aria-label="규격"
                    placeholder="규격"
                  />
                  <input
                    v-model="row.quantity"
                    class="feedback-review-table__input feedback-review-table__input--quantity"
                    type="number"
                    min="0"
                    inputmode="decimal"
                    aria-label="수량"
                    placeholder="수량"
                  />
                  <span class="feedback-review-table__unit">m2</span>
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
                + 행 추가
              </button>
            </article>
          </section>

          <footer class="feedback-footer feedback-footer--ocr">
            <button
              class="feedback-footer__primary"
              type="button"
              @click="handleRegisterMaterial"
            >
              자재 등록
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { RouterLink, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
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
} = useDocumentUploadDemoViewModel();
const router = useRouter();
const currentValidationIndex = ref(0);
const materialReview = ref({
  trade: "건축",
  workType: "철근콘크리트공사",
  supplier: "",
  deliveryDate: "",
  location: "",
});
const materialRows = ref([
  {
    id: "material-row-1",
    manufacturer: "",
    spec: "",
    quantity: "",
  },
  {
    id: "material-row-2",
    manufacturer: "",
    spec: "",
    quantity: "",
  },
  {
    id: "material-row-3",
    manufacturer: "",
    spec: "",
    quantity: "",
  },
]);

const currentValidationItem = computed(
  () => ocrValidationItems.value[currentValidationIndex.value],
);

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

function handleRegisterMaterial() {
  void router.push("/preview/result");
}

function handleAddMaterialRow() {
  materialRows.value.push({
    id: `material-row-${materialRows.value.length + 1}-${Date.now()}`,
    manufacturer: "",
    spec: "",
    quantity: "",
  });
}

function handleRemoveMaterialRow(rowId: string) {
  if (materialRows.value.length <= 1) {
    return;
  }

  materialRows.value = materialRows.value.filter((row) => row.id !== rowId);
}
</script>

<style scoped src="./styles/UploadFeedbackPage.css"></style>
