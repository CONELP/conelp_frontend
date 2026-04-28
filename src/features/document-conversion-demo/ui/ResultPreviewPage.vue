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
              <article class="result-summary-card">
                <div class="result-summary-card__content">
                  <span class="result-summary-card__file" aria-label="생성된 PDF 파일">
                    <img
                      class="result-summary-card__file-icon"
                      :src="pdfIcon"
                      alt=""
                      aria-hidden="true"
                    />
                    <span class="result-summary-card__file-name">
                      {{ resultFileName }}
                    </span>
                  </span>

                  <button
                    class="result-summary-card__download"
                    type="button"
                    aria-label="PDF 다운로드"
                  >
                    <img
                      class="result-summary-card__download-icon"
                      :src="downloadIcon"
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>

              <article class="result-review-card">
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
import { RouterLink } from "vue-router";
import downloadIcon from "@fluentui/svg-icons/icons/arrow_download_20_regular.svg";
import pdfIcon from "@fluentui/svg-icons/icons/document_pdf_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { useResultPreviewDemoViewModel } from "@/features/document-conversion-demo/state/useResultPreviewDemoViewModel";

const { resultFileName, reviewItems } = useResultPreviewDemoViewModel();
</script>
<style scoped src="./styles/ResultPreviewPage.css"></style>
