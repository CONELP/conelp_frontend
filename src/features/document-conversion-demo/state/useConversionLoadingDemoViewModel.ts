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
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

const LOADING_TEXT_TOTAL_DURATION_MS = 5000;
const LOADING_TEXT_FIRST_TRANSITION_MS = Math.round(
  LOADING_TEXT_TOTAL_DURATION_MS / 3,
);
const LOADING_TEXT_SECOND_TRANSITION_MS = Math.round(
  (LOADING_TEXT_TOTAL_DURATION_MS * 2) / 3,
);
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
  "송장, 밀시트, 태그 내용을 분석하고 있어요.",
  "검토 화면에 들어갈 항목을 준비하고 있어요.",
] as const;

const MIR_ANALYSIS_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const MIR_CREATE_LOADING_STEPS = [
  "검토한 자재 반입 정보를 정리하고 있어요.",
  "문서 생성에 필요한 데이터를 저장하고 있어요.",
  "자재 반입 검수요청서를 렌더링하고 있어요.",
] as const;

const MIR_CREATE_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const CAT_ANALYSIS_LOADING_STEPS = [
  "송장과 콘크리트 시험사진을 정리하고 있어요.",
  "배치별 슬럼프, 공기량, 온도 값을 분석하고 있어요.",
  "콘크리트 반입시험 검토 화면을 준비하고 있어요.",
] as const;

const CAT_ANALYSIS_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

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
const MIR_IMAGE_UPLOAD_LIMIT = 10;
const CAT_IMAGE_UPLOAD_LIMIT = 10;
const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

export function useConversionLoadingDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const router = useRouter();
  const route = useRoute();

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

  const loadingDestinationRoute = computed(() =>
    selectedDocument.value.type === "material_registration" ||
    selectedDocument.value.type === "concrete_delivery_csi"
      ? OCR_VALIDATION_ROUTE
      : RESULT_ROUTE,
  );

  function clearLoadingStepTimers() {
    loadingStepTimers.forEach((timer) => clearTimeout(timer));
    loadingStepTimers.length = 0;
  }

  function scheduleRouteNavigation(route: string, delayMs: number) {
    loadingStepTimers.push(
      setTimeout(() => {
        void router.replace(route);
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

    if (store.uploadedImageFiles.length > MIR_IMAGE_UPLOAD_LIMIT) {
      return "이미지는 최대 10장까지 업로드할 수 있어요.";
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
      return "송장 사진과 시험 사진을 각각 1장 이상 업로드해 주세요.";
    }

    if (store.uploadedImageFiles.length > CAT_IMAGE_UPLOAD_LIMIT) {
      return "이미지는 최대 10장까지 업로드할 수 있어요.";
    }

    return "";
  }

  function toCreateMirDocumentRequest(
    result: MirAnalysisResponse,
    active: boolean,
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
      active,
    };
  }

  function toCreateCatDocumentRequest(
    result: CatAnalysisResponse,
    active: boolean,
  ): CreateCatDocumentRequest {
    return {
      ...toCreateMirDocumentRequest(result, active),
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

    try {
      const result = await materialInspectionRequestApi.analyzeMirPhoto({
        application: store.mirUploadApplication,
        workTypeId: store.mirUploadWorkTypeId,
        images: store.uploadedImageFiles.map((entry) => entry.file),
      });

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveMirAnalysisResult(result);
      void router.replace(OCR_VALIDATION_ROUTE);
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "자재 반입 검수요청 자료 분석에 실패했습니다.";

      store.setMirAnalysisErrorMessage(errorMessage);
      loadingErrorMessage.value = "분석에 실패했어요. 업로드 화면으로 돌아갑니다.";
      clearLoadingStepTimers();
      scheduleRouteNavigation(UPLOAD_DOCUMENT_ROUTE, 1800);
    }
  }

  async function startCatAnalysisLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    const currentRunId = ++loadingRunId;
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

    const [deliveryNoteEntry, ...batchPhotoEntries] = store.uploadedImageFiles;

    try {
      const result = await materialInspectionRequestApi.analyzeCatPhoto({
        application: store.mirUploadApplication,
        workTypeId: store.mirUploadWorkTypeId,
        deliveryNote: deliveryNoteEntry ? [deliveryNoteEntry.file] : [],
        metadata: [{ batch: 1, count: batchPhotoEntries.length }],
        batchPhotos: batchPhotoEntries.map((entry) => entry.file),
      });

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveCatAnalysisResult(result);
      void router.replace(OCR_VALIDATION_ROUTE);
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "콘크리트 반입시험 자료 분석에 실패했습니다.";

      store.setMirAnalysisErrorMessage(errorMessage);
      loadingErrorMessage.value = "분석에 실패했어요. 업로드 화면으로 돌아갑니다.";
      clearLoadingStepTimers();
      scheduleRouteNavigation(UPLOAD_DOCUMENT_ROUTE, 1800);
    }
  }

  async function startMirCreateLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    const currentRunId = ++loadingRunId;
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
        createRequest = toCreateMirDocumentRequest(updateResult, draft.active);
      }

      if (!createRequest) {
        throw new Error("생성할 문서 데이터가 없습니다.");
      }

      const createResult =
        await materialInspectionRequestApi.createMirDocument(createRequest);

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveMirCreateResult(createResult);
      void router.replace(RESULT_ROUTE);
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
        createRequest = toCreateCatDocumentRequest(updateResult, draft.active);
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
      void router.replace(RESULT_ROUTE);
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
