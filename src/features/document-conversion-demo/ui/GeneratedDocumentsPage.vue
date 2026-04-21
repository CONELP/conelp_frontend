<template>
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

    <section class="generated-list">
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
                <img
                  class="generated-row__file-icon"
                  :src="pdfIcon"
                  alt=""
                  aria-hidden="true"
                />

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
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
import pdfIcon from "@fluentui/svg-icons/icons/document_pdf_20_regular.svg";

import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel";

const { generatedDocumentGroups } = useGeneratedDocumentsDemoViewModel();
</script>

<style scoped src="./styles/GeneratedDocumentsPage.css"></style>
