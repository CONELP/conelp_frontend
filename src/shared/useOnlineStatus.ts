import { onMounted, onUnmounted, ref } from "vue";

/**
 * 브라우저 온라인/오프라인 상태를 추적한다.
 * navigator.onLine 은 네트워크 인터페이스 여부만 보고 실제 연결 품질을 보장하지 않으므로,
 * "오프라인 안내 배너" 표시 용도로만 사용한다.
 */
export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine);

  const update = () => {
    isOnline.value = navigator.onLine;
  };

  onMounted(() => {
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
  });

  onUnmounted(() => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  });

  return { isOnline };
}
