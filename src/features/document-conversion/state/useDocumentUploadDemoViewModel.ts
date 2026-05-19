import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  documentCatalog,
  uploadDocumentPresets,
  uploadFeedbackPageCopy,
  uploadPageCopy,
} from "@/features/document-conversion/data/document-conversion-demo.seed";
import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion/api/material-inspection-request-api.types";
import type {
  UploadDocumentPreset,
  UploadFeedbackItem,
  UploadSampleFile,
} from "@/features/document-conversion/model/document-conversion-demo.types";
import { resolveDocumentWorkContextHint } from "@/features/document-conversion/services/document-work-context-hints";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import type { GeneratedDocumentListItem } from "@/features/document-conversion/state/useGeneratedDocumentsDemoViewModel";
import { useGeneratedDocumentsDemoViewModel } from "@/features/document-conversion/state/useGeneratedDocumentsDemoViewModel";

const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

interface LinkedConcreteDeliveryDocumentOption {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
}

function createUploadPreviewFile(
  file: File,
  id: string,
  thumbnail?: string,
): UploadSampleFile {
  return {
    id,
    name: file.name,
    previewType: file.type.startsWith("image/") ? "image" : "file",
    thumbnail,
  };
}

function createFeedbackItems(
  items: UploadFeedbackItem[],
  uploadedCount: number,
): UploadFeedbackItem[] {
  return items.map((item, index) => ({
    ...item,
    status: index < uploadedCount ? "matched" : "missing",
  }));
}

type UploadGuideValidationStatus = "idle" | "inspecting" | "matched" | "error";

interface UploadGuideItemViewData {
  label: string;
  status: UploadGuideValidationStatus;
}

interface OcrValidationItemViewData {
  id: string;
  label: string;
  fileName: string;
  previewUrl: string;
  textLines: string[];
}

function createMaterialRegistrationOcrLines(
  index: number,
  fileName: string,
): string[] {
  const materialRegistrationTemplates = [
    [
      "문서 유형: 송장",
      "공급처: 대한자재상사",
      "송장 번호: IV-240423-018",
      "입고 예정일: 2026.04.23",
      `원본 파일: ${fileName}`,
    ],
    [
      "촬영 구분: 자재반입사진",
      "자재명: H-Beam 300x300",
      "반입 수량: 12본",
      "하차 위치: B동 북측 야적장",
      `원본 파일: ${fileName}`,
    ],
    [
      "문서 유형: 밀시트",
      "출하 공장: 성진파일",
      "품목: PHC 파일",
      "배차 번호: MS-240423-03",
      `원본 파일: ${fileName}`,
    ],
    [
      "촬영 구분: 태그 사진",
      "태그 번호: TAG-0423-17",
      "규격: 300x300x10x15",
      "제조 로트: LOT-260423",
      `원본 파일: ${fileName}`,
    ],
  ];

  return (
    materialRegistrationTemplates[index] ?? [
      "문서 유형: OCR 추출 결과",
      `원본 파일: ${fileName}`,
      "추출 항목: 업로드 이미지를 기준으로 정리됨",
    ]
  );
}

function createAnalysisPhotoPreviewUrl(mimeType: string, data: string) {
  return `data:${mimeType || "image/jpeg"};base64,${data}`;
}

function formatLinkedDocumentDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLinkedDocumentTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function resolveFileNameFromPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const pathSegments = value.split("/").filter(Boolean);

  return pathSegments[pathSegments.length - 1] ?? value;
}

function toLinkedConcreteDeliveryDocumentOption(
  result: GeneratedDocumentListItem,
): LinkedConcreteDeliveryDocumentOption {
  const dateLabel = formatLinkedDocumentDate(result.createdAt);
  const timeLabel = formatLinkedDocumentTime(result.createdAt);

  return {
    id: result.id,
    title: resolveFileNameFromPath(result.downloadFileName) ?? result.title,
    subtitle: result.subtitle || [dateLabel, timeLabel].filter(Boolean).join(", "),
    createdAt: result.createdAt,
  };
}

