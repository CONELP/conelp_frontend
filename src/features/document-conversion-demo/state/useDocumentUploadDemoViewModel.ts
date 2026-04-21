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

function createUploadPreviewFile(file: File, id: string): UploadSampleFile {
  return {
    id,
    name: file.name,
    previewType: file.type.startsWith("image/") ? "image" : "file",
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

export function useDocumentUploadDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const guideInspectionState = ref<"idle" | "inspecting" | "done">("idle");
  const guideInspectionCount = ref(0);
  let guideInspectionTimer: ReturnType<typeof setTimeout> | null = null;

  const selectedDocument = computed(
    () => store.selectedDocument ?? documentCatalog[0],
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
      createUploadPreviewFile(entry.file, entry.id),
    ),
  );

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
  });

  return {
    uploadPageCopy,
    uploadFeedbackPageCopy,
    selectedDocument,
    selectedPreset,
    requiresUpload,
    uploadedFiles,
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
  };
}
