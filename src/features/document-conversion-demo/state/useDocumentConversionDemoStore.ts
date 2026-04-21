import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";

export const useDocumentConversionDemoStore = defineStore(
  "document-conversion-demo",
  () => {
    const selectedDocumentType = ref("");
    const uploadMode = ref<"sample" | "empty">("empty");

    const selectedDocument = computed(() =>
      documentCatalog.find((document) => document.type === selectedDocumentType.value),
    );

    function selectDocument(type: string) {
      selectedDocumentType.value = type;
      uploadMode.value = "empty";
    }

    function clearSelectedDocument() {
      selectedDocumentType.value = "";
      uploadMode.value = "empty";
    }

    function loadSampleUpload() {
      uploadMode.value = "sample";
    }

    function clearUpload() {
      uploadMode.value = "empty";
    }

    return {
      selectedDocumentType,
      selectedDocument,
      uploadMode,
      selectDocument,
      clearSelectedDocument,
      loadSampleUpload,
      clearUpload,
    };
  },
);
