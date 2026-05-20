<template>
  <div class="selection-frame">
    <DesktopAppHeader class="selection-page__desktop-header" />

    <main class="selection-page">
      <div class="selection-layout">
        <section class="selection-main">
          <section class="selection-shell selection-intro">
            <p v-if="pageCopy.eyebrow" class="selection-intro__eyebrow">
              {{ pageCopy.eyebrow }}
            </p>
            <h1 class="selection-intro__title">{{ pageCopy.title }}</h1>
          </section>

          <section class="selection-body">
            <section class="selection-shell selection-grid">
              <DocumentTypeCard
                v-for="document in documents"
                :key="document.type"
                :document="document"
                :selected="document.isSelected"
                @select="handleSelectDocument(document.type)"
              />
            </section>
          </section>

          <footer class="selection-shell selection-footer">
            <RouterLink
              class="selection-footer__link"
              to="/documents/generated"
            >
              생성된 문서 보기
              <img
                class="selection-footer__link-icon"
                :src="documentsIcon"
                alt=""
                aria-hidden="true"
              />
            </RouterLink>
          </footer>
        </section>

        <aside class="selection-sidebar" aria-label="오늘 생성된 문서">
          <section class="selection-panel">
            <div class="selection-panel__section-head">
              <h2 class="selection-panel__title selection-panel__title--regular">
                오늘 생성된 문서
              </h2>
              <span class="selection-panel__count">{{ todayGeneratedDocuments.length }}건</span>
            </div>

            <div class="selection-panel__generated-list">
              <p v-if="isGeneratedDocumentsLoading" class="selection-panel__empty">
                생성된 문서를 불러오고 있어요
              </p>

              <p v-else-if="generatedDocumentsErrorMessage" class="selection-panel__empty">
                {{ generatedDocumentsErrorMessage }}
              </p>

              <template v-else-if="todayGeneratedDocuments.length > 0">
                <article
                  v-for="document in todayGeneratedDocuments"
                  :key="document.id"
                  class="selection-panel__generated-item"
                >
                  <span class="selection-panel__generated-icon-wrap" aria-hidden="true">
                    <img
                      class="selection-panel__generated-icon"
                      :src="documentIcon"
                      alt=""
                    />
                  </span>

                  <span class="selection-panel__generated-copy">
                    <strong>{{ document.title }}</strong>
                    <span>{{ document.subtitle }}</span>
                  </span>
                </article>
              </template>

              <p v-else class="selection-panel__empty">
                생성된 문서가 없어요
              </p>
            </div>

            <RouterLink
              class="selection-panel__cta"
              to="/documents/generated"
            >
              전체 보기
              <img
                class="selection-panel__cta-icon"
                :src="documentsIcon"
                alt=""
                aria-hidden="true"
              />
            </RouterLink>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import documentsIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion/state/useGeneratedDocumentsDemoViewModel";
import DocumentTypeCard from "@/features/document-conversion/ui/components/DocumentTypeCard.vue";
import { useDocumentConversionDemoViewModel } from "@/features/document-conversion/state/useDocumentConversionDemoViewModel";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

const {
  pageCopy,
  documents,
  resolveNextRoute,
  isDocumentCatalogType,
  clearSelectedDocument,
  selectDocument,
} = useDocumentConversionDemoViewModel();
const {
  todayGeneratedDocuments,
  isGeneratedDocumentsLoading,
  generatedDocumentsErrorMessage,
} = useGeneratedDocumentsDemoViewModel();
const router = useRouter();

clearSelectedDocument();

function handleSelectDocument(type: string) {
  if (!isDocumentCatalogType(type)) {
    return;
  }

  selectDocument(type);
  const nextRoute = resolveNextRoute(type);

  if (nextRoute === "/documents") {
    analyticsClient.trackAction("document", "select_type", "fail", {
      document_type: type,
      error_kind: "unavailable",
    });
    return;
  }

  analyticsClient.trackAction("document", "select_type", "success", {
    document_type: type,
  });

  if (nextRoute.startsWith("/preview/")) {
    void router.push({
      path: nextRoute,
      query: { documentType: type },
    });
    return;
  }

  void router.push({
    path: nextRoute,
    query: { documentType: type },
  });
}
</script>

<style scoped src="./styles/DocumentSelectionPage.css"></style>
