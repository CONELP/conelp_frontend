import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import { documentCatalog } from "@/features/document-conversion/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";
import { buildGenericPhotoSummary } from "@/features/document-conversion/services/document-photo-summary";
import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import { analyticsClient } from "@/shared/analytics/analytics-stub";
import { rotateImageFile } from "@/shared/utils/rotate-image-file";

interface UploadedImageEntrySnapshot {
  id: string;
  file: File;
  rotation: number;
}

interface ConcreteDeliveryUploadBatchSnapshot {
  id: string;
  fileIds: string[];
}

interface ConcreteStrengthUploadLotSnapshot {
  id: string;
  sevenDayFileIds: string[];
  twentyEightDayFileIds: string[];
}

function applyEntryRotation(entry: UploadedImageEntrySnapshot): Promise<File> {
  return rotateImageFile(entry.file, entry.rotation);
}

const LOADING_TEXT_STEP_DURATION_MS = 1500;
const LOADING_TEXT_TOTAL_DURATION_MS = LOADING_TEXT_STEP_DURATION_MS * 3;

const MIR_ANALYSIS_LOADING_STEPS = [
  "업로드한 반입 사진을 분류하고 흐릿한 영역을 보정하고 있어요.",
  "송장, 밀시트, 태그에서 자재명과 규격, 수량 정보를 읽고 있어요.",
  "검수요청서에 들어갈 반입 정보와 사진 근거를 맞춰보고 있어요.",
] as const;

const CAT_ANALYSIS_LOADING_STEPS = [
  "송장 사진과 시험 사진을 구분하고 배치 번호별로 묶고 있어요.",
  "슬럼프, 공기량, 염화물량, 온도 같은 시험값을 읽고 있어요.",
  "반입 정보와 시험 결과를 정리해 문서 항목에 맞추고 있어요.",
] as const;

const CONCRETE_STRENGTH_LOADING_STEPS = [
  "업로드한 압축강도 시험 사진을 로트와 공시체 기준으로 정리하고 있어요.",
  "7일, 28일 강도값과 판정 정보를 구분해서 문서 항목에 맞추고 있어요.",
  "콘크리트 압축강도 시험 서식에 값을 채워 최종 문서를 만들고 있어요.",
] as const;

