import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  documentCatalog,
  uploadDocumentPresets,
  uploadFeedbackPageCopy,
  uploadPageCopy,
} from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import type {
  UploadDocumentPreset,
  UploadFeedbackItem,
  UploadSampleFile,
} from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

const IMAGE_UPLOAD_LIMIT = 10;
const CAT_MIN_IMAGE_UPLOAD_COUNT = 2;

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

export function useDocumentUploadDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const guideInspectionState = ref<"idle" | "inspecting" | "done">("idle");
  const guideInspectionCount = ref(0);
  const workTypeSuggestions = ref<WorkTypeReferenceResponse[]>([]);
  const isWorkTypeSuggestionsLoading = ref(false);
  const workTypeSuggestionsErrorMessage = ref("");
  const isWorkTypeSuggestionListOpen = ref(false);
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
  const requiresWorkContext = computed(
    () => isMaterialInspectionRequest.value || isConcreteDeliveryTest.value,
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
    if (!requiresWorkContext.value) {
      return true;
    }

    const hasRequiredImageCount = isConcreteDeliveryTest.value
      ? uploadedFiles.value.length >= CAT_MIN_IMAGE_UPLOAD_COUNT
      : uploadedFiles.value.length > 0;

    return Boolean(
      mirUploadApplication.value.trim() &&
        mirUploadWorkTypeName.value.trim() &&
        hasRequiredImageCount &&
        uploadedFiles.value.length <= IMAGE_UPLOAD_LIMIT,
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

  const primaryFeedbackRoute = computed(() =>
    canProceed.value ? "/preview/loading" : "/preview/upload",
  );

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
    workTypeSuggestionsErrorMessage.value = "";
    isWorkTypeSuggestionsLoading.value = false;
    isWorkTypeSuggestionListOpen.value = false;
  }

  async function loadWorkTypeSuggestions(workTypeName: string) {
    const query = workTypeName.trim();
    const requestId = ++workTypeSuggestionRequestId;

    if (!requiresWorkContext.value || !query) {
      clearWorkTypeSuggestions();
      return;
    }

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
    } catch (error) {
      if (requestId !== workTypeSuggestionRequestId) {
        return;
      }

      workTypeSuggestions.value = [];
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
      isWorkTypeSuggestionListOpen.value = true;

      if (!isWorkTypeSuggestionsLoading.value && workTypeSuggestions.value.length === 0) {
        void loadWorkTypeSuggestions(query);
      }

      return;
    }

    if (workTypeSuggestions.value.length > 0 || isWorkTypeSuggestionsLoading.value) {
      isWorkTypeSuggestionListOpen.value = true;
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
  }

  function updateMirUploadWorkTypeName(value: string) {
    store.setMirUploadWorkTypeName(value);
    void loadWorkTypeSuggestions(value);
  }

  function revokePreviewUrls() {
    Object.values(previewUrlMap.value).forEach((url) => URL.revokeObjectURL(url));
    previewUrlMap.value = {};
  }

  function selectUploadDocument(type: string) {
    const document = documentCatalog.find((item) => item.type === type);

    if (!document) {
      return;
    }

    store.selectDocument(type);
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
    requiresWorkContext,
    mirUploadApplication,
    mirUploadWorkTypeName,
    mirUploadWorkTypeId,
    workTypeSuggestions,
    isWorkTypeSuggestionsLoading,
    workTypeSuggestionsErrorMessage,
    isWorkTypeSuggestionListOpen,
    needsOcrValidation,
    selectedPreset,
    requiresUpload,
    uploadedFiles,
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
    backToSelectionRoute: "/preview/documents",
    uploadFeedbackRoute: "/preview/upload-feedback",
    addUploadedImageFiles: store.addUploadedImageFiles,
    removeUploadedImageFile: store.removeUploadedImageFile,
    clearUpload: store.clearUpload,
    selectUploadDocument,
    updateMirUploadWorkTypeName,
    openWorkTypeSuggestionList,
    scheduleCloseWorkTypeSuggestionList,
    selectWorkTypeSuggestion,
  };
}
