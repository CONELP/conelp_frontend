<template>
  <div class="generated-frame">
    <DesktopAppHeader class="generated-page__desktop-header" />

    <main class="generated-page">
      <header class="generated-header">
        <div class="generated-shell generated-header__inner">
          <RouterLink
            class="generated-back"
            to="/preview/documents"
            aria-label="문서 선택으로 돌아가기"
          >
            <img class="generated-back__icon" :src="backIcon" alt="" aria-hidden="true" />
          </RouterLink>
        </div>
      </header>

      <section class="generated-shell generated-intro">
        <h1 class="generated-intro__title">생성된 문서</h1>
      </section>

      <section v-if="isGeneratedDocumentsLoading" class="generated-empty">
        생성된 문서를 불러오고 있어요
      </section>

      <section v-else-if="generatedDocumentsErrorMessage" class="generated-empty">
        {{ generatedDocumentsErrorMessage }}
      </section>

      <section v-else-if="generatedDocumentGroups.length > 0" class="generated-list">
        <section
          v-for="group in generatedDocumentGroups"
          :key="group.dateKey"
          class="generated-group"
        >
          <div class="generated-group__header">
            <span class="generated-group__label">{{ group.dateLabel }}</span>
          </div>

          <div class="generated-group__rows">
            <article
              v-for="document in group.documents"
              :key="document.id"
              class="generated-row"
            >
              <div class="generated-row__content">
                <span class="generated-row__file">
                  <span class="generated-row__file-icon-frame" aria-hidden="true">
                    <img
                      class="generated-row__file-icon"
                      :src="documentIcon"
                      alt=""
                    />
                  </span>

                  <span class="generated-row__file-body">
                    <span class="generated-row__file-name">{{ document.title }}</span>
                    <span class="generated-row__meta">
                      {{ document.subtitle }}
                    </span>
                  </span>
                </span>

                <button
                  class="generated-row__download"
                  type="button"
                  aria-label="생성된 문서 다운로드"
                  :disabled="downloadingDocumentId === document.id"
                  @click="handleDownloadGeneratedDocument(document)"
                >
                  <img
                    class="generated-row__download-icon"
                    :src="downloadIcon"
                    alt=""
                    aria-hidden="true"
                  />
                </button>

                <button
                  class="generated-row__open"
                  type="button"
                  aria-label="생성된 문서 열기"
                  @click="handleOpenGeneratedDocument(document)"
                >
                  <img
                    class="generated-row__open-icon"
                    :src="chevronRightIcon"
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section v-else class="generated-empty">
        생성된 문서가 없어요
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";
import type { GeneratedDocumentListItem } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";

const {
  generatedDocumentGroups,
  isGeneratedDocumentsLoading,
  generatedDocumentsErrorMessage,
} = useGeneratedDocumentsDemoViewModel();

const router = useRouter();
const downloadingDocumentId = ref<string | null>(null);

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
  document: GeneratedDocumentListItem,
) {
  const sourceUrl = document.resultUrl ?? document.pdfUrl;

  if (sourceUrl) {
    if (isStorageObjectKey(sourceUrl)) {
      return materialInspectionRequestApi.downloadDocumentFileAttachment(sourceUrl);
    }

    return {
      blob: await fetchExternalGeneratedDocument(sourceUrl),
      filename: "",
    };
  }

  return materialInspectionRequestApi.downloadDocumentJobAttachment(document.jobId);
}

function saveGeneratedDocumentBlob(
  generatedDocument: GeneratedDocumentListItem,
  blob: Blob,
  filename = "",
) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename || generatedDocument.downloadFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function handleDownloadGeneratedDocument(document: GeneratedDocumentListItem) {
  if (downloadingDocumentId.value === document.id) {
    return;
  }

  downloadingDocumentId.value = document.id;

  try {
    const attachment = await downloadGeneratedDocumentAttachment(document);

    saveGeneratedDocumentBlob(
      document,
      attachment.blob,
      attachment.filename,
    );
  } catch {
    window.alert("문서 다운로드에 실패했습니다.");
  } finally {
    downloadingDocumentId.value = null;
  }
}

function handleOpenGeneratedDocument(document: GeneratedDocumentListItem) {
  const query: Record<string, string> = {
    jobId: String(document.jobId),
  };

  if (document.documentType) {
    query.documentType = document.documentType;
  }

  void router.push({
    path: "/preview/result",
    query,
  });
}
</script>

<style scoped src="./styles/GeneratedDocumentsPage.css"></style>
