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
import {
  buildCatPhotoSummary,
  buildGenericPhotoSummary,
  buildMirPhotoSummary,
} from "@/features/document-conversion/services/document-photo-summary";
import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import { analyticsClient } from "@/shared/analytics/analytics-stub";
import { rotateImageFile } from "@/shared/utils/rotate-image-file";

interface UploadedImageEntrySnapshot {
  file: File;
  rotation: number;
}

function applyEntryRotation(entry: UploadedImageEntrySnapshot): Promise<File> {
  return rotateImageFile(entry.file, entry.rotation);
}

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

const CAT_ANALYSIS_LOADING_STEPS = [
  "송장 사진과 시험 사진을 구분하고 배치 번호별로 묶고 있어요.",
  "슬럼프, 공기량, 염화물량, 온도 같은 시험값을 읽고 있어요.",
  "반입 정보와 시험 결과를 정리해 문서 항목에 맞추고 있어요.",
] as const;

const CAT_ANALYSIS_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const CONCRETE_STRENGTH_LOADING_STEPS = [
  "업로드한 압축강도 시험 사진을 로트와 공시체 기준으로 정리하고 있어요.",
  "7일, 28일 강도값과 판정 정보를 구분해서 문서 항목에 맞추고 있어요.",
  "콘크리트 압축강도 시험 서식에 값을 채워 최종 문서를 만들고 있어요.",
] as const;

const CONCRETE_STRENGTH_STEP_TRANSITIONS = EVEN_LOADING_STEP_TRANSITIONS;

const DOCUMENT_SELECTION_ROUTE = "/documents";
const UPLOAD_DOCUMENT_ROUTE = "/documents/upload";
const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

