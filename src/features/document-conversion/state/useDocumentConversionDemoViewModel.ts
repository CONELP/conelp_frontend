import { computed } from "vue";

import {
  demoFlowStages,
  documentCatalog,
  selectionPageCopy,
} from "@/features/document-conversion/data/document-conversion-demo.seed";
import {
  createFlowStageLabels,
  createSelectionCards,
  createSelectionPageContent,
  createSelectionSummary,
} from "@/features/document-conversion/services/document-conversion-demo.service";
import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

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

  function resolveNextRoute(type: DocumentCatalogType) {
    const selectedType = documentCatalog.find((document) => document.type === type);

    if (!selectedType || selectedType.status !== "available") {
      return "/documents";
    }

    if (selectedType?.type === "daily_report_write") {
      return "/documents/daily-report/write";
    }

    if (selectedType?.type === "material_supply_status") {
      return "/documents/mat-inout/period";
    }

    return selectedType?.generationMode === "direct"
      ? "/documents/generation"
      : "/documents/upload";
  }

  return {
    pageCopy,
    flowStages,
    documents,
    selectedDocument: store.selectedDocument,
    selectionSummary,
    resolveNextRoute,
    isDocumentCatalogType,
    clearSelectedDocument: store.clearSelectedDocument,
    selectDocument: store.selectDocument,
  };
}
