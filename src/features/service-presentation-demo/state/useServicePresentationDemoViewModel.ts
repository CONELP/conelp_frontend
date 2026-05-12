import { computed } from "vue";

import type {
  ServicePresentationSiteCard,
  ServicePresentationSiteId,
} from "@/features/service-presentation-demo/model/service-presentation-demo.types";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useServicePresentationDemoStore } from "@/features/service-presentation-demo/state/useServicePresentationDemoStore";

function createSiteCard(
  siteId: ServicePresentationSiteId | null,
  site: ReturnType<typeof useServicePresentationDemoStore>["sites"][number],
): ServicePresentationSiteCard {
  const readyDocumentCount = site.documents.filter(
    (document) => document.status === "demo_ready",
  ).length;

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    siteChipLabel: site.siteChipLabel,
    description: site.description,
    dataRoot: site.dataRoot,
    scheduleSeedId: site.scheduleSeedId,
    documentCountLabel: `문서 ${site.documents.length}종`,
    readyDocumentCountLabel: `시연 준비 ${readyDocumentCount}종`,
    isSelected: site.siteId === siteId,
  };
}

export function useServicePresentationDemoViewModel() {
  const store = useServicePresentationDemoStore();

  const siteCards = computed(() =>
    store.sites.map((site) => createSiteCard(store.selectedSiteId, site)),
  );
  const selectedSite = computed(() => store.selectedSite);
  const selectedSiteLabel = computed(() => store.selectedSiteLabel);
  const selectedSiteDocuments = computed(() => store.selectedSiteDocuments);
  const selectedSiteGeneratedResults = computed(
    () => store.selectedSiteGeneratedResults,
  );
  const selectedScheduleSeedId = computed(() => store.selectedScheduleSeedId);
  const defaultSiteId = computed(() => store.defaultSiteId);

  function getSelectedSiteDocumentManifest(documentType: DocumentCatalogType) {
    return store.getSelectedSiteDocumentManifest(documentType);
  }

  function getSelectedSiteDocumentResult(documentType: DocumentCatalogType) {
    return store.getSelectedSiteDocumentResult(documentType);
  }

  function recordSelectedSiteDocumentGeneration(documentType: DocumentCatalogType) {
    return store.recordSelectedSiteDocumentGeneration(documentType);
  }

  function deleteGeneratedResult(resultId: string) {
    return store.deleteGeneratedResult(resultId);
  }

  return {
    siteCards,
    selectedSite,
    selectedSiteLabel,
    selectedSiteDocuments,
    selectedSiteGeneratedResults,
    selectedScheduleSeedId,
    defaultSiteId,
    hasSelectedSite: store.hasSelectedSite,
    getSelectedSiteDocumentManifest,
    getSelectedSiteDocumentResult,
    recordSelectedSiteDocumentGeneration,
    deleteGeneratedResult,
    selectSite: store.selectSite,
    resetToDefaultSite: store.resetToDefaultSite,
    clearSelectedSite: store.clearSelectedSite,
  };
}
