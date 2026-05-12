import { computed } from "vue";

import {
  demoFlowStages,
  documentCatalog,
  selectionPageCopy,
} from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type {
  DocumentCatalogType,
  DocumentDemoCard,
} from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import {
  createFlowStageLabels,
  createSelectionCards,
  createSelectionPageContent,
  createSelectionSummary,
} from "@/features/document-conversion-demo/services/document-conversion-demo.service";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

function resolveSiteDocumentCatalog(
  siteDocuments: Array<{ documentType: DocumentCatalogType }>,
): DocumentDemoCard[] {
  if (siteDocuments.length === 0) {
    return documentCatalog;
  }

  const catalogByType = new Map(
    documentCatalog.map((document) => [document.type, document]),
  );

  return siteDocuments
    .map((siteDocument) => {
      return catalogByType.get(siteDocument.documentType) ?? null;
    })
    .filter((document): document is DocumentDemoCard => document !== null);
}

export function useDocumentConversionDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const { selectedSiteDocuments } = useServicePresentationDemoViewModel();

  const pageCopy = createSelectionPageContent(selectionPageCopy);
  const flowStages = createFlowStageLabels(demoFlowStages);
  const siteDocumentCatalog = computed(() =>
    resolveSiteDocumentCatalog(selectedSiteDocuments.value),
  );

  const documents = computed(() =>
    createSelectionCards(siteDocumentCatalog.value, store.selectedDocumentType),
  );

  const selectionSummary = computed(() =>
    createSelectionSummary(store.selectedDocument),
  );

  function resolveNextRoute(type: string) {
    const selectedType = siteDocumentCatalog.value.find(
      (document) => document.type === type,
    );

    if (selectedType?.type === "daily_report_write") {
      return "/preview/daily-report-write";
    }

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
