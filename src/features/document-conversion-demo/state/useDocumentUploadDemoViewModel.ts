import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  documentCatalog,
  uploadDocumentPresets,
  uploadFeedbackPageCopy,
  uploadPageCopy,
} from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type {
  UploadDocumentPreset,
  UploadFeedbackItem,
  UploadSampleFile,
} from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

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

export function useDocumentUploadDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const guideInspectionState = ref<"idle" | "inspecting" | "done">("idle");
  const guideInspectionCount = ref(0);
  let guideInspectionTimer: ReturnType<typeof setTimeout> | null = null;
  const previewUrlMap = ref<Record<string, string>>({});

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
  );

  const hasSelectedDocument = computed(() => Boolean(store.selectedDocument));
  const autoProceedAfterUpload = computed(
    () => selectedDocument.value.type === "material_registration",
  );
  const needsOcrValidation = computed(
    () => selectedDocument.value.type === "material_registration",
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

    return uploadedFiles.value.map((file, index) => ({
      id: file.id,
      label: selectedPreset.value.guideItems[index] ?? `업로드 이미지 ${index + 1}`,
      fileName: file.name,
      previewUrl: file.thumbnail ?? "",
      textLines: createMaterialRegistrationOcrLines(index, file.name),
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

  const canReview = computed(() => uploadedFiles.value.length > 0);
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
    revokePreviewUrls();
  });

  return {
    uploadPageCopy,
    uploadFeedbackPageCopy,
    selectedDocument,
    hasSelectedDocument,
    autoProceedAfterUpload,
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
    primaryFeedbackActionLabel,
    primaryFeedbackRoute,
    backToSelectionRoute: "/preview/documents",
    uploadFeedbackRoute: "/preview/upload-feedback",
    addUploadedImageFiles: store.addUploadedImageFiles,
    removeUploadedImageFile: store.removeUploadedImageFile,
    clearUpload: store.clearUpload,
    selectUploadDocument,
  };
}
