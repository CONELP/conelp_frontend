<template>
  <div class="material-result-frame">
    <DesktopAppHeader class="material-result-page__desktop-header" />

    <main class="material-result-page">
      <section class="material-result-shell material-result-card">
        <header class="material-result-hero">
          <h1 class="material-result-title">
            자재를 성공적으로 등록했어요.
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
                  :key="row.id"
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
            to="/preview/documents"
          >
            다른 문서 생성하기
          </RouterLink>

          <button
            class="material-result-action material-result-action--primary"
            type="button"
            @click="handleCreateInspectionRequest"
          >
            자재 반입 검수 요청서 생성하기
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
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

const documentStore = useDocumentConversionDemoStore();
const router = useRouter();
const registeredMaterialRows = computed(
  () => documentStore.materialRegistrationResult?.rows ?? [],
);
const materialReview = computed(
  () => documentStore.materialRegistrationResult?.review,
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
  const location = materialReview.value?.location || "사용부위 미입력";
  const supplier = materialReview.value?.supplier || "공급업체 미입력";

  return `${location} · ${supplier}`;
});

function handleCreateInspectionRequest() {
  documentStore.selectDocument("material_inspection_rebar");
  void router.push({
    path: "/preview/upload",
    query: { documentType: "material_inspection_rebar" },
  });
}

function formatMaterialName(row: { manufacturer: string; spec: string }) {
  return [row.manufacturer, row.spec].filter(Boolean).join(" ") || "등록된 자재";
}

function formatMaterialQuantity(row: { quantity: string }) {
  return row.quantity ? `${row.quantity} m2` : "수량 미입력";
}
</script>

<style scoped src="./styles/MaterialRegistrationResultPage.css"></style>
