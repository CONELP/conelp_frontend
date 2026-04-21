<template>
  <main class="selection-page">
    <header class="selection-header">
      <div class="selection-header__inner">
        <img class="selection-header__logo" :src="logoSrc" alt="CONELP" />

        <button class="selection-header__menu" type="button" aria-label="메뉴 열기">
          <img class="selection-header__menu-icon" :src="menuIcon" alt="" aria-hidden="true" />
        </button>
      </div>
    </header>

    <section class="selection-shell selection-intro">
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
  </main>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import menuIcon from "@fluentui/svg-icons/icons/text_align_justify_24_regular.svg";

import DocumentTypeCard from "@/features/document-conversion-demo/ui/components/DocumentTypeCard.vue";
import { useDocumentConversionDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentConversionDemoViewModel";

const {
  pageCopy,
  documents,
  resolveNextRoute,
  clearSelectedDocument,
  selectDocument,
} = useDocumentConversionDemoViewModel();
const router = useRouter();

clearSelectedDocument();

function handleSelectDocument(type: string) {
  selectDocument(type);
  void router.push(resolveNextRoute(type));
}

const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DocumentSelectionPage.css"></style>