const DOCUMENT_SELECTION_ROUTE = "/documents";
const UPLOAD_DOCUMENT_ROUTE = "/documents/upload";
const GENERATED_DOCUMENTS_ROUTE = "/documents/generated";

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
    documentType = selectedDocument.value.type,
  ) {
    analyticsClient.trackAction("document", action, result, {
      document_type: documentType,
      ...meta,
    });
  }

  function shouldSaveBackgroundResult(documentType: DocumentCatalogType) {
    return store.selectedDocumentType === documentType;
  }

  function snapshotUploadedImages(): UploadedImageEntrySnapshot[] {
    return store.uploadedImageFiles.map((entry) => ({
      id: entry.id,
      file: entry.file,
      rotation: entry.rotation,
    }));
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

    if (!store.mirUploadWorkTypeName.trim() || store.mirUploadWorkTypeId === null) {
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

    if (!store.mirUploadWorkTypeName.trim() || store.mirUploadWorkTypeId === null) {
      return "공종 이름을 입력해 주세요.";
    }

    if (!store.concreteDeliveryNoteFileId) {
      return "송장 사진을 1장 업로드해 주세요.";
    }

    const batchesWithPhotos = store.concreteDeliveryUploadBatches.filter(
      (batch) => batch.fileIds.length > 0,
    );

    if (batchesWithPhotos.length === 0) {
      return "각 회차에 시험 사진을 1장 이상 업로드해 주세요.";
    }

    return "";
  }

  function resolveConcreteStrengthValidationMessage() {
    if (!store.selectedConcreteDeliveryCatDocId) {
      return "생성된 콘크리트 반입시험 문서를 선택해 주세요.";
    }

    if (!store.mirUploadApplication.trim()) {
      return "사용 위치를 입력해 주세요.";
    }

    if (!store.mirUploadWorkTypeName.trim()) {
      return "공종 이름을 입력해 주세요.";
    }

    const lotPhotoCount = store.concreteStrengthUploadLots.reduce(
      (count, lot) =>
        count + lot.sevenDayFileIds.length + lot.twentyEightDayFileIds.length,
      0,
    );

    if (lotPhotoCount <= 0) {
      return "압축강도 시험 사진을 1장 이상 업로드해 주세요.";
    }

    return "";
  }

  async function createCatAnalysisUploadPayload(
    uploadedImageFiles: UploadedImageEntrySnapshot[],
    concreteDeliveryUploadBatches: ConcreteDeliveryUploadBatchSnapshot[],
    deliveryNoteFileId: string | null,
  ) {
    const fileEntryById = new Map(
      uploadedImageFiles.map((entry) => [entry.id, entry]),
    );
    const deliveryNoteEntry = deliveryNoteFileId
      ? fileEntryById.get(deliveryNoteFileId)
      : undefined;
    const deliveryNote = deliveryNoteEntry
      ? [await applyEntryRotation(deliveryNoteEntry)]
      : [];

    const groupedBatches = concreteDeliveryUploadBatches
      .map((batch) => ({
        id: batch.id,
        entries: batch.fileIds
          .map((fileId) => fileEntryById.get(fileId))
          .filter((entry): entry is UploadedImageEntrySnapshot =>
            Boolean(entry),
          ),
      }))
      .filter((batch) => batch.entries.length > 0);

    const metadata = groupedBatches.map((batch, index) => ({
      batch: index + 1,
      count: batch.entries.length,
    }));
    const batchPhotos = await Promise.all(
      groupedBatches
        .flatMap((batch) => batch.entries)
        .map((entry) => applyEntryRotation(entry)),
    );

    return {
      deliveryNote,
      metadata,
      batchPhotos,
    };
  }

  async function createCcstAnalysisUploadPayload(
    uploadedImageFiles: UploadedImageEntrySnapshot[],
    concreteStrengthUploadLots: ConcreteStrengthUploadLotSnapshot[],
  ) {
    const fileEntryById = new Map(
      uploadedImageFiles.map((entry) => [entry.id, entry]),
    );
    const metadata: Array<{ lot: number; ageDays: 7 | 28; count: number }> = [];
    const lotPhotoEntries: UploadedImageEntrySnapshot[] = [];

    concreteStrengthUploadLots.forEach((lot, lotIndex) => {
      const lotNumber = lotIndex + 1;
      const sevenDayEntries = lot.sevenDayFileIds
        .map((fileId) => fileEntryById.get(fileId))
        .filter((entry): entry is UploadedImageEntrySnapshot => Boolean(entry));
      const twentyEightDayEntries = lot.twentyEightDayFileIds
        .map((fileId) => fileEntryById.get(fileId))
        .filter((entry): entry is UploadedImageEntrySnapshot => Boolean(entry));

      if (sevenDayEntries.length > 0) {
        metadata.push({
          lot: lotNumber,
          ageDays: 7,
          count: sevenDayEntries.length,
        });
        lotPhotoEntries.push(...sevenDayEntries);
      }

      if (twentyEightDayEntries.length > 0) {
        metadata.push({
          lot: lotNumber,
          ageDays: 28,
          count: twentyEightDayEntries.length,
        });
        lotPhotoEntries.push(...twentyEightDayEntries);
      }
    });

    return {
      metadata,
      lotPhotos: await Promise.all(
        lotPhotoEntries.map((entry) => applyEntryRotation(entry)),
      ),
    };
  }

  function enqueueMirCreateBackgroundJob(options: {
    documentType: DocumentCatalogType;
    documentTypeLabel: string;
    application: string;
    workTypeId: number;
    uploadedImages: UploadedImageEntrySnapshot[];
  }) {
    const fileCount = options.uploadedImages.length;

    void backgroundJobs.enqueueJob(
      {
        documentType: options.documentType,
        documentTypeLabel: options.documentTypeLabel,
        summary: buildGenericPhotoSummary(fileCount),
        initialStatus: "generating",
        resultRoute: GENERATED_DOCUMENTS_ROUTE,
      },
      async (context) => {
        try {
          context.updateStatus("generating");
          const rotatedImages = await Promise.all(
            options.uploadedImages.map((entry) => applyEntryRotation(entry)),
          );

          const createResult = await materialInspectionRequestApi.createMirDocument({
            application: options.application,
            workTypeId: options.workTypeId,
            images: rotatedImages,
          });

          if (shouldSaveBackgroundResult(options.documentType)) {
            store.saveMirCreateResult(createResult);
          }

          trackDocumentAction(
            "create_document",
            "success",
            {
              background: true,
              file_count: fileCount,
            },
            options.documentType,
          );
        } catch (error) {
          trackDocumentAction(
            "create_document",
            "fail",
            {
              background: true,
              file_count: fileCount,
              error_kind: "api",
            },
            options.documentType,
          );

          throw error;
        }
      },
    );
  }

  function enqueueCatCreateBackgroundJob(options: {
    documentType: DocumentCatalogType;
    documentTypeLabel: string;
    application: string;
    workTypeId: number;
    uploadedImages: UploadedImageEntrySnapshot[];
    concreteDeliveryUploadBatches: ConcreteDeliveryUploadBatchSnapshot[];
    deliveryNoteFileId: string | null;
  }) {
    const fileCount = options.uploadedImages.length;

    void backgroundJobs.enqueueJob(
      {
        documentType: options.documentType,
        documentTypeLabel: options.documentTypeLabel,
        summary: buildGenericPhotoSummary(fileCount),
        initialStatus: "generating",
        resultRoute: GENERATED_DOCUMENTS_ROUTE,
      },
      async (context) => {
        try {
          context.updateStatus("generating");
          const uploadPayload = await createCatAnalysisUploadPayload(
            options.uploadedImages,
            options.concreteDeliveryUploadBatches,
            options.deliveryNoteFileId,
          );

          const createResult = await materialInspectionRequestApi.createCatDocument({
            application: options.application,
            workTypeId: options.workTypeId,
            deliveryNote: uploadPayload.deliveryNote,
            metadata: uploadPayload.metadata,
            batchPhotos: uploadPayload.batchPhotos,
          });

          if (shouldSaveBackgroundResult(options.documentType)) {
            store.saveCatCreateResult(createResult);
          }

          trackDocumentAction(
            "create_document",
            "success",
            {
              background: true,
              file_count: fileCount,
            },
            options.documentType,
          );
        } catch (error) {
          trackDocumentAction(
            "create_document",
            "fail",
            {
              background: true,
              file_count: fileCount,
              error_kind: "api",
            },
            options.documentType,
          );

          throw error;
        }
      },
    );
  }

  function enqueueConcreteStrengthCreateBackgroundJob(options: {
    documentType: DocumentCatalogType;
    documentTypeLabel: string;
    catDocId: number;
    uploadedImages: UploadedImageEntrySnapshot[];
    concreteStrengthUploadLots: ConcreteStrengthUploadLotSnapshot[];
  }) {
    const fileCount = options.uploadedImages.length;

    void backgroundJobs.enqueueJob(
      {
        documentType: options.documentType,
        documentTypeLabel: options.documentTypeLabel,
        summary: buildGenericPhotoSummary(fileCount),
        initialStatus: "generating",
        resultRoute: GENERATED_DOCUMENTS_ROUTE,
      },
      async (context) => {
        try {
          context.updateStatus("generating");
          const uploadPayload = await createCcstAnalysisUploadPayload(
            options.uploadedImages,
            options.concreteStrengthUploadLots,
          );

          await materialInspectionRequestApi.createCcstDocument(options.catDocId, {
            metadata: uploadPayload.metadata,
            lotPhotos: uploadPayload.lotPhotos,
          });

          trackDocumentAction(
            "create_document",
            "success",
            {
              background: true,
              file_count: fileCount,
            },
            options.documentType,
          );
        } catch (error) {
          trackDocumentAction(
            "create_document",
            "fail",
            {
              background: true,
              file_count: fileCount,
              error_kind: "api",
            },
            options.documentType,
          );

          throw error;
        }
      },
    );
  }

  function startMirGenerationLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    loadingRunId += 1;
    const validationMessage = resolveMirAnalysisValidationMessage();
    const documentType = selectedDocument.value.type;
    const documentTypeLabel = selectedDocument.value.label;

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

    enqueueMirCreateBackgroundJob({
      documentType,
      documentTypeLabel,
      application: store.mirUploadApplication,
      workTypeId: store.mirUploadWorkTypeId!,
      uploadedImages: snapshotUploadedImages(),
    });
    store.clearUpload();
    clearLoadingStepTimers();
    void router.replace({ path: DOCUMENT_SELECTION_ROUTE });
  }

  function startCatAnalysisLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    loadingRunId += 1;
    const validationMessage = resolveCatAnalysisValidationMessage();
    const documentType = selectedDocument.value.type;
    const documentTypeLabel = selectedDocument.value.label;

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

    enqueueCatCreateBackgroundJob({
      documentType,
      documentTypeLabel,
      application: store.mirUploadApplication,
      workTypeId: store.mirUploadWorkTypeId!,
      uploadedImages: snapshotUploadedImages(),
      concreteDeliveryUploadBatches: store.concreteDeliveryUploadBatches.map(
        (batch) => ({
          id: batch.id,
          fileIds: [...batch.fileIds],
        }),
      ),
      deliveryNoteFileId: store.concreteDeliveryNoteFileId,
    });
    store.clearUpload();
    clearLoadingStepTimers();
    void router.replace({ path: DOCUMENT_SELECTION_ROUTE });
  }

  function startConcreteStrengthLoadingSequence() {
    clearLoadingStepTimers();
    loadingStepIndex.value = 0;
    loadingErrorMessage.value = "";
    store.setMirAnalysisErrorMessage("");

    const validationMessage = resolveConcreteStrengthValidationMessage();
    const documentType = selectedDocument.value.type;
    const documentTypeLabel = selectedDocument.value.label;

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

    enqueueConcreteStrengthCreateBackgroundJob({
      documentType,
      documentTypeLabel,
      catDocId: store.selectedConcreteDeliveryCatDocId!,
      uploadedImages: snapshotUploadedImages(),
      concreteStrengthUploadLots: store.concreteStrengthUploadLots.map((lot) => ({
        id: lot.id,
        sevenDayFileIds: [...lot.sevenDayFileIds],
        twentyEightDayFileIds: [...lot.twentyEightDayFileIds],
      })),
    });
    store.clearUpload();
    void router.replace({ path: DOCUMENT_SELECTION_ROUTE });
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
        startMirGenerationLoadingSequence();
        return;
      }

      if (documentType === "concrete_delivery_csi") {
        startCatAnalysisLoadingSequence();
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
