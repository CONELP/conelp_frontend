<template>
  <div class="document-registration-frame">
    <DesktopAppHeader class="document-registration-page__desktop-header" />

    <main class="document-registration-page">
      <section class="document-registration-shell document-registration-topbar">
        <RouterLink
          class="document-registration-back"
          to="/documents"
          aria-label="문서 선택으로 돌아가기"
        >
          <img
            class="document-registration-back__icon"
            :src="backIcon"
            alt=""
            aria-hidden="true"
          />
        </RouterLink>
      </section>

      <section class="document-registration-shell document-registration-intro">
        <p class="document-registration-intro__eyebrow">
          {{ selectedSite?.siteName ?? "선택 현장" }}
        </p>
        <h1 class="document-registration-intro__title">
          <span class="document-registration-intro__title-line">
            {{ selectedDocument.label }}
          </span>
          <span class="document-registration-intro__title-line">
            자료를 확인해 주세요.
          </span>
        </h1>
      </section>

      <section
        v-if="selectedManifest"
        class="document-registration-shell document-registration-stack"
      >
        <article class="document-registration-card document-registration-card--source">
          <h2 class="document-registration-card__title">입력 자료</h2>
          <p class="document-registration-card__path">{{ selectedManifest.sourceFolder }}</p>

          <div class="document-registration-input-list">
            <article
              v-for="input in selectedManifest.inputRefs"
              :key="input.id"
              class="document-registration-input"
            >
              <span class="document-registration-input__icon-frame" aria-hidden="true">
                <img
                  class="document-registration-input__icon"
                  :src="documentIcon"
                  alt=""
                />
              </span>

              <span class="document-registration-input__body">
                <strong>{{ input.label }}</strong>
                <span>{{ input.fileName }}</span>
              </span>
            </article>
          </div>
        </article>

        <article class="document-registration-card">
          <h2 class="document-registration-card__title">자료 등록 순서</h2>

          <ol class="document-registration-step-list">
            <li
              v-for="(step, index) in selectedManifest.registrationSteps"
              :key="step.id"
              class="document-registration-step"
            >
              <span class="document-registration-step__index">
                {{ index + 1 }}
              </span>
              <span class="document-registration-step__body">
                <strong>{{ step.label }}</strong>
                <span>{{ step.description }}</span>
              </span>
            </li>
          </ol>
        </article>

        <article class="document-registration-card document-registration-card--output">
          <h2 class="document-registration-card__title">생성 결과</h2>
          <p class="document-registration-card__output">
            {{ selectedManifest.outputExcel ?? "문서별 결과 파일을 확인한 뒤 연결합니다." }}
          </p>
        </article>
      </section>

      <footer class="document-registration-shell document-registration-footer">
        <button
          class="document-registration-footer__primary"
          type="button"
          :disabled="!selectedManifest"
          @click="handleContinue"
        >
          자료 등록 시작
          <img
            class="document-registration-footer__icon"
            :src="chevronRightIcon"
            alt=""
            aria-hidden="true"
          />
        </button>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentConversionDemoStore();
const {
  getSelectedSiteDocumentManifest,
  selectedSite,
} = useServicePresentationDemoViewModel();

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

const routeDocumentType = computed(() => {
  const value = route.query.documentType;

  return typeof value === "string" && isDocumentCatalogType(value)
    ? value
    : null;
});

watchEffect(() => {
  if (routeDocumentType.value) {
    documentStore.selectDocument(routeDocumentType.value);
  }
});

const selectedDocument = computed(
  () =>
    documentStore.selectedDocument ??
    documentCatalog.find((document) => document.type === routeDocumentType.value) ??
    documentCatalog[0],
);

const selectedManifest = computed(() =>
  getSelectedSiteDocumentManifest(selectedDocument.value.type),
);

watchEffect(() => {
  if (!routeDocumentType.value || !selectedManifest.value) {
    void router.replace("/documents");
  }
});

function handleContinue() {
  if (!selectedManifest.value) {
    return;
  }

  const documentType = selectedDocument.value.type;
  const nextPath =
    selectedDocument.value.generationMode === "direct"
      ? "/preview/loading"
      : "/preview/upload";

  void router.push({
    path: nextPath,
    query: {
      documentType,
    },
  });
}
</script>

<style scoped src="./styles/DocumentRegistrationPage.css"></style>
