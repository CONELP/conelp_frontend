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

  const canContinue = computed(() => Boolean(store.selectedDocument));
  const nextRoute = computed(() => "/preview/upload");

  return {
    pageCopy,
    flowStages,
    documents,
    selectedDocument: store.selectedDocument,
    selectionSummary,
    canContinue,
    nextRoute,
    selectDocument: store.selectDocument,
  };
}
