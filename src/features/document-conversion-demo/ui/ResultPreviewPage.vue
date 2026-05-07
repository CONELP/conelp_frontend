<template>
  <div class="result-frame">
    <DesktopAppHeader class="result-page__desktop-header" />

    <main class="result-page">
      <section class="result-shell result-card">
        <header class="result-hero">
          <h1 class="result-title">문서를 성공적으로 생성했어요.</h1>
        </header>

        <section class="result-body">
          <div class="result-body__inner">
            <section class="result-stack">
              <article class="result-document-row">
                <div class="result-document-row__content">
                  <span class="result-document-row__file" aria-label="생성된 문서">
                    <span class="result-document-row__file-icon-frame">
                      <img
                        class="result-document-row__file-icon"
                        :src="documentIcon"
                        alt=""
                        aria-hidden="true"
                      />
                    </span>

                    <span class="result-document-row__file-body">
                      <span class="result-document-row__file-name">
                        {{ resultDocumentTitle }}
                      </span>
                      <span class="result-document-row__meta">
                        {{ resultDocumentSubtitle }}
                      </span>
                    </span>
                  </span>

                  <button
                    v-if="isResultDownloadAvailable"
                    class="result-document-row__download"
                    type="button"
                    aria-label="문서 다운로드"
                    :disabled="isDownloadingResult"
                    @click="handleDownloadResult"
                  >
                    <img
                      class="result-document-row__download-icon"
                      :src="downloadIcon"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    v-else
                    class="result-document-row__download"
                    type="button"
                    aria-label="문서 다운로드"
                    disabled
                  >
                    <img
                      class="result-document-row__download-icon"
                      :src="downloadIcon"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>

              <article v-if="reviewItems.length > 0" class="result-review-card">
                <p class="result-review-card__title">검토가 필요해요.</p>

                <ul class="result-review-card__list">
                  <li
                    v-for="item in reviewItems"
                    :key="item"
                    class="result-review-card__item"
                  >
                    {{ item }}
                  </li>
                </ul>
              </article>
            </section>
          </div>
        </section>

        <footer class="result-footer">
          <RouterLink
            class="result-footer__primary"
            to="/preview/documents"
          >
            다른 문서 생성하기
          </RouterLink>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import documentIcon from "@fluentui/svg-icons/icons/document_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import { useResultPreviewDemoViewModel } from "@/features/document-conversion-demo/state/useResultPreviewDemoViewModel";

const {
  resultDownloadUrl,
  resultDownloadJobId,
  resultDownloadFileName,
  resultDocumentTitle,
  resultDocumentSubtitle,
  isResultDownloadAvailable,
  reviewItems,
} = useResultPreviewDemoViewModel();

const isDownloadingResult = ref(false);

function isStorageObjectKey(value: string) {
  return value.startsWith("gs://") || !/^https?:\/\//i.test(value);
}

async function fetchExternalResultFile(value: string) {
  const response = await fetch(value, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("다운로드 요청 실패");
  }

  return response.blob();
}

async function downloadResultBlob() {
  const sourceUrl = resultDownloadUrl.value;

  if (sourceUrl) {
    if (isStorageObjectKey(sourceUrl)) {
      return materialInspectionRequestApi.downloadDocumentFile(sourceUrl);
    }

    return fetchExternalResultFile(sourceUrl);
  }

  if (resultDownloadJobId.value !== null) {
    return materialInspectionRequestApi.downloadDocumentJob(resultDownloadJobId.value);
  }

  throw new Error("다운로드할 문서가 없습니다.");
}

function saveBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = resultDownloadFileName.value;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function handleDownloadResult() {
  if (!isResultDownloadAvailable.value || isDownloadingResult.value) {
    return;
  }

  isDownloadingResult.value = true;

  try {
    saveBlob(await downloadResultBlob());
  } catch {
    window.alert("문서 다운로드에 실패했습니다.");
  } finally {
    isDownloadingResult.value = false;
  }
}
</script>
<style scoped src="./styles/ResultPreviewPage.css"></style>
