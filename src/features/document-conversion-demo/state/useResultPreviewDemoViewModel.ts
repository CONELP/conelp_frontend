import { computed } from "vue";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

const DEFAULT_REVIEW_ITEMS = [
  "내일 작업 내용이 없어요.",
  "오늘 작업 사진이 등록되지 않았어요.",
];

function formatResultFileName(label: string, date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} ${label}.pdf`;
}

export function useResultPreviewDemoViewModel() {
  const store = useDocumentConversionDemoStore();

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const resultFileName = computed(() =>
    formatResultFileName(selectedDocument.value.label, new Date()),
  );

  const isMaterialRegistrationResult = computed(
    () => selectedDocument.value.type === "material_registration",
  );

  return {
    isMaterialRegistrationResult,
    resultFileName,
    reviewItems: DEFAULT_REVIEW_ITEMS,
  };
}
