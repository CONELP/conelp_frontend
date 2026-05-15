import { onMounted, ref } from "vue";

const SELECTED_PROJECT_ID_STORAGE_KEY = "selectedProjectId";

function read(): string | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(SELECTED_PROJECT_ID_STORAGE_KEY);
  if (!v || v === "undefined" || v === "null") return null;
  return v;
}

export function useSelectedProjectId() {
  const selectedProjectId = ref<string | null>(null);

  function refresh() {
    selectedProjectId.value = read();
  }

  onMounted(refresh);

  return { selectedProjectId, refresh };
}