export function useDocumentUploadDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const { recentGeneratedDocuments } = useGeneratedDocumentsDemoViewModel();
  const guideInspectionState = ref<"idle" | "inspecting" | "done">("idle");
  const guideInspectionCount = ref(0);
  const workTypeSuggestions = ref<WorkTypeReferenceResponse[]>([]);
  const isWorkTypeSuggestionsLoading = ref(false);
  const workTypeSuggestionsErrorMessage = ref("");
  const isWorkTypeSuggestionListOpen = ref(false);
  const highlightedWorkTypeSuggestionIndex = ref(-1);
  const workTypeSuggestionQuery = ref("");
  const selectedLinkedConcreteDeliveryDocumentId = ref("");
  let guideInspectionTimer: ReturnType<typeof setTimeout> | null = null;
  let workTypeSuggestionCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let workTypeSuggestionRequestId = 0;
  const previewUrlMap = ref<Record<string, string>>({});

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const hasSelectedDocument = computed(() => Boolean(store.selectedDocument));
  const isMaterialInspectionRequest = computed(
    () => selectedDocument.value.type === "material_registration",
  );
  const isConcreteDeliveryTest = computed(
    () => selectedDocument.value.type === "concrete_delivery_csi",
  );
  const isConcreteStrengthTest = computed(
    () => selectedDocument.value.type === "concrete_strength_csi",
  );
  const requiresWorkContext = computed(
    () =>
      isMaterialInspectionRequest.value ||
      isConcreteDeliveryTest.value ||
      isConcreteStrengthTest.value,
  );
  const workContextHint = computed(() =>
    resolveDocumentWorkContextHint(
      null,
      selectedDocument.value.type,
    ),
  );
  const mirUploadApplication = computed({
    get: () => store.mirUploadApplication,
    set: store.setMirUploadApplication,
  });
  const mirUploadWorkTypeName = computed({
    get: () => store.mirUploadWorkTypeName,
    set: store.setMirUploadWorkTypeName,
  });
  const mirUploadWorkTypeId = computed(() => store.mirUploadWorkTypeId);
  const needsOcrValidation = computed(
    () => isMaterialInspectionRequest.value || isConcreteDeliveryTest.value,
  );

  const selectedPreset = computed<UploadDocumentPreset>(() => {
    return (
      uploadDocumentPresets.find(
        (preset) => preset.documentType === selectedDocument.value?.type,
      ) ?? uploadDocumentPresets[0]
    );
  });

  const requiresUpload = computed(
    () => selectedDocument.value.generationMode === "upload_required",
  );

  const uploadedFiles = computed<UploadSampleFile[]>(() =>
    store.uploadedImageFiles.map((entry) =>
      createUploadPreviewFile(
        entry.file,
        entry.id,
        previewUrlMap.value[entry.id],
      ),
    ),
  );
  const linkedConcreteDeliveryDocumentOptions = computed(() =>
    recentGeneratedDocuments.value
      .filter(
        (result) => result.documentType === "concrete_delivery_csi",
      )
      .map(toLinkedConcreteDeliveryDocumentOption)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .map((document) => ({
        ...document,
        isSelected: document.id === selectedLinkedConcreteDeliveryDocumentId.value,
      })),
  );

  const ocrValidationItems = computed<OcrValidationItemViewData[]>(() => {
    if (!needsOcrValidation.value) {
      return [];
    }

    const analysisPhotos = isConcreteDeliveryTest.value && store.catAnalysisResult
      ? [
          ...store.catAnalysisResult.photos,
          ...store.catAnalysisResult.batches.flatMap((batch) => batch.photos),
        ]
      : store.mirAnalysisResult?.photos ?? [];

    return analysisPhotos.map((photo, index) => ({
      id: photo.photoKey,
      label: photo.description || `분석 이미지 ${index + 1}`,
      fileName: photo.description || `분석 이미지 ${index + 1}`,
      previewUrl: createAnalysisPhotoPreviewUrl(photo.mimeType, photo.data),
      textLines: createMaterialRegistrationOcrLines(
        index,
        photo.description || `분석 이미지 ${index + 1}`,
      ),
    }));
  });

  const uploadGuideItems = computed<UploadGuideItemViewData[]>(() =>
    selectedPreset.value.guideItems.map((label, index) => {
      if (index < guideInspectionCount.value) {
        return {
          label,
          status:
            guideInspectionState.value === "done" ? "matched" : "inspecting",
        };
      }

      if (guideInspectionState.value === "done" && uploadedFiles.value.length > 0) {
        return {
          label,
          status: "error",
        };
      }

      return {
        label,
        status: "idle",
      };
    }),
  );

  const feedbackItems = computed(() =>
    createFeedbackItems(
      selectedPreset.value.feedbackItems,
      uploadedFiles.value.length,
    ),
  );

  const matchedCount = computed(
    () => feedbackItems.value.filter((item) => item.status === "matched").length,
  );

  const missingCount = computed(
    () => feedbackItems.value.filter((item) => item.status === "missing").length,
  );

  const hasRequiredUploadInputs = computed(() => {
    const hasRequiredWorkContext = Boolean(
      mirUploadApplication.value.trim() &&
        mirUploadWorkTypeName.value.trim(),
    );

    if (isConcreteStrengthTest.value) {
      return hasRequiredWorkContext;
    }

    if (!requiresWorkContext.value) {
      return true;
    }

    const hasRequiredImageCount = isConcreteDeliveryTest.value
      ? uploadedFiles.value.length >= CAT_MIN_IMAGE_UPLOAD_COUNT
      : uploadedFiles.value.length > 0;

    return Boolean(
      hasRequiredWorkContext &&
        hasRequiredImageCount,
    );
  });

  const canReview = computed(() =>
    uploadedFiles.value.length > 0 &&
    hasRequiredUploadInputs.value,
  );
  const canProceed = computed(() => uploadedFiles.value.length > 0);

  const primaryFeedbackActionLabel = computed(() =>
    canProceed.value
      ? uploadFeedbackPageCopy.primaryReadyActionLabel
      : uploadFeedbackPageCopy.primaryRetryActionLabel,
  );

  const primaryFeedbackRoute = computed(() => ({
    path: canProceed.value ? "/documents/generation" : "/documents/upload",
    query: { documentType: selectedDocument.value.type },
  }));

  function clearGuideInspectionTimer() {
    if (guideInspectionTimer) {
      clearTimeout(guideInspectionTimer);
      guideInspectionTimer = null;
    }
  }

  function clearWorkTypeSuggestionCloseTimer() {
    if (workTypeSuggestionCloseTimer) {
      clearTimeout(workTypeSuggestionCloseTimer);
      workTypeSuggestionCloseTimer = null;
    }
  }

  function clearWorkTypeSuggestions() {
    workTypeSuggestions.value = [];
    workTypeSuggestionQuery.value = "";
    workTypeSuggestionsErrorMessage.value = "";
    isWorkTypeSuggestionsLoading.value = false;
    isWorkTypeSuggestionListOpen.value = false;
    highlightedWorkTypeSuggestionIndex.value = -1;
  }

  async function loadWorkTypeSuggestions(workTypeName: string) {
    const query = workTypeName.trim();
    const requestId = ++workTypeSuggestionRequestId;

    if (!requiresWorkContext.value || !query) {
      clearWorkTypeSuggestions();
      return;
    }

    if (
      query === workTypeSuggestionQuery.value &&
      (isWorkTypeSuggestionsLoading.value || workTypeSuggestions.value.length > 0)
    ) {
      isWorkTypeSuggestionListOpen.value = true;
      highlightedWorkTypeSuggestionIndex.value =
        highlightedWorkTypeSuggestionIndex.value >= 0
          ? highlightedWorkTypeSuggestionIndex.value
          : workTypeSuggestions.value.length > 0
            ? 0
            : -1;
      return;
    }

    workTypeSuggestionQuery.value = query;
    isWorkTypeSuggestionsLoading.value = true;
    workTypeSuggestionsErrorMessage.value = "";
    isWorkTypeSuggestionListOpen.value = true;

    try {
      const suggestions =
        await materialInspectionRequestApi.getWorkTypeListByName(query);

      if (requestId !== workTypeSuggestionRequestId) {
        return;
      }

      workTypeSuggestions.value = suggestions;
      highlightedWorkTypeSuggestionIndex.value = suggestions.length > 0 ? 0 : -1;
    } catch (error) {
      if (requestId !== workTypeSuggestionRequestId) {
        return;
      }

      workTypeSuggestions.value = [];
      highlightedWorkTypeSuggestionIndex.value = -1;
      workTypeSuggestionsErrorMessage.value =
        error instanceof Error
          ? error.message
          : "공종명을 불러오지 못했습니다.";
    } finally {
      if (requestId === workTypeSuggestionRequestId) {
        isWorkTypeSuggestionsLoading.value = false;
      }
    }
  }

  function openWorkTypeSuggestionList() {
    clearWorkTypeSuggestionCloseTimer();

    const query = mirUploadWorkTypeName.value.trim();

    if (query && mirUploadWorkTypeId.value === null) {
      isWorkTypeSuggestionListOpen.value =
        workTypeSuggestions.value.length > 0 || isWorkTypeSuggestionsLoading.value;
      highlightedWorkTypeSuggestionIndex.value =
        highlightedWorkTypeSuggestionIndex.value >= 0
          ? highlightedWorkTypeSuggestionIndex.value
          : workTypeSuggestions.value.length > 0
            ? 0
            : -1;

      return;
    }

    if (workTypeSuggestions.value.length > 0 || isWorkTypeSuggestionsLoading.value) {
      isWorkTypeSuggestionListOpen.value = true;
      highlightedWorkTypeSuggestionIndex.value =
        highlightedWorkTypeSuggestionIndex.value >= 0
          ? highlightedWorkTypeSuggestionIndex.value
          : workTypeSuggestions.value.length > 0
            ? 0
            : -1;
    }
  }

  function scheduleCloseWorkTypeSuggestionList() {
    clearWorkTypeSuggestionCloseTimer();
    workTypeSuggestionCloseTimer = setTimeout(() => {
      isWorkTypeSuggestionListOpen.value = false;
      workTypeSuggestionCloseTimer = null;
    }, 120);
  }

  function selectWorkTypeSuggestion(suggestion: WorkTypeReferenceResponse) {
    clearWorkTypeSuggestionCloseTimer();
    workTypeSuggestionRequestId += 1;
    store.selectMirUploadWorkType({
      id: suggestion.id,
      name: suggestion.name,
    });
    workTypeSuggestions.value = [];
    workTypeSuggestionsErrorMessage.value = "";
    isWorkTypeSuggestionListOpen.value = false;
    highlightedWorkTypeSuggestionIndex.value = -1;
  }

  function updateMirUploadWorkTypeName(value: string) {
    store.setMirUploadWorkTypeName(value);
    highlightedWorkTypeSuggestionIndex.value = -1;

    const query = value.trim();

    if (
      query &&
      query === workTypeSuggestionQuery.value &&
      (isWorkTypeSuggestionsLoading.value || workTypeSuggestions.value.length > 0)
    ) {
      isWorkTypeSuggestionListOpen.value = true;
      highlightedWorkTypeSuggestionIndex.value =
        workTypeSuggestions.value.length > 0 ? 0 : -1;
      return;
    }

    void loadWorkTypeSuggestions(value);
  }

  function setHighlightedWorkTypeSuggestionIndex(index: number) {
    highlightedWorkTypeSuggestionIndex.value = Math.min(
      Math.max(index, -1),
      workTypeSuggestions.value.length - 1,
    );
  }

  function moveHighlightedWorkTypeSuggestion(direction: 1 | -1) {
    const suggestionCount = workTypeSuggestions.value.length;

    clearWorkTypeSuggestionCloseTimer();

    if (mirUploadWorkTypeName.value.trim()) {
      isWorkTypeSuggestionListOpen.value = true;
    }

    if (suggestionCount === 0) {
      return;
    }

    const baseIndex =
      highlightedWorkTypeSuggestionIndex.value >= 0
        ? highlightedWorkTypeSuggestionIndex.value
        : direction === 1
          ? -1
          : 0;

    highlightedWorkTypeSuggestionIndex.value =
      (baseIndex + direction + suggestionCount) % suggestionCount;
  }

  function selectHighlightedWorkTypeSuggestion() {
    const suggestionCount = workTypeSuggestions.value.length;

    if (!isWorkTypeSuggestionListOpen.value || suggestionCount === 0) {
      return;
    }

    const selectedIndex =
      highlightedWorkTypeSuggestionIndex.value >= 0 &&
      highlightedWorkTypeSuggestionIndex.value < suggestionCount
        ? highlightedWorkTypeSuggestionIndex.value
        : 0;
    const suggestion = workTypeSuggestions.value[selectedIndex];

    if (suggestion) {
      selectWorkTypeSuggestion(suggestion);
    }
  }

  function handleWorkTypeSuggestionEnter(event: KeyboardEvent) {
    if (event.isComposing) {
      return;
    }

    if (!isWorkTypeSuggestionListOpen.value || workTypeSuggestions.value.length === 0) {
      return;
    }

    event.preventDefault();
    selectHighlightedWorkTypeSuggestion();
  }

  function closeWorkTypeSuggestionList() {
    isWorkTypeSuggestionListOpen.value = false;
    highlightedWorkTypeSuggestionIndex.value = -1;
  }

  function revokePreviewUrls() {
    Object.values(previewUrlMap.value).forEach((url) => URL.revokeObjectURL(url));
    previewUrlMap.value = {};
  }

  function selectUploadDocument(type: string) {
    const document = documentCatalog.find((item) => item.type === type);

    if (!document || store.selectedDocumentType === document.type) {
      return;
    }

    store.selectDocument(document.type);
  }

  function addUploadedImageFiles(files: File[]) {
    return store.addUploadedImageFiles(files).map((entry) => entry.id);
  }

  function saveConcreteDeliveryUploadBatches(
    batches: Array<{ id: string; fileIds: string[] }>,
  ) {
    store.setConcreteDeliveryUploadBatches(batches);
  }

  function saveConcreteStrengthUploadLots(
    lots: Array<{
      id: string;
      sevenDayFileIds: string[];
      twentyEightDayFileIds: string[];
    }>,
  ) {
    store.setConcreteStrengthUploadLots(lots);
  }

  function selectLinkedConcreteDeliveryDocument(documentId: string) {
    selectedLinkedConcreteDeliveryDocumentId.value = documentId;
  }

  watch(
    () => store.uploadedImageFiles.map((entry) => entry.id).join(","),
    () => {
      revokePreviewUrls();

      const nextPreviewUrlMap: Record<string, string> = {};

      store.uploadedImageFiles.forEach((entry) => {
        nextPreviewUrlMap[entry.id] = URL.createObjectURL(entry.file);
      });

      previewUrlMap.value = nextPreviewUrlMap;
    },
    { immediate: true },
  );

  watch(
    () => ({
      selectedDocumentType: selectedDocument.value.type,
      uploadedFileIds: uploadedFiles.value.map((file) => file.id).join(","),
    }),
    () => {
      clearGuideInspectionTimer();

      const nextInspectionCount = Math.min(
        uploadedFiles.value.length,
        selectedPreset.value.guideItems.length,
      );

      guideInspectionCount.value = nextInspectionCount;

      if (nextInspectionCount === 0) {
        guideInspectionState.value = "idle";
        return;
      }

      guideInspectionState.value = "inspecting";
      guideInspectionTimer = setTimeout(() => {
        guideInspectionState.value = "done";
        guideInspectionTimer = null;
      }, 2000);
    },
    { immediate: true },
  );

  watch(
    () => linkedConcreteDeliveryDocumentOptions.value.map((document) => document.id),
    (documentIds) => {
      if (
        documentIds.length > 0 &&
        !documentIds.includes(selectedLinkedConcreteDeliveryDocumentId.value)
      ) {
        selectedLinkedConcreteDeliveryDocumentId.value = documentIds[0];
        return;
      }

      if (documentIds.length === 0) {
        selectedLinkedConcreteDeliveryDocumentId.value = "";
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    clearGuideInspectionTimer();
    clearWorkTypeSuggestionCloseTimer();
    workTypeSuggestionRequestId += 1;
    revokePreviewUrls();
  });

  return {
    uploadPageCopy,
    uploadFeedbackPageCopy,
    selectedDocument,
    hasSelectedDocument,
    isMaterialInspectionRequest,
    isConcreteDeliveryTest,
    isConcreteStrengthTest,
    requiresWorkContext,
    mirUploadApplication,
    mirUploadWorkTypeName,
    mirUploadWorkTypeId,
    workContextHint,
    workTypeSuggestions,
    highlightedWorkTypeSuggestionIndex,
    isWorkTypeSuggestionsLoading,
    workTypeSuggestionsErrorMessage,
    isWorkTypeSuggestionListOpen,
    needsOcrValidation,
    selectedPreset,
    requiresUpload,
    uploadedFiles,
    linkedConcreteDeliveryDocumentOptions,
    selectedLinkedConcreteDeliveryDocumentId,
    ocrValidationItems,
    uploadGuideItems,
    feedbackItems,
    matchedCount,
    missingCount,
    canReview,
    canProceed,
    uploadErrorMessage: computed(() => store.mirAnalysisErrorMessage),
    primaryFeedbackActionLabel,
    primaryFeedbackRoute,
    backToSelectionRoute: "/documents",
    uploadFeedbackRoute: "/documents/upload/review",
    addUploadedImageFiles,
    removeUploadedImageFile: store.removeUploadedImageFile,
    reorderUploadedImageFiles: store.reorderUploadedImageFiles,
    saveConcreteDeliveryUploadBatches,
    saveConcreteStrengthUploadLots,
    selectLinkedConcreteDeliveryDocument,
    clearUpload: store.clearUpload,
    selectUploadDocument,
    updateMirUploadWorkTypeName,
    moveHighlightedWorkTypeSuggestion,
    selectHighlightedWorkTypeSuggestion,
    handleWorkTypeSuggestionEnter,
    closeWorkTypeSuggestionList,
    setHighlightedWorkTypeSuggestionIndex,
    openWorkTypeSuggestionList,
    scheduleCloseWorkTypeSuggestionList,
    selectWorkTypeSuggestion,
  };
}
