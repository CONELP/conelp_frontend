import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type {
  CatAnalysisResponse,
  CreateCatDocumentRequest,
  CreateMirDocumentRequest,
  MirAnalysisResponse,
} from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

const LOADING_TEXT_TOTAL_DURATION_MS = 6000;
const LOADING_TEXT_FIRST_TRANSITION_MS = Math.round(
  LOADING_TEXT_TOTAL_DURATION_MS / 3,
);
const LOADING_TEXT_SECOND_TRANSITION_MS = Math.round(
  (LOADING_TEXT_TOTAL_DURATION_MS * 2) / 3,
);

function createEvenLoadingStepTransitions(stepCount: number) {
  return Array.from({ length: Math.max(stepCount - 1, 0) }, (_, index) => ({
    delayMs: Math.round((LOADING_TEXT_TOTAL_DURATION_MS * (index + 1)) / stepCount),
    stepIndex: index + 1,
  }));
}

const EVEN_LOADING_STEP_TRANSITIONS = [
  { delayMs: LOADING_TEXT_FIRST_TRANSITION_MS, stepIndex: 1 },
  { delayMs: LOADING_TEXT_SECOND_TRANSITION_MS, stepIndex: 2 },
] as const;

const DAILY_REPORT_LOADING_STEPS = [
  "홈페이지 공사일보를 추출하고 있어요.",
  "문서 양식을 준비 중이에요.",
  "문서를 생성하고 있어요.",
] as const;

const DAILY_REPORT_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const MIR_ANALYSIS_LOADING_STEPS = [
  "업로드한 이미지를 정리하고 있어요.",
  "송장과 자재 반입 사진을 분류하고 있어요.",
  "공급처, 반입일, 사용 위치를 확인하고 있어요.",
  "자재명, 규격, 수량을 문서 양식에 맞추고 있어요.",
  "자재 반입 검수요청서 결과 파일을 준비하고 있어요.",
] as const;

const MIR_ANALYSIS_STEP_TRANSITIONS = createEvenLoadingStepTransitions(
  MIR_ANALYSIS_LOADING_STEPS.length,
);

const MIR_CREATE_LOADING_STEPS = [
  "검토한 자재 반입 정보를 정리하고 있어요.",
  "수정한 자재명, 규격, 수량을 반영하고 있어요.",
  "검수요청서 양식에 반입 정보를 배치하고 있어요.",
  "첨부 사진과 송장 정보를 문서와 연결하고 있어요.",
  "자재 반입 검수요청서를 생성하고 있어요.",
] as const;

const MIR_CREATE_STEP_TRANSITIONS = createEvenLoadingStepTransitions(
  MIR_CREATE_LOADING_STEPS.length,
);

const CAT_ANALYSIS_LOADING_STEPS = [
  "업로드한 콘크리트 시험 사진을 정리하고 있어요.",
  "회차별 슬럼프, 보드판, 공기량 사진을 확인하고 있어요.",
  "온도, 염화물, 함수율 사진을 시험 항목과 연결하고 있어요.",
  "콘크리트 반입시험 양식에 회차별 정보를 배치하고 있어요.",
  "콘크리트 반입시험 결과 파일을 준비하고 있어요.",
] as const;

const CAT_ANALYSIS_STEP_TRANSITIONS = createEvenLoadingStepTransitions(
  CAT_ANALYSIS_LOADING_STEPS.length,
);

const CAT_CREATE_LOADING_STEPS = [
  "검토한 콘크리트 반입시험 정보를 정리하고 있어요.",
  "배치 시험값과 사진 데이터를 저장하고 있어요.",
  "콘크리트 반입시험 문서를 렌더링하고 있어요.",
] as const;

const CAT_CREATE_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const RESULT_ROUTE = "/preview/result";
const OCR_VALIDATION_ROUTE = "/preview/upload-feedback";
const DIRECT_DOCUMENT_BACK_ROUTE = "/preview/documents";
const UPLOAD_DOCUMENT_ROUTE = "/preview/upload";
const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

