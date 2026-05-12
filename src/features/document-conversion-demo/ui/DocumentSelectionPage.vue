<template>
  <div class="selection-frame" @click="closeGeneratedContextMenu">
    <DesktopAppHeader class="selection-page__desktop-header" />

    <main class="selection-page">
      <header class="selection-header">
        <div class="selection-header__inner">
          <img class="selection-header__logo" :src="logoSrc" alt="CONELP" />

          <button class="selection-header__menu" type="button" aria-label="메뉴 열기">
            <img class="selection-header__menu-icon" :src="menuIcon" alt="" aria-hidden="true" />
          </button>
        </div>
      </header>

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
              to="/preview/generated-documents"
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
                  @contextmenu.prevent="handleOpenGeneratedContextMenu($event, document)"
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

                  <button
                    class="selection-panel__generated-download"
                    type="button"
                    aria-label="생성된 문서 다운로드"
                    :disabled="downloadingDocumentId === document.id"
                    @click.stop="handleDownloadGeneratedDocument(document)"
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
              to="/preview/generated-documents"
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

      <div
        v-if="generatedContextMenu"
        class="selection-generated-menu"
        :style="{
          left: `${generatedContextMenu.x}px`,
          top: `${generatedContextMenu.y}px`,
        }"
        role="menu"
        @click.stop
        @pointerdown.stop
      >
        <button
          class="selection-generated-menu__item"
          type="button"
          role="menuitem"
          @click.prevent.stop="handleDeleteGeneratedDocument"
          @mousedown.prevent.stop="handleDeleteGeneratedDocument"
          @pointerdown.prevent.stop="handleDeleteGeneratedDocument"
        >
          <img
            class="selection-generated-menu__icon"
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
import { RouterLink, useRouter } from "vue-router";
import deleteIcon from "@fluentui/svg-icons/icons/delete_20_regular.svg";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import documentsIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";
import menuIcon from "@fluentui/svg-icons/icons/text_align_justify_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";
import type { GeneratedDocumentListItem } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";
import DocumentTypeCard from "@/features/document-conversion-demo/ui/components/DocumentTypeCard.vue";
import { useDocumentConversionDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentConversionDemoViewModel";

const {
  pageCopy,
  documents,
  resolveNextRoute,
  clearSelectedDocument,
  selectDocument,
} = useDocumentConversionDemoViewModel();
const {
  todayGeneratedDocuments,
  isGeneratedDocumentsLoading,
  generatedDocumentsErrorMessage,
  deleteGeneratedDocumentById,
} = useGeneratedDocumentsDemoViewModel();
const router = useRouter();
const downloadingDocumentId = ref<string | null>(null);
const generatedContextMenu = ref<{
  x: number;
  y: number;
  demoResultId: string;
} | null>(null);

clearSelectedDocument();

function handleSelectDocument(type: string) {
  selectDocument(type);
  const nextRoute = resolveNextRoute(type);

  if (nextRoute === "/preview/upload") {
    void router.push({
      path: nextRoute,
      query: { documentType: type },
    });
    return;
  }

  void router.push(nextRoute);
}

function closeGeneratedContextMenu() {
  generatedContextMenu.value = null;
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isLocalDemoPath(value: string) {
  return value.startsWith("data/") || value.startsWith("/data/");
}

function isStorageObjectKey(value: string) {
  return value.startsWith("gs://") || (!isExternalUrl(value) && !isLocalDemoPath(value));
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
  closeGeneratedContextMenu();

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

const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DocumentSelectionPage.css"></style>
