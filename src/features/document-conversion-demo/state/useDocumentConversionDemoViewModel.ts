import { computed } from "vue";

import {
  demoFlowStages,
  documentCatalog,
  selectionPageCopy,
} from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import {
  createFlowStageLabels,
  createSelectionCards,
  createSelectionPageContent,
  createSelectionSummary,
} from "@/features/document-conversion-demo/services/document-conversion-demo.service";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";

export function useDocumentConversionDemoViewModel() {
  const store = useDocumentConversionDemoStore();

  const pageCopy = createSelectionPageContent(selectionPageCopy);
  const flowStages = createFlowStageLabels(demoFlowStages);

  const documents = computed(() =>
    createSelectionCards(documentCatalog, store.selectedDocumentType),
  );

  const selectionSummary = computed(() =>
    createSelectionSummary(store.selectedDocument),
  );

  function resolveNextRoute(type: string) {
    const selectedType = documentCatalog.find((document) => document.type === type);

    return selectedType?.generationMode === "direct"
      ? "/preview/loading"
      : "/preview/upload";
  }

  return {
    pageCopy,
    flowStages,
    documents,
    selectedDocument: store.selectedDocument,
    selectionSummary,
    resolveNextRoute,
    clearSelectedDocument: store.clearSelectedDocument,
    selectDocument: store.selectDocument,
  };
}
