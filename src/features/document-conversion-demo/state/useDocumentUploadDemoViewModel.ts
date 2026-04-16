import { computed } from "vue";

import {
  documentCatalog,
  uploadDocumentPresets,
  uploadFeedbackPageCopy,
  uploadPageCopy,
} from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type {
  UploadDocumentPreset,
  UploadFeedbackItem,
} from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

function createMissingFeedbackItems(items: UploadFeedbackItem[]): UploadFeedbackItem[] {
  return items.map((item) => ({
    ...item,
    status: "missing",
  }));
}

export function useDocumentUploadDemoViewModel() {
  const store = useDocumentConversionDemoStore();

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

  const uploadedFiles = computed(() =>
    store.uploadMode === "sample" ? selectedPreset.value.sampleFiles : [],
  );

  const feedbackItems = computed(() =>
    store.uploadMode === "sample"
      ? selectedPreset.value.feedbackItems
      : createMissingFeedbackItems(selectedPreset.value.feedbackItems),
  );

  const matchedCount = computed(
    () => feedbackItems.value.filter((item) => item.status === "matched").length,
  );

  const missingCount = computed(
    () => feedbackItems.value.filter((item) => item.status === "missing").length,
  );

  const canReview = computed(() => uploadedFiles.value.length > 0);
  const canProceed = computed(() => missingCount.value === 0);

  const primaryFeedbackActionLabel = computed(() =>
    canProceed.value
      ? uploadFeedbackPageCopy.primaryReadyActionLabel
      : uploadFeedbackPageCopy.primaryRetryActionLabel,
  );

  const primaryFeedbackRoute = computed(() =>
    canProceed.value ? "/preview/loading" : "/preview/upload",
  );

  return {
    uploadPageCopy,
    uploadFeedbackPageCopy,
    selectedDocument,
    selectedPreset,
    uploadedFiles,
    feedbackItems,
    matchedCount,
    missingCount,
    canReview,
    canProceed,
    primaryFeedbackActionLabel,
    primaryFeedbackRoute,
    backToSelectionRoute: "/preview/documents",
    uploadFeedbackRoute: "/preview/upload-feedback",
    loadSampleUpload: store.loadSampleUpload,
    clearUpload: store.clearUpload,
  };
}
