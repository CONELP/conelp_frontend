<template>
  <div class="generated-frame" @click="closeGeneratedContextMenu">
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
              @contextmenu.prevent="handleOpenGeneratedContextMenu($event, document)"
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
              </div>
            </article>
          </div>
        </section>
      </section>

      <section v-else class="generated-empty">
        생성된 문서가 없어요
      </section>

      <div
        v-if="generatedContextMenu"
        class="generated-context-menu"
        :style="{
          left: `${generatedContextMenu.x}px`,
          top: `${generatedContextMenu.y}px`,
        }"
        role="menu"
        @click.stop
        @pointerdown.stop
      >
        <button
          class="generated-context-menu__item"
          type="button"
          role="menuitem"
          @click.prevent.stop="handleDeleteGeneratedDocument"
          @mousedown.prevent.stop="handleDeleteGeneratedDocument"
          @pointerdown.prevent.stop="handleDeleteGeneratedDocument"
        >
          <img
            class="generated-context-menu__icon"
            :src="deleteIcon"
            alt=""
            aria-hidden="true"
          />
          삭제
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import deleteIcon from "@fluentui/svg-icons/icons/delete_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";
import type { GeneratedDocumentListItem } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";

const {
  generatedDocumentGroups,
  isGeneratedDocumentsLoading,
  generatedDocumentsErrorMessage,
  deleteGeneratedDocumentById,
} = useGeneratedDocumentsDemoViewModel();

const downloadingDocumentId = ref<string | null>(null);
const generatedContextMenu = ref<{
  x: number;
  y: number;
  demoResultId: string;
} | null>(null);

function isStorageObjectKey(value: string) {
  return value.startsWith("gs://") || (!isExternalUrl(value) && !isLocalDemoPath(value));
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isLocalDemoPath(value: string) {
  return value.startsWith("data/") || value.startsWith("/data/");
}

function toFetchableGeneratedDocumentUrl(value: string) {
  if (isExternalUrl(value) || value.startsWith("/")) {
    return value;
  }

  return `/${value.split("/").map(encodeURIComponent).join("/")}`;
}

async function fetchExternalGeneratedDocument(value: string) {
  const fetchUrl = toFetchableGeneratedDocumentUrl(value);
  const response = await fetch(
    fetchUrl,
    isExternalUrl(fetchUrl) ? { credentials: "include" } : undefined,
  );

  if (!response.ok) {
    throw new Error("다운로드 요청 실패");
  }

  return response.blob();
}

async function downloadGeneratedDocumentBlob(document: GeneratedDocumentListItem) {
  const sourceUrl = document.resultUrl ?? document.pdfUrl;

  if (sourceUrl) {
    if (isStorageObjectKey(sourceUrl)) {
      return materialInspectionRequestApi.downloadDocumentFile(sourceUrl);
    }

    return fetchExternalGeneratedDocument(sourceUrl);
  }

  if (document.jobId === null) {
    throw new Error("다운로드할 문서가 없습니다.");
  }

  return materialInspectionRequestApi.downloadDocumentJob(document.jobId);
}

function saveGeneratedDocumentBlob(
  generatedDocument: GeneratedDocumentListItem,
  blob: Blob,
) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = generatedDocument.downloadFileName;
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
    saveGeneratedDocumentBlob(
      document,
      await downloadGeneratedDocumentBlob(document),
    );
  } catch {
    window.alert("문서 다운로드에 실패했습니다.");
  } finally {
    downloadingDocumentId.value = null;
  }
}

function closeGeneratedContextMenu() {
  generatedContextMenu.value = null;
}

function handleOpenGeneratedContextMenu(
  event: MouseEvent,
  document: GeneratedDocumentListItem,
) {
  if (!document.canDelete || !document.demoResultId) {
    closeGeneratedContextMenu();
    return;
  }

  const menuWidth = 148;
  const menuHeight = 48;

  generatedContextMenu.value = {
    x: Math.min(event.clientX, window.innerWidth - menuWidth - 12),
    y: Math.min(event.clientY, window.innerHeight - menuHeight - 12),
    demoResultId: document.demoResultId,
  };
}

function handleDeleteGeneratedDocument() {
  if (!generatedContextMenu.value) {
    return;
  }

  deleteGeneratedDocumentById(generatedContextMenu.value.demoResultId);
  closeGeneratedContextMenu();
}

function handleGeneratedContextMenuKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeGeneratedContextMenu();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleGeneratedContextMenuKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGeneratedContextMenuKeydown);
});
</script>

<style scoped src="./styles/GeneratedDocumentsPage.css"></style>
