import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

const DAILY_REPORT_LOADING_STEPS = [
  "홈페이지 공사일보를 추출하고 있어요.",
  "문서 양식을 준비 중이에요.",
  "문서를 생성하고 있어요.",
] as const;

const DAILY_REPORT_STEP_TRANSITIONS = [
  { delayMs: 1400, stepIndex: 1 },
  { delayMs: 2800, stepIndex: 2 },
] as const;

const RESULT_ROUTE = "/preview/result";
const OCR_VALIDATION_ROUTE = "/preview/upload-feedback";
const DIRECT_DOCUMENT_BACK_ROUTE = "/preview/documents";
const UPLOAD_DOCUMENT_BACK_ROUTE = "/preview/upload-feedback";
const UPLOAD_DOCUMENT_ROUTE = "/preview/upload";

export function useConversionLoadingDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const router = useRouter();

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const loadingStepIndex = ref(0);
  const loadingStepTimers: ReturnType<typeof setTimeout>[] = [];

  const loadingBackRoute = computed(() =>
    selectedDocument.value.type === "material_registration"
      ? UPLOAD_DOCUMENT_ROUTE
      : selectedDocument.value.generationMode === "direct"
        ? DIRECT_DOCUMENT_BACK_ROUTE
        : UPLOAD_DOCUMENT_BACK_ROUTE,
  );

  const loadingDescription = computed(() => {
    if (selectedDocument.value.type === "daily_report") {
      return DAILY_REPORT_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "material_registration") {
      return "업로드한 이미지에서 텍스트를 추출하고 있어요.";
    }

    return selectedDocument.value.generationMode === "direct"
      ? "기본 항목과 문서 형식을 준비하고 있어요."
      : "이미지에서 텍스트를 읽고 있어요.";
  });

  const loadingDestinationRoute = computed(() =>
    selectedDocument.value.type === "material_registration"
      ? OCR_VALIDATION_ROUTE
      : RESULT_ROUTE,
  );

  function clearLoadingStepTimers() {
    loadingStepTimers.forEach((timer) => clearTimeout(timer));
    loadingStepTimers.length = 0;
  }

  function scheduleResultNavigation(delayMs: number) {
    loadingStepTimers.push(
      setTimeout(() => {
        void router.replace(loadingDestinationRoute.value);
      }, delayMs),
    );
  }

  function startDailyReportLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;

    DAILY_REPORT_STEP_TRANSITIONS.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });

    scheduleResultNavigation(4200);
  }

  watch(
    () => selectedDocument.value.type,
    (documentType) => {
      if (documentType === "daily_report") {
        startDailyReportLoadingSequence();
        return;
      }

      clearLoadingStepTimers();
      loadingStepIndex.value = 0;
      scheduleResultNavigation(3200);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    clearLoadingStepTimers();
  });

  return {
    loadingBackRoute,
    loadingDescription,
    selectedDocument,
  };
}
