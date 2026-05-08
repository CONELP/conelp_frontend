import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  defaultServicePresentationSiteId,
  servicePresentationSiteManifest,
} from "@/features/service-presentation-demo/data/site-manifest.seed";
import { servicePresentationGeneratedResultsSeed } from "@/features/service-presentation-demo/data/generated-results.seed";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import type {
  ServicePresentationGeneratedResult,
  ServicePresentationSiteId,
} from "@/features/service-presentation-demo/model/service-presentation-demo.types";

const SELECTED_PRESENTATION_SITE_STORAGE_KEY =
  "conelp:presentation-demo:selected-site";

function findSiteById(siteId: string | null) {
  return (
    servicePresentationSiteManifest.find((site) => site.siteId === siteId) ??
    null
  );
}

function readSelectedSiteIdFromSession() {
  if (typeof window === "undefined") {
    return defaultServicePresentationSiteId;
  }

  try {
    const storedSiteId = window.sessionStorage.getItem(
      SELECTED_PRESENTATION_SITE_STORAGE_KEY,
    );

    return findSiteById(storedSiteId)?.siteId ?? defaultServicePresentationSiteId;
  } catch {
    return defaultServicePresentationSiteId;
  }
}

function persistSelectedSiteIdToSession(siteId: ServicePresentationSiteId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SELECTED_PRESENTATION_SITE_STORAGE_KEY, siteId);
  } catch {
    // Session persistence is only a refresh convenience for the local demo.
  }
}

export const useServicePresentationDemoStore = defineStore(
  "service-presentation-demo",
  () => {
    const selectedSiteId = ref<ServicePresentationSiteId | null>(
      readSelectedSiteIdFromSession(),
    );
    const generatedResults = ref<ServicePresentationGeneratedResult[]>(
      servicePresentationGeneratedResultsSeed.map((result) => ({ ...result })),
    );

    const sites = computed(() => servicePresentationSiteManifest);
    const defaultSiteId = computed(() => defaultServicePresentationSiteId);
    const defaultSite = computed(() => findSiteById(defaultSiteId.value));
    const selectedSite = computed(() => findSiteById(selectedSiteId.value));
    const hasSelectedSite = computed(() => selectedSite.value !== null);
    const selectedSiteLabel = computed(
      () => selectedSite.value?.siteChipLabel ?? "현장 선택",
    );
    const selectedSiteDocuments = computed(
      () => selectedSite.value?.documents ?? [],
    );
    const selectedSiteGeneratedResults = computed(() =>
      generatedResults.value.filter(
        (result) => result.siteId === selectedSiteId.value,
      ),
    );
    const selectedScheduleSeedId = computed(
      () => selectedSite.value?.scheduleSeedId ?? "",
    );

    function getSelectedSiteDocumentManifest(documentType: DocumentCatalogType) {
      return (
        selectedSiteDocuments.value.find(
          (document) => document.documentType === documentType,
        ) ?? null
      );
    }

    function getSelectedSiteDocumentResult(documentType: DocumentCatalogType) {
      return (
        selectedSiteGeneratedResults.value.find(
          (result) => result.documentType === documentType,
        ) ?? null
      );
    }

    function recordSelectedSiteDocumentGeneration(documentType: DocumentCatalogType) {
      const site = selectedSite.value;
      const documentManifest = getSelectedSiteDocumentManifest(documentType);

      if (!site || !documentManifest) {
        return null;
      }

      const generatedResult: ServicePresentationGeneratedResult = {
        id: `${site.siteId}:${documentType}:latest`,
        siteId: site.siteId,
        type: "document",
        documentType,
        title: documentManifest.label,
        sourceRefs: documentManifest.inputFiles.map(
          (fileName) => `${documentManifest.sourceFolder}/${fileName}`,
        ),
        outputRef: documentManifest.outputExcel
          ? `${documentManifest.sourceFolder}/${documentManifest.outputExcel}`
          : null,
        createdAt: new Date().toISOString(),
        status: "generated",
      };

      generatedResults.value = [
        generatedResult,
        ...generatedResults.value.filter(
          (result) => result.id !== generatedResult.id,
        ),
      ];

      return generatedResult;
    }

    function selectSite(siteId: string) {
      const site = findSiteById(siteId);

      if (!site) {
        return false;
      }

      selectedSiteId.value = site.siteId;
      persistSelectedSiteIdToSession(site.siteId);
      return true;
    }

    function resetToDefaultSite() {
      selectedSiteId.value = defaultServicePresentationSiteId;
      persistSelectedSiteIdToSession(defaultServicePresentationSiteId);
    }

    function clearSelectedSite() {
      selectedSiteId.value = null;
    }

    return {
      selectedSiteId,
      sites,
      defaultSiteId,
      defaultSite,
      selectedSite,
      selectedSiteLabel,
      selectedSiteDocuments,
      selectedSiteGeneratedResults,
      selectedScheduleSeedId,
      hasSelectedSite,
      getSelectedSiteDocumentManifest,
      getSelectedSiteDocumentResult,
      recordSelectedSiteDocumentGeneration,
      selectSite,
      resetToDefaultSite,
      clearSelectedSite,
    };
  },
);
