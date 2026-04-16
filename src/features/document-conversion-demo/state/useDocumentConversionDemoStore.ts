import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";

export const useDocumentConversionDemoStore = defineStore(
  "document-conversion-demo",
  () => {
    const selectedDocumentType = ref(documentCatalog[0]?.type ?? "");

    const selectedDocument = computed(() =>
      documentCatalog.find((document) => document.type === selectedDocumentType.value),
    );

    function selectDocument(type: string) {
      selectedDocumentType.value = type;
    }

    return {
      selectedDocumentType,
      selectedDocument,
      selectDocument,
    };
  },
);
