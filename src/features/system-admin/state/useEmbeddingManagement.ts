import { ref } from "vue";

import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type { RecalculateEmbeddingsResponse } from "@/features/system-admin/model/system-admin.types";

export function useEmbeddingManagement() {
  const isRecalculating = ref(false);
  const result = ref<RecalculateEmbeddingsResponse | null>(null);
  const errorMessage = ref("");

  const recalculateAllEmbeddings = async () => {
    if (isRecalculating.value) return;
    if (
      !confirm(
        "전 프로젝트의 모든 임베딩을 재계산합니다.\n임베딩 캐시가 비워지며, 완료까지 수 분 이상 걸릴 수 있습니다.\n계속하시겠습니까?",
      )
    ) {
      return;
    }

    isRecalculating.value = true;
    result.value = null;
    errorMessage.value = "";
    try {
      result.value = await systemAdminApi.recalculateAllEmbeddings();
    } catch (error: unknown) {
      console.error("임베딩 재계산 실패:", error);
      errorMessage.value = (error as Error).message;
    } finally {
      isRecalculating.value = false;
    }
  };

  return {
    isRecalculating,
    result,
    errorMessage,
    recalculateAllEmbeddings,
  };
}
