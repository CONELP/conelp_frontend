<template>
  <div class="material-result-frame">
    <DesktopAppHeader class="material-result-page__desktop-header" />

    <main class="material-result-page">
      <section class="material-result-shell material-result-card">
        <header class="material-result-hero">
          <h1 class="material-result-title">
            자재 반입 정보를 확인했어요.
          </h1>
        </header>

        <section class="material-result-body">
          <div class="material-result-body__inner">
            <article class="material-result-summary-card">
              <div class="material-result-summary-card__content">
                <span
                  class="material-result-summary-card__material"
                  aria-label="등록된 자재"
                >
                  <img
                    class="material-result-summary-card__icon"
                    :src="materialIcon"
                    alt=""
                    aria-hidden="true"
                  />

                  <span class="material-result-summary-card__text">
                    <span class="material-result-summary-card__title">
                      {{ materialSummaryTitle }}
                    </span>
                    <span class="material-result-summary-card__meta">
                      {{ materialSummaryMeta }}
                    </span>
                  </span>
                </span>
              </div>

              <div
                v-if="registeredMaterialRows.length > 0"
                class="material-result-list"
                aria-label="등록된 자재 목록"
              >
                <div
                  v-for="row in registeredMaterialRows"
                  :key="row.lineKey"
                  class="material-result-row"
                >
                  <span class="material-result-row__name">
                    {{ formatMaterialName(row) }}
                  </span>
                  <span class="material-result-row__quantity">
                    {{ formatMaterialQuantity(row) }}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <footer class="material-result-actions">
          <RouterLink
            class="material-result-action material-result-action--secondary"
            to="/documents"
          >
            다른 문서 생성하기
          </RouterLink>

          <button
            class="material-result-action material-result-action--primary"
            type="button"
            @click="handleCreateInspectionRequest"
          >
            자재 반입 검수요청서 생성하기
          </button>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import materialIcon from "@fluentui/svg-icons/icons/box_20_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";

const documentStore = useDocumentConversionDemoStore();
const router = useRouter();
const registeredMaterialRows = computed(
  () => documentStore.mirAnalysisResult?.lines ?? [],
);
const materialReview = computed(
  () => documentStore.mirAnalysisResult,
);
const materialSummaryTitle = computed(() => {
  if (registeredMaterialRows.value.length === 0) {
    return "철근 총량";
  }

  const totalQuantity = registeredMaterialRows.value.reduce((sum, row) => {
    const quantity = Number(row.quantity);

    return Number.isFinite(quantity) ? sum + quantity : sum;
  }, 0);

  return totalQuantity > 0 ? `철근 총량 ${totalQuantity}t` : "철근 총량";
});
const materialSummaryMeta = computed(() => {
  const location = materialReview.value?.application || "사용 위치 미입력";
  const supplier = materialReview.value?.supplier || "공급업체 미입력";

  return `${location} · ${supplier}`;
});

function handleCreateInspectionRequest() {
  void router.push({
    path: "/documents/result",
    query: {
      documentType: "material_registration",
    },
  });
}

function formatMaterialName(row: {
  manufacturer: string | null;
  materialSpecName: string;
}) {
  return [row.manufacturer, row.materialSpecName].filter(Boolean).join(" ") || "등록된 자재";
}

function formatMaterialQuantity(row: { quantity: string | number | null }) {
  return row.quantity ? String(row.quantity) : "수량 미입력";
}
</script>

<style scoped src="./styles/MaterialRegistrationResultPage.css"></style>
