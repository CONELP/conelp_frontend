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

            <section
              class="selection-shell selection-grid selection-schedule-export"
              aria-label="공정표 생성"
            >
              <button
                class="schedule-export-chip"
                type="button"
                @click="handleGoToScheduleExport"
              >
                <span class="schedule-export-chip__icon-frame" aria-hidden="true">
                  <img
                    class="schedule-export-chip__icon"
                    :src="ganttChartIcon"
                    alt=""
                  />
                </span>
                <span class="schedule-export-chip__label">공정표 생성</span>
              </button>
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
                  <span class="selection-panel__generated-copy">
                    <span class="selection-panel__generated-head">
                      <strong>{{ document.title }}</strong>
                      <span
                        class="selection-panel__generated-status"
                        :class="`selection-panel__generated-status--${document.statusTone}`"
                      >
                        {{ document.statusLabel }}
                      </span>
                    </span>
                    <span>{{ document.subtitle }}</span>
                  </span>

                  <button
                    class="selection-panel__generated-download"
                    type="button"
                    aria-label="생성된 문서 다운로드"
                    :disabled="!document.isDownloadable || downloadingDocumentId === document.id"
                    @click="handleDownloadGeneratedDocument(document)"
                  >
                    <img
                      class="selection-panel__generated-download-icon"
                      :src="downloadIcon"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
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
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import documentsIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import ganttChartIcon from "@fluentui/svg-icons/icons/gantt_chart_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion/state/useGeneratedDocumentsDemoViewModel";
import type { GeneratedDocumentListItem } from "@/features/document-conversion/state/useGeneratedDocumentsDemoViewModel";
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
const downloadingDocumentId = ref<string | null>(null);

clearSelectedDocument();

function isStorageObjectKey(value: string) {
  return value.startsWith("gs://") || !/^https?:\/\//i.test(value);
}

async function fetchExternalGeneratedDocument(value: string) {
  const response = await fetch(value, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("다운로드 요청 실패");
  }

  return response.blob();
}

async function downloadGeneratedDocumentAttachment(
  generatedDocument: GeneratedDocumentListItem,
) {
  const sourceUrl = generatedDocument.resultUrl ?? generatedDocument.pdfUrl;

  if (sourceUrl) {
    if (isStorageObjectKey(sourceUrl)) {
      return materialInspectionRequestApi.downloadDocumentFileAttachment(sourceUrl);
    }

    return {
      blob: await fetchExternalGeneratedDocument(sourceUrl),
      filename: "",
    };
  }

  return materialInspectionRequestApi.downloadDocumentJobAttachment(generatedDocument.jobId);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function saveGeneratedDocumentBlob(
  generatedDocument: GeneratedDocumentListItem,
  blob: Blob,
  filename = "",
) {
  triggerBlobDownload(blob, filename || generatedDocument.downloadFileName);
}

function handleGoToScheduleExport() {
  analyticsClient.trackAction("document", "select_type", "success", {
    document_type: "schedule_export",
  });
  void router.push("/documents/schedule-export");
}

async function handleDownloadGeneratedDocument(
  generatedDocument: GeneratedDocumentListItem,
) {
  if (downloadingDocumentId.value === generatedDocument.id) {
    return;
  }

  downloadingDocumentId.value = generatedDocument.id;

  try {
    const attachment = await downloadGeneratedDocumentAttachment(generatedDocument);

    saveGeneratedDocumentBlob(
      generatedDocument,
      attachment.blob,
      attachment.filename,
    );
    analyticsClient.trackAction("document", "download_generated", "success", {
      document_type: generatedDocument.documentType ?? "unknown",
      has_result_url: Boolean(generatedDocument.resultUrl ?? generatedDocument.pdfUrl),
      source: "documents_sidebar",
    });
  } catch {
    window.alert("문서 다운로드에 실패했습니다.");
    analyticsClient.trackAction("document", "download_generated", "fail", {
      document_type: generatedDocument.documentType ?? "unknown",
      has_result_url: Boolean(generatedDocument.resultUrl ?? generatedDocument.pdfUrl),
      source: "documents_sidebar",
    });
  } finally {
    downloadingDocumentId.value = null;
  }
}

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
