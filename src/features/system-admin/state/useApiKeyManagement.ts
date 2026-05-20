import { ref } from "vue";

import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type {
  ApiKeyMasked,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
} from "@/features/system-admin/model/system-admin.types";

export function useApiKeyManagement() {
  const apiKeys = ref<ApiKeyMasked[]>([]);
  const isLoading = ref(false);
  const isCreating = ref(false);
  const isDeleting = ref(false);
  const issuedKey = ref<CreateApiKeyResponse | null>(null);

  const loadApiKeys = async (comIds: string[]) => {
    if (comIds.length === 0) {
      apiKeys.value = [];
      return;
    }
    isLoading.value = true;
    try {
      const results = await Promise.all(
        comIds.map((comId) => systemAdminApi.getApiKeyList(comId)),
      );
      apiKeys.value = results.flat();
    } catch (error: unknown) {
      console.error("API 키 목록 조회 실패:", error);
      alert((error as Error).message);
      apiKeys.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const createApiKey = async (
    payload: CreateApiKeyPayload,
    refreshComIds: string[],
  ): Promise<boolean> => {
    if (isCreating.value) return false;
    isCreating.value = true;
    try {
      const res = await systemAdminApi.createApiKey(payload);
      issuedKey.value = res;
      await loadApiKeys(refreshComIds);
      return true;
    } catch (error: unknown) {
      console.error("API 키 생성 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isCreating.value = false;
    }
  };

  const deleteApiKey = async (projectId: string, refreshComIds: string[]) => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await systemAdminApi.deleteApiKey(projectId);
      await loadApiKeys(refreshComIds);
    } catch (error: unknown) {
      console.error("API 키 폐기 실패:", error);
      alert((error as Error).message);
    } finally {
      isDeleting.value = false;
    }
  };

  const clearIssuedKey = () => {
    issuedKey.value = null;
  };

  return {
    apiKeys,
    isLoading,
    isCreating,
    isDeleting,
    issuedKey,
    loadApiKeys,
    createApiKey,
    deleteApiKey,
    clearIssuedKey,
  };
}
