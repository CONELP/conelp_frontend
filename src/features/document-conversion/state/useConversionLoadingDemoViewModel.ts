import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import type {
  CatAnalysisResponse,
  CreateCatDocumentRequest,
  CreateMirDocumentRequest,
  MirAnalysisResponse,
} from "@/features/document-conversion/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

const LOADING_TEXT_STEP_DURATION_MS = 1500;
const LOADING_TEXT_TOTAL_DURATION_MS = LOADING_TEXT_STEP_DURATION_MS * 3;
const LOADING_TEXT_FIRST_TRANSITION_MS = LOADING_TEXT_STEP_DURATION_MS;
const LOADING_TEXT_SECOND_TRANSITION_MS = LOADING_TEXT_STEP_DURATION_MS * 2;
const EVEN_LOADING_STEP_TRANSITIONS = [
  { delayMs: LOADING_TEXT_FIRST_TRANSITION_MS, stepIndex: 1 },
  { delayMs: LOADING_TEXT_SECOND_TRANSITION_MS, stepIndex: 2 },
] as const;

const MIR_ANALYSIS_LOADING_STEPS = [
  "업로드한 반입 사진을 분류하고 흐릿한 영역을 보정하고 있어요.",
  "송장, 밀시트, 태그에서 자재명과 규격, 수량 정보를 읽고 있어요.",
  "검수요청서에 들어갈 반입 정보와 사진 근거를 맞춰보고 있어요.",
] as const;

const MIR_ANALYSIS_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const MIR_CREATE_LOADING_STEPS = [
  "검토한 자재명, 규격, 수량과 사용 위치를 문서 항목에 맞추고 있어요.",
  "반입 사진과 검수 데이터를 저장하고 요청서 생성 작업을 준비하고 있어요.",
  "자재 반입 검수요청서 서식에 값을 채워 최종 문서를 만들고 있어요.",
] as const;

const MIR_CREATE_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const CAT_ANALYSIS_LOADING_STEPS = [
  "송장 사진과 시험 사진을 구분하고 배치 번호별로 묶고 있어요.",
  "슬럼프, 공기량, 염화물량, 온도 같은 시험값을 읽고 있어요.",
  "검토 화면에서 확인할 반입 정보와 시험 결과를 정리하고 있어요.",
] as const;

const CAT_ANALYSIS_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const CAT_CREATE_LOADING_STEPS = [
  "검토한 배치별 반입 정보와 시험값을 문서 항목에 맞추고 있어요.",
  "송장, 시험 사진, 배치별 측정값을 저장하고 생성 작업을 준비하고 있어요.",
  "콘크리트 반입시험 서식에 값을 채워 최종 문서를 만들고 있어요.",
] as const;

const CAT_CREATE_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const CONCRETE_STRENGTH_LOADING_STEPS = [
  "업로드한 압축강도 시험 사진을 로트와 공시체 기준으로 정리하고 있어요.",
  "7일, 28일 강도값과 판정 정보를 구분해서 문서 항목에 맞추고 있어요.",
  "콘크리트 압축강도 시험 서식에 값을 채워 최종 문서를 만들고 있어요.",
] as const;

const CONCRETE_STRENGTH_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const RESULT_ROUTE = "/documents/result";
const OCR_VALIDATION_ROUTE = "/documents/upload/review";
const DIRECT_DOCUMENT_BACK_ROUTE = "/documents";
const UPLOAD_DOCUMENT_ROUTE = "/documents/upload";
const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