export function useConversionLoadingDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const backgroundJobs = useBackgroundDocumentJobsStore();
  const router = useRouter();
  const route = useRoute();

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const loadingStepIndex = ref(0);
  const loadingErrorMessage = ref("");
  const loadingStepTimers: ReturnType<typeof setTimeout>[] = [];
  let loadingRunId = 0;

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

  const loadingBackRoute = computed<RouteLocationRaw>(() =>
    toDocumentRoute(
      selectedDocument.value.generationMode === "direct"
        ? DOCUMENT_SELECTION_ROUTE
        : UPLOAD_DOCUMENT_ROUTE,
    ),
  );

  const baseLoadingDescription = computed(() => {
    if (selectedDocument.value.type === "material_registration") {
      return MIR_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "concrete_delivery_csi") {
      return CAT_ANALYSIS_LOADING_STEPS[loadingStepIndex.value];
    }

    if (selectedDocument.value.type === "concrete_strength_csi") {
      return CONCRETE_STRENGTH_LOADING_STEPS[loadingStepIndex.value];
    }

    return selectedDocument.value.generationMode === "direct"
      ? "기본 항목과 문서 형식을 준비하고 있어요."
      : "이미지에서 텍스트를 읽고 있어요.";
  });

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

  function scheduleRouteNavigation(target: RouteLocationRaw, delayMs: number) {
    loadingStepTimers.push(
      setTimeout(() => {
        void router.replace(target);
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

  async function createCatAnalysisUploadPayload() {
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
        deliveryNote: deliveryNoteEntry
          ? [await applyEntryRotation(deliveryNoteEntry)]
          : [],
        metadata: [{ batch: 1, count: batchPhotoEntries.length }],
        batchPhotos: await Promise.all(
          batchPhotoEntries.map((entry) => applyEntryRotation(entry)),
        ),
      };
    }

    const deliveryNoteEntries = groupedBatches
      .map((batch) => batch.entries[0])
      .filter((entry): entry is (typeof store.uploadedImageFiles)[number] =>
        Boolean(entry),
      );
    const deliveryNote = await Promise.all(
      deliveryNoteEntries.map((entry) => applyEntryRotation(entry)),
    );
    const metadata = groupedBatches.map((batch, index) => ({
      batch: index + 1,
      count: Math.max(batch.entries.length - 1, 0),
    }));
    const batchPhotos = await Promise.all(
      groupedBatches
        .flatMap((batch) => batch.entries.slice(1))
        .map((entry) => applyEntryRotation(entry)),
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

  function enqueueMirCreateBackgroundJob(result: MirAnalysisResponse) {
    const documentTypeLabel = selectedDocument.value.label;
    const photoSummary = buildMirPhotoSummary(result);
    const createRequest = toCreateMirDocumentRequest(result);
    const fileCount = store.uploadedImageFiles.length;

    void backgroundJobs.enqueueJob(
      { documentTypeLabel, photoSummary },
      async () => {
        try {
          const createResult = await materialInspectionRequestApi.createMirDocument(
            createRequest,
          );

          store.saveMirCreateResult(createResult);
          trackDocumentAction("create_document", "success", {
            background: true,
            file_count: fileCount,
          });
        } catch (error) {
          trackDocumentAction("create_document", "fail", {
            background: true,
            file_count: fileCount,
            error_kind: "api",
          });

          throw error;
        }
      },
    );
  }

  function enqueueCatCreateBackgroundJob(result: CatAnalysisResponse) {
    const documentTypeLabel = selectedDocument.value.label;
    const photoSummary = buildCatPhotoSummary(result);
    const createRequest = toCreateCatDocumentRequest(result);
    const fileCount = store.uploadedImageFiles.length;

    void backgroundJobs.enqueueJob(
      { documentTypeLabel, photoSummary },
      async () => {
        try {
          const createResult = await materialInspectionRequestApi.createCatDocument(
            createRequest,
          );

          store.saveCatCreateResult(createResult);
          trackDocumentAction("create_document", "success", {
            background: true,
            file_count: fileCount,
          });
        } catch (error) {
          trackDocumentAction("create_document", "fail", {
            background: true,
            file_count: fileCount,
            error_kind: "api",
          });

          throw error;
        }
      },
    );
  }

  function enqueueConcreteStrengthSimulatedJob() {
    const documentTypeLabel = selectedDocument.value.label;
    const fileCount = store.uploadedImageFiles.length;
    const photoSummary = buildGenericPhotoSummary(fileCount);

    void backgroundJobs.enqueueJob(
      { documentTypeLabel, photoSummary },
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 2400);
        }),
    );
  }

  async function startMirGenerationLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
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
      const rotatedImages = await Promise.all(
        store.uploadedImageFiles.map((entry) => applyEntryRotation(entry)),
      );

      const result = await materialInspectionRequestApi.analyzeMirPhoto({
        application: store.mirUploadApplication,
        workTypeId: store.mirUploadWorkTypeId,
        images: rotatedImages,
      });

      if (currentRunId !== loadingRunId) {
        return;
      }

      store.saveMirAnalysisResult(result);
      trackDocumentAction("analyze", "success", {
        file_count: store.uploadedImageFiles.length,
      });

      enqueueMirCreateBackgroundJob(result);
      store.clearUpload();
      clearLoadingStepTimers();
      void router.replace({ path: DOCUMENT_SELECTION_ROUTE });
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
      trackDocumentAction("analyze", "fail", {
        error_kind: "api",
        file_count: store.uploadedImageFiles.length,
      });
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

    try {
      const uploadPayload = await createCatAnalysisUploadPayload();

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

      enqueueCatCreateBackgroundJob(result);
      store.clearUpload();
      clearLoadingStepTimers();
      void router.replace({ path: DOCUMENT_SELECTION_ROUTE });
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
      trackDocumentAction("analyze", "fail", {
        error_kind: "api",
        file_count: store.uploadedImageFiles.length,
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

    enqueueConcreteStrengthSimulatedJob();
    trackDocumentAction("create_document", "success", {
      background: true,
      file_count: store.uploadedImageFiles.length,
      simulated: true,
    });
    scheduleRouteNavigation(
      { path: DOCUMENT_SELECTION_ROUTE },
      LOADING_TEXT_TOTAL_DURATION_MS,
    );
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
        void startMirGenerationLoadingSequence();
        return;
      }

      if (documentType === "concrete_delivery_csi") {
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
        { path: DOCUMENT_SELECTION_ROUTE },
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
    selectedDocument,
  };
}