function waitForMinimumLoadingDuration(startedAt: number) {
  const remainingMs = LOADING_TEXT_TOTAL_DURATION_MS - (Date.now() - startedAt);

  if (remainingMs <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, remainingMs);
  });
}

export function useConversionLoadingDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const router = useRouter();
  const route = useRoute();
  const { recordSelectedSiteDocumentGeneration } =
    useServicePresentationDemoViewModel();

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const loadingStepIndex = ref(0);
  const loadingErrorMessage = ref("");
  const loadingStepTimers: ReturnType<typeof setTimeout>[] = [];
  let loadingRunId = 0;

  const isMirCreateLoading = computed(
    () => route.query.phase === "mir-create",
  );
  const isCatCreateLoading = computed(
    () => route.query.phase === "cat-create",
  );
  const isDocumentCreateLoading = computed(
    () => isMirCreateLoading.value || isCatCreateLoading.value,
  );

  const loadingBackRoute = computed(() =>
    (selectedDocument.value.type === "material_registration" && isMirCreateLoading.value) ||
    (selectedDocument.value.type === "concrete_delivery_csi" && isCatCreateLoading.value)
      ? OCR_VALIDATION_ROUTE
      : selectedDocument.value.generationMode === "upload_required"
      ? UPLOAD_DOCUMENT_ROUTE
      : selectedDocument.value.generationMode === "direct"
        ? DIRECT_DOCUMENT_BACK_ROUTE
        : UPLOAD_DOCUMENT_ROUTE,
  );

  const baseLoadingDescription = computed(() => {
    if (selectedDocument.value.type === "daily_report") {
      return DAILY_REPORT_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "material_registration") {
      return isMirCreateLoading.value
        ? MIR_CREATE_LOADING_STEPS[loadingStepIndex.value]
        : MIR_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "concrete_delivery_csi") {
      return isCatCreateLoading.value
        ? CAT_CREATE_LOADING_STEPS[loadingStepIndex.value]
        : CAT_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    return selectedDocument.value.generationMode === "direct"
      ? "기본 항목과 문서 형식을 준비하고 있어요."
      : "이미지에서 텍스트를 읽고 있어요.";
  });

  const loadingDestinationRoute = computed(() => RESULT_ROUTE);

  function clearLoadingStepTimers() {
    loadingStepTimers.forEach((timer) => clearTimeout(timer));
    loadingStepTimers.length = 0;
  }

  function createDocumentRouteLocation(path: string) {
    const routeDocumentType = route.query.documentType;
    const documentType =
      typeof routeDocumentType === "string" && isDocumentCatalogType(routeDocumentType)
        ? routeDocumentType
        : store.selectedDocument?.type;

    return documentType
      ? {
          path,
          query: { documentType },
        }
      : path;
  }

  function resolveCurrentDocumentType() {
    const routeDocumentType = route.query.documentType;

    return typeof routeDocumentType === "string" &&
      isDocumentCatalogType(routeDocumentType)
      ? routeDocumentType
      : store.selectedDocument?.type ?? selectedDocument.value.type;
  }

  function recordResultGeneration() {
    recordSelectedSiteDocumentGeneration(resolveCurrentDocumentType());
  }

  function replaceRoute(path: string) {
    if (path === RESULT_ROUTE) {
      recordResultGeneration();
    }

    void router.replace(createDocumentRouteLocation(path));
  }

  function scheduleRouteNavigation(path: string, delayMs: number) {
    loadingStepTimers.push(
      setTimeout(() => {
        replaceRoute(path);
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

    scheduleRouteNavigation(loadingDestinationRoute.value, LOADING_TEXT_TOTAL_DURATION_MS);
  }

  function resolveMirAnalysisValidationMessage() {
    if (!store.mirUploadApplication.trim()) {
      return "사용 위치를 입력해 주세요.";
    }

    if (!store.mirUploadWorkTypeName.trim()) {
      return "공종 이름을 입력해 주세요.";
    }

    if (store.uploadedImageFiles.length === 0) {
      return "이미지를 1장 이상 업로드해 주세요.";
    }

    return "";
  }

  function resolveCatAnalysisValidationMessage() {
    if (!store.mirUploadApplication.trim()) {
      return "사용 위치를 입력해 주세요.";
    }

    if (!store.mirUploadWorkTypeName.trim()) {
      return "공종 이름을 입력해 주세요.";
    }

    if (store.uploadedImageFiles.length < CAT_MIN_IMAGE_UPLOAD_COUNT) {
      return "콘크리트 반입시험 사진을 2장 이상 업로드해 주세요.";
    }

    return "";
  }

  function toCreateMirDocumentRequest(
    result: MirAnalysisResponse,
  ): CreateMirDocumentRequest {
    return {
      application: result.application,
      supplier: result.supplier,
      deliveryDate: result.deliveryDate,
      workTypeId: result.workTypeId,
      lines: result.lines.map((line) => ({
        manufacturer: line.manufacturer ?? "",
        materialSpecId: line.materialSpecId,
        quantity: line.quantity === null ? "" : String(line.quantity),
      })),
      photos: result.photos.map((photo) => ({
        photoKey: photo.photoKey,
        type: photo.type,
        description: photo.description,
      })),
    };
  }

  function toCreateCatDocumentRequest(
    result: CatAnalysisResponse,
  ): CreateCatDocumentRequest {
    return {
      ...toCreateMirDocumentRequest(result),
      batches: result.batches.map((batch) => ({
        batch: String(batch.batch),
        lineData: {
          slump: batch.lineData.slump === null ? null : String(batch.lineData.slump),
          air: batch.lineData.air === null ? "" : String(batch.lineData.air),
          temp: batch.lineData.temp === null ? "" : String(batch.lineData.temp),
          chloride:
            batch.lineData.chloride === null ? "" : String(batch.lineData.chloride),
          water: batch.lineData.water === null ? "" : String(batch.lineData.water),
        },
        photos: batch.photos.map((photo) => ({
          photoKey: photo.photoKey,
          type: photo.type,
          description: photo.description,
        })),
      })),
    };
  }

  async function startMirAnalysisLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    const currentRunId = ++loadingRunId;
    const startedAt = Date.now();
    const validationMessage = resolveMirAnalysisValidationMessage();

    if (validationMessage) {
      store.setMirAnalysisErrorMessage(validationMessage);
      loadingErrorMessage.value = "입력값을 확인하고 업로드 화면으로 돌아갑니다.";
      scheduleRouteNavigation(UPLOAD_DOCUMENT_ROUTE, 1400);
      return;
    }

    MIR_ANALYSIS_STEP_TRANSITIONS.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });

    await waitForMinimumLoadingDuration(startedAt);

    if (currentRunId !== loadingRunId) {
      return;
    }

    replaceRoute(RESULT_ROUTE);
  }

  async function startCatAnalysisLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    const currentRunId = ++loadingRunId;
    const startedAt = Date.now();
    const validationMessage = resolveCatAnalysisValidationMessage();

    if (validationMessage) {
      store.setMirAnalysisErrorMessage(validationMessage);
      loadingErrorMessage.value = "입력값을 확인하고 업로드 화면으로 돌아갑니다.";
      scheduleRouteNavigation(UPLOAD_DOCUMENT_ROUTE, 1400);
      return;
    }

    CAT_ANALYSIS_STEP_TRANSITIONS.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });

    await waitForMinimumLoadingDuration(startedAt);

    if (currentRunId !== loadingRunId) {
      return;
    }

    replaceRoute(RESULT_ROUTE);
  }

  async function startMirCreateLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    const currentRunId = ++loadingRunId;
    const startedAt = Date.now();
    const draft = store.mirDocumentSubmissionDraft;

    if (!draft) {
      loadingErrorMessage.value = "생성할 문서 데이터가 없어 검토 화면으로 돌아갑니다.";
      scheduleRouteNavigation(OCR_VALIDATION_ROUTE, 1400);
      return;
    }

    MIR_CREATE_STEP_TRANSITIONS.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });

    try {
      let createRequest = draft.createRequest;

      if (draft.updateRequest) {
        const updateResult = await materialInspectionRequestApi.updateMirData(
          draft.updateRequest,
        );

        if (currentRunId !== loadingRunId) {
          return;
        }

        store.saveMirAnalysisResult(updateResult);
        createRequest = toCreateMirDocumentRequest(updateResult);
      }

      if (!createRequest) {
        throw new Error("생성할 문서 데이터가 없습니다.");
      }

      const createResult =
        await materialInspectionRequestApi.createMirDocument(createRequest);

      if (currentRunId !== loadingRunId) {
        return;
      }

      await waitForMinimumLoadingDuration(startedAt);

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveMirCreateResult(createResult);
      replaceRoute(RESULT_ROUTE);
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      loadingErrorMessage.value =
        error instanceof Error
          ? error.message
          : "자재 반입 검수요청서 생성에 실패했습니다.";
      store.clearMirDocumentSubmissionDraft();
      clearLoadingStepTimers();
      scheduleRouteNavigation(OCR_VALIDATION_ROUTE, 2200);
    }
  }

  async function startCatCreateLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    const currentRunId = ++loadingRunId;
    const draft = store.catDocumentSubmissionDraft;

    if (!draft) {
      loadingErrorMessage.value = "생성할 문서 데이터가 없어 검토 화면으로 돌아갑니다.";
      scheduleRouteNavigation(OCR_VALIDATION_ROUTE, 1400);
      return;
    }

    CAT_CREATE_STEP_TRANSITIONS.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });

    try {
      let createRequest = draft.createRequest;

      if (draft.updateRequest) {
        const updateResult = await materialInspectionRequestApi.updateCatData(
          draft.updateRequest,
        );

        if (currentRunId !== loadingRunId) {
          return;
        }

        store.saveCatAnalysisResult(updateResult);
        createRequest = toCreateCatDocumentRequest(updateResult);
      }

      if (!createRequest) {
        throw new Error("생성할 문서 데이터가 없습니다.");
      }

      const createResult =
        await materialInspectionRequestApi.createCatDocument(createRequest);

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveCatCreateResult(createResult);
      replaceRoute(RESULT_ROUTE);
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      loadingErrorMessage.value =
        error instanceof Error
          ? error.message
          : "콘크리트 반입시험 문서 생성에 실패했습니다.";
      store.clearCatDocumentSubmissionDraft();
      clearLoadingStepTimers();
      scheduleRouteNavigation(OCR_VALIDATION_ROUTE, 2200);
    }
  }

  watch(
    () => route.query.documentType,
    (documentType) => {
      if (
        typeof documentType === "string" &&
        isDocumentCatalogType(documentType) &&
        store.selectedDocumentType !== documentType
      ) {
        store.selectDocument(documentType);
      }
    },
    { immediate: true },
  );

  watch(
    () => selectedDocument.value.type,
    (documentType) => {
      if (documentType === "daily_report") {
        startDailyReportLoadingSequence();
        return;
      }

      if (documentType === "material_registration") {
        if (isMirCreateLoading.value) {
          void startMirCreateLoadingSequence();
          return;
        }

        void startMirAnalysisLoadingSequence();
        return;
      }

      if (documentType === "concrete_delivery_csi") {
        if (isCatCreateLoading.value) {
          void startCatCreateLoadingSequence();
          return;
        }

        void startCatAnalysisLoadingSequence();
        return;
      }

      clearLoadingStepTimers();
      loadingStepIndex.value = 0;
      scheduleRouteNavigation(loadingDestinationRoute.value, LOADING_TEXT_TOTAL_DURATION_MS);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    loadingRunId += 1;
    clearLoadingStepTimers();
  });

  return {
    loadingBackRoute,
    loadingDescription: computed(
      () => loadingErrorMessage.value || baseLoadingDescription.value,
    ),
    isMirCreateLoading,
    isCatCreateLoading,
    isDocumentCreateLoading,
    selectedDocument,
  };
}