export function useConversionLoadingDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const router = useRouter();
  const route = useRoute();

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const loadingStepIndex = ref(0);
  const loadingErrorMessage = ref("");
  const mirGenerationStage = ref<"analysis" | "create">("analysis");
  const loadingStepTimers: ReturnType<typeof setTimeout>[] = [];
  let loadingRunId = 0;

  const isMirCreateLoading = computed(
    () => route.query.phase === "mir-create",
  );
  const isCatCreateLoading = computed(
    () => route.query.phase === "cat-create",
  );
  const isDirectMirGenerationLoading = computed(
    () =>
      selectedDocument.value.type === "material_registration" &&
      !isMirCreateLoading.value,
  );
  const isDocumentCreateLoading = computed(
    () =>
      isMirCreateLoading.value ||
      isCatCreateLoading.value ||
      isDirectMirGenerationLoading.value,
  );

  function toDocumentRoute(path: string, query: Record<string, string> = {}): RouteLocationRaw {
    return {
      path,
      query: {
        documentType: selectedDocument.value.type,
        ...query,
      },
    };
  }

  function trackDocumentAction(
    action: string,
    result: "success" | "fail" | "attempt",
    meta: Record<string, unknown> = {},
  ) {
    analyticsClient.trackAction("document", action, result, {
      document_type: selectedDocument.value.type,
      ...meta,
    });
  }

  const loadingBackRoute = computed<RouteLocationRaw>(() => {
    const path =
      selectedDocument.value.type === "concrete_delivery_csi" && isCatCreateLoading.value
        ? OCR_VALIDATION_ROUTE
        : selectedDocument.value.generationMode === "upload_required"
        ? UPLOAD_DOCUMENT_ROUTE
        : selectedDocument.value.generationMode === "direct"
          ? DIRECT_DOCUMENT_BACK_ROUTE
          : UPLOAD_DOCUMENT_ROUTE;

    return toDocumentRoute(path);
  });

  const baseLoadingDescription = computed(() => {
    if (selectedDocument.value.type === "material_registration") {
      return isMirCreateLoading.value || mirGenerationStage.value === "create"
        ? MIR_CREATE_LOADING_STEPS[loadingStepIndex.value]
        : MIR_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "concrete_delivery_csi") {
      return isCatCreateLoading.value
        ? CAT_CREATE_LOADING_STEPS[loadingStepIndex.value]
        : CAT_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "concrete_strength_csi") {
      return CONCRETE_STRENGTH_LOADING_STEPS[loadingStepIndex.value];
    }

    return selectedDocument.value.generationMode === "direct"
      ? "기본 항목과 문서 형식을 준비하고 있어요."
      : "이미지에서 텍스트를 읽고 있어요.";
  });

  const loadingDestinationPath = computed(() =>
    selectedDocument.value.type === "concrete_delivery_csi"
      ? OCR_VALIDATION_ROUTE
      : RESULT_ROUTE,
  );

  function clearLoadingStepTimers() {
    loadingStepTimers.forEach((timer) => clearTimeout(timer));
    loadingStepTimers.length = 0;
  }

  function scheduleLoadingStepTransitions(
    transitions: ReadonlyArray<{ delayMs: number; stepIndex: number }>,
  ) {
    transitions.forEach(({ delayMs, stepIndex }) => {
      loadingStepTimers.push(
        setTimeout(() => {
          loadingStepIndex.value = stepIndex;
        }, delayMs),
      );
    });
  }

  function scheduleRouteNavigation(route: RouteLocationRaw, delayMs: number) {
    loadingStepTimers.push(
      setTimeout(() => {
        void router.replace(route);
      }, delayMs),
    );
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
      return "송장 사진과 시험 사진을 각각 1장 이상 업로드해 주세요.";
    }

    return "";
  }

  function createCatAnalysisUploadPayload() {
    const fileEntryById = new Map(
      store.uploadedImageFiles.map((entry) => [entry.id, entry]),
    );
    const groupedBatches = store.concreteDeliveryUploadBatches
      .map((batch) => ({
        id: batch.id,
        entries: batch.fileIds
          .map((fileId) => fileEntryById.get(fileId))
          .filter((entry): entry is (typeof store.uploadedImageFiles)[number] =>
            Boolean(entry),
          ),
      }))
      .filter((batch) => batch.entries.length > 0);

    if (groupedBatches.length === 0) {
      const [deliveryNoteEntry, ...batchPhotoEntries] = store.uploadedImageFiles;

      return {
        deliveryNote: deliveryNoteEntry ? [deliveryNoteEntry.file] : [],
        metadata: [{ batch: 1, count: batchPhotoEntries.length }],
        batchPhotos: batchPhotoEntries.map((entry) => entry.file),
      };
    }

    const deliveryNote = groupedBatches
      .map((batch) => batch.entries[0]?.file)
      .filter((file): file is File => Boolean(file));
    const metadata = groupedBatches.map((batch, index) => ({
      batch: index + 1,
      count: Math.max(batch.entries.length - 1, 0),
    }));
    const batchPhotos = groupedBatches.flatMap((batch) =>
      batch.entries.slice(1).map((entry) => entry.file),
    );

    return {
      deliveryNote,
      metadata,
      batchPhotos,
    };
  }

  function toCreateMirDocumentRequest(result: MirAnalysisResponse): CreateMirDocumentRequest {
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

  function toCreateCatDocumentRequest(result: CatAnalysisResponse): CreateCatDocumentRequest {
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

  async function startMirGenerationLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    mirGenerationStage.value = "analysis";
    store.setMirAnalysisErrorMessage("");

    const currentRunId = ++loadingRunId;
    const validationMessage = resolveMirAnalysisValidationMessage();

    if (validationMessage) {
      store.setMirAnalysisErrorMessage(validationMessage);
      loadingErrorMessage.value = "입력값을 확인하고 업로드 화면으로 돌아갑니다.";
      trackDocumentAction("analyze", "fail", {
        error_kind: "validation",
        file_count: store.uploadedImageFiles.length,
      });
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1400);
      return;
    }

    scheduleLoadingStepTransitions(MIR_ANALYSIS_STEP_TRANSITIONS);

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
      trackDocumentAction("analyze", "success", {
        file_count: store.uploadedImageFiles.length,
      });

      clearLoadingStepTimers();
      loadingStepIndex.value = 0;
      mirGenerationStage.value = "create";
      scheduleLoadingStepTransitions(MIR_CREATE_STEP_TRANSITIONS);

      const createResult = await materialInspectionRequestApi.createMirDocument(
        toCreateMirDocumentRequest(result),
      );

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveMirCreateResult(createResult);
      trackDocumentAction("create_document", "success", {
        direct_generation: true,
      });
      void router.replace(
        toDocumentRoute(RESULT_ROUTE, { jobId: String(createResult.jobId) }),
      );
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      const fallbackErrorMessage =
        mirGenerationStage.value === "create"
          ? "자재 반입 검수요청서 생성에 실패했습니다."
          : "자재 반입 검수요청 자료 분석에 실패했습니다.";
      const errorMessage =
        error instanceof Error
          ? error.message
          : fallbackErrorMessage;

      store.setMirAnalysisErrorMessage(errorMessage);
      loadingErrorMessage.value =
        mirGenerationStage.value === "create"
          ? "생성에 실패했어요. 업로드 화면으로 돌아갑니다."
          : "분석에 실패했어요. 업로드 화면으로 돌아갑니다.";
      clearLoadingStepTimers();
      const failedFileCount = store.uploadedImageFiles.length;
      trackDocumentAction(
        mirGenerationStage.value === "create" ? "create_document" : "analyze",
        "fail",
        {
          error_kind: "api",
          file_count: failedFileCount,
          direct_generation: true,
        },
      );
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1800);
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
      trackDocumentAction("analyze", "fail", {
        error_kind: "validation",
        file_count: store.uploadedImageFiles.length,
      });
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1400);
      return;
    }

    scheduleLoadingStepTransitions(CAT_ANALYSIS_STEP_TRANSITIONS);

    const uploadPayload = createCatAnalysisUploadPayload();

    try {
      const result = await materialInspectionRequestApi.analyzeCatPhoto({
        application: store.mirUploadApplication,
        workTypeId: store.mirUploadWorkTypeId,
        deliveryNote: uploadPayload.deliveryNote,
        metadata: uploadPayload.metadata,
        batchPhotos: uploadPayload.batchPhotos,
      });

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveCatAnalysisResult(result);
      trackDocumentAction("analyze", "success", {
        file_count: store.uploadedImageFiles.length,
      });
      void router.replace(toDocumentRoute(OCR_VALIDATION_ROUTE));
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
      const failedFileCount = store.uploadedImageFiles.length;
      trackDocumentAction("analyze", "fail", {
        error_kind: "api",
        file_count: failedFileCount,
      });
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1800);
    }
  }

  function startConcreteStrengthLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    scheduleLoadingStepTransitions(CONCRETE_STRENGTH_STEP_TRANSITIONS);

    trackDocumentAction("create_document", "success", {
      file_count: store.uploadedImageFiles.length,
      simulated: true,
    });
    scheduleRouteNavigation(
      toDocumentRoute(loadingDestinationPath.value),
      LOADING_TEXT_TOTAL_DURATION_MS,
    );
  }

  async function startMirCreateLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    const currentRunId = ++loadingRunId;
    const draft = store.mirDocumentSubmissionDraft;

    if (!draft) {
      const errorMessage = "생성할 문서 데이터가 없어 업로드 화면으로 돌아갑니다.";

      loadingErrorMessage.value = errorMessage;
      trackDocumentAction("create_document", "fail", {
        error_kind: "missing_draft",
      });
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1400);
      return;
    }

    mirGenerationStage.value = "create";
    scheduleLoadingStepTransitions(MIR_CREATE_STEP_TRANSITIONS);

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

      store.saveMirCreateResult(createResult);
      trackDocumentAction("create_document", "success", {
        updated_before_create: Boolean(draft.updateRequest),
      });
      void router.replace(
        toDocumentRoute(RESULT_ROUTE, { jobId: String(createResult.jobId) }),
      );
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "자재 반입 검수요청서 생성에 실패했습니다.";
      const failedFileCount = store.uploadedImageFiles.length;

      loadingErrorMessage.value = errorMessage;
      store.clearMirDocumentSubmissionDraft();
      clearLoadingStepTimers();
      trackDocumentAction("create_document", "fail", {
        error_kind: "api",
        updated_before_create: Boolean(draft.updateRequest),
        file_count: failedFileCount,
      });
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 2200);
    }
  }

  async function startCatCreateLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";

    const currentRunId = ++loadingRunId;
    const draft = store.catDocumentSubmissionDraft;

    if (!draft) {
      const errorMessage = "생성할 문서 데이터가 없어 업로드 화면으로 돌아갑니다.";

      loadingErrorMessage.value = errorMessage;
      trackDocumentAction("create_document", "fail", {
        error_kind: "missing_draft",
      });
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 1400);
      return;
    }

    scheduleLoadingStepTransitions(CAT_CREATE_STEP_TRANSITIONS);

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
      trackDocumentAction("create_document", "success", {
        updated_before_create: Boolean(draft.updateRequest),
      });
      void router.replace(
        toDocumentRoute(RESULT_ROUTE, { jobId: String(createResult.jobId) }),
      );
    } catch (error) {
      if (currentRunId !== loadingRunId) {
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "콘크리트 반입시험 문서 생성에 실패했습니다.";
      const failedFileCount = store.uploadedImageFiles.length;

      loadingErrorMessage.value = errorMessage;
      store.clearCatDocumentSubmissionDraft();
      clearLoadingStepTimers();
      trackDocumentAction("create_document", "fail", {
        error_kind: "api",
        updated_before_create: Boolean(draft.updateRequest),
        file_count: failedFileCount,
      });
      store.resetUploadAfterFailure(errorMessage);
      scheduleRouteNavigation(toDocumentRoute(UPLOAD_DOCUMENT_ROUTE), 2200);
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
      if (documentType === "material_registration") {
        if (isMirCreateLoading.value) {
          void startMirCreateLoadingSequence();
          return;
        }

        void startMirGenerationLoadingSequence();
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

      if (documentType === "concrete_strength_csi") {
        startConcreteStrengthLoadingSequence();
        return;
      }

      clearLoadingStepTimers();
      loadingStepIndex.value = 0;
      scheduleRouteNavigation(
        toDocumentRoute(loadingDestinationPath.value),
        LOADING_TEXT_TOTAL_DURATION_MS,
      );
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
