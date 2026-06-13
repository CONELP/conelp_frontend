import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import { superDocumentApi } from "@/features/system-admin/services/super-document.api";

// gs:// 사진을 downloadPhoto 프록시로 받아 objectURL 로 표시. URL 변경/unmount 시 revoke.
export function useProxyImage(
  gsUrl: MaybeRefOrGetter<string | null | undefined>,
  projectId?: MaybeRefOrGetter<string | undefined>,
) {
  const objectUrl = ref<string | null>(null);
  const isLoading = ref(false);
  const hasError = ref(false);

  // 진행 중 요청이 늦게 도착해 새 URL 을 덮어쓰지 않도록 토큰으로 순서 보장.
  let requestToken = 0;

  function revoke() {
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value);
      objectUrl.value = null;
    }
  }

  async function load() {
    const url = toValue(gsUrl);
    const token = ++requestToken;

    revoke();
    hasError.value = false;

    if (!url) {
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    try {
      const blob = await superDocumentApi.downloadPhotoBlob(url, toValue(projectId));
      if (token !== requestToken) return; // 더 최신 요청이 시작됨 → 폐기
      objectUrl.value = URL.createObjectURL(blob);
    } catch (error) {
      if (token !== requestToken) return;
      console.error("사진 로드 실패:", error);
      hasError.value = true;
    } finally {
      if (token === requestToken) isLoading.value = false;
    }
  }

  watch(() => toValue(gsUrl), load, { immediate: true });

  onUnmounted(() => {
    requestToken++;
    revoke();
  });

  return { objectUrl, isLoading, hasError };
}
