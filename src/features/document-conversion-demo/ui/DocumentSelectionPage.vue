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

    <section class="selection-shell selection-grid">
      <DocumentTypeCard
        v-for="document in documents"
        :key="document.type"
        :document="document"
        :selected="document.isSelected"
        @select="selectDocument(document.type)"
      />
    </section>

    <footer class="selection-shell selection-footer">
      <RouterLink
        class="selection-footer__primary"
        :class="{ 'selection-footer__primary--disabled': !canContinue }"
        :to="canContinue ? nextRoute : '/preview/documents'"
      >
        {{ pageCopy.actionLabel }}
      </RouterLink>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import menuIcon from "@fluentui/svg-icons/icons/text_align_justify_24_regular.svg";

import DocumentTypeCard from "@/features/document-conversion-demo/ui/components/DocumentTypeCard.vue";
import { useDocumentConversionDemoViewModel } from "@/features/document-conversion-demo/state/useDocumentConversionDemoViewModel";

const {
  pageCopy,
  documents,
  canContinue,
  nextRoute,
  selectDocument,
} = useDocumentConversionDemoViewModel();

const logoSrc = new URL("../../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped>
.selection-page {
  --page-inline: 1.2rem;
  --title-block-space: 3rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding: 0 var(--page-inline) 1rem;
  background: var(--surface-1);
}

.selection-shell {
  width: min(100%, 42rem);
  margin: 0 auto;
}

.selection-header {
  margin: 0 calc(var(--page-inline) * -1);
  background: var(--surface-1);
  border-bottom: 1px solid var(--outline-soft);
}

.selection-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100%, calc(42rem + (var(--page-inline) * 2)));
  margin: 0 auto;
  padding: 1.1rem var(--page-inline) 1rem;
}

.selection-header__logo {
  width: clamp(4.3rem, 18vw, 6rem);
  height: auto;
}

.selection-header__menu {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.selection-header__menu-icon {
  width: 1.45rem;
  height: 1.45rem;
  opacity: 0.84;
}

.selection-intro {
  padding: var(--title-block-space) 0;
}

.selection-intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.52rem, 5vw, 2.05rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.selection-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.78rem;
  align-content: start;
  margin-bottom: 1rem;
}

.selection-footer {
  display: flex;
  margin-top: auto;
}

.selection-footer__primary {
  display: inline-flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  min-height: 3.45rem;
  padding: 0.98rem 1.15rem;
  border-radius: var(--radius-control);
  background: var(--primary);
  color: #fff;
  font-weight: 800;
  transition:
    transform 160ms ease,
    background-color 160ms ease;
}

.selection-footer__primary:hover {
  transform: translateY(-1px);
  background: var(--primary-hover);
}

.selection-footer__primary--disabled {
  pointer-events: none;
  background: rgba(30, 24, 136, 0.35);
}

@media (min-width: 768px) {
  .selection-page {
    --page-inline: 1.6rem;
    --title-block-space: 3.6rem;
    padding: 0 var(--page-inline) 1.4rem;
  }

  .selection-shell {
    width: min(100%, 52rem);
  }

  .selection-header__inner {
    width: min(100%, calc(52rem + (var(--page-inline) * 2)));
    padding-top: 1.25rem;
    padding-bottom: 1.15rem;
  }

  .selection-header__menu {
    width: 2.15rem;
    height: 2.15rem;
  }

  .selection-header__menu-icon {
    width: 1.58rem;
    height: 1.58rem;
  }

  .selection-grid {
    gap: 0.92rem;
  }

  .selection-footer__primary {
    width: 100%;
  }
}
</style>
