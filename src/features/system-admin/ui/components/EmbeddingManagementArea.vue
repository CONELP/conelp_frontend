<script setup lang="ts">
import AdminButton from "@/shared/ui/admin/Button.vue";
import { useEmbeddingManagement } from "@/features/system-admin/state/useEmbeddingManagement";

const { isRecalculating, result, errorMessage, recalculateAllEmbeddings } =
  useEmbeddingManagement();
</script>

<template>
  <div class="embedding-area">
    <section class="embedding-area__section">
      <h4 class="embedding-area__title">전체 임베딩 재계산</h4>
      <p class="embedding-area__desc">
        임베딩 모델 변경 후 전 프로젝트의 저장된 벡터를 새 모델 기준으로 다시 생성합니다.
        호출 시 임베딩 캐시가 비워지고 모든 테이블의 행이 재계산되며, 완료까지 시간이 걸릴 수
        있습니다.
      </p>
      <div class="embedding-area__actions">
        <AdminButton
          variant="destructive"
          :disabled="isRecalculating"
          @click="recalculateAllEmbeddings"
        >
          {{ isRecalculating ? "재계산 중..." : "전체 임베딩 재계산" }}
        </AdminButton>
        <span v-if="isRecalculating" class="embedding-area__hint">
          재계산이 끝날 때까지 페이지를 닫지 마세요.
        </span>
      </div>

      <p v-if="errorMessage" class="embedding-area__error">
        재계산 실패: {{ errorMessage }}
      </p>

      <div v-if="result" class="embedding-area__result">
        <h5 class="embedding-area__result-title">재계산 완료 — 총 {{ result.total }}건</h5>
        <div class="embedding-area__chips">
          <span
            v-for="(count, table) in result.perTable"
            :key="table"
            class="embedding-area__chip"
          >
            {{ table }}: {{ count }}건
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.embedding-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.embedding-area__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.embedding-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.embedding-area__desc {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted);
}
.embedding-area__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.embedding-area__hint {
  font-size: 13px;
  color: var(--ink-muted);
}
.embedding-area__error {
  margin: 0;
  font-size: 13px;
  color: #b91c1c;
}
.embedding-area__result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.embedding-area__result-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.embedding-area__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.embedding-area__chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--ink);
}
</style>
