import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  defaultServicePresentationSiteId,
  servicePresentationSiteManifest,
} from "@/features/service-presentation-demo/data/site-manifest.seed";
import { servicePresentationGeneratedResultsSeed } from "@/features/service-presentation-demo/data/generated-results.seed";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import type {
  ServicePresentationDocumentManifest,
  ServicePresentationGeneratedResult,
  ServicePresentationSiteId,
} from "@/features/service-presentation-demo/model/service-presentation-demo.types";

const SELECTED_PRESENTATION_SITE_STORAGE_KEY =
  "conelp:presentation-demo:selected-site";
const GENERATED_PRESENTATION_RESULTS_STORAGE_KEY =
  "conelp:presentation-demo:generated-results";

function findSiteById(siteId: string | null) {
  return (
    servicePresentationSiteManifest.find((site) => site.siteId === siteId) ??
    null
  );
}

function resolveDocumentManifestOutputRef(
  documentManifest: ServicePresentationDocumentManifest | null | undefined,
) {
  if (!documentManifest?.outputExcel) {
    return null;
  }

  return `${documentManifest.sourceFolder.replace(/\/$/, "")}/${documentManifest.outputExcel}`;
}

function hydrateGeneratedResult(
  result: ServicePresentationGeneratedResult,
): ServicePresentationGeneratedResult {
  if (result.type !== "document" || !result.documentType) {
    return result;
  }

  const site = findSiteById(result.siteId);
  const documentManifest =
    site?.documents.find(
      (document) => document.documentType === result.documentType,
    ) ?? null;
  const outputRef = resolveDocumentManifestOutputRef(documentManifest);

  if (!outputRef) {
    return result;
  }

  if (result.outputRef === outputRef) {
    return result;
  }

  return {
    ...result,
    outputRef,
  };
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

function formatGeneratedDocumentNo(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isServicePresentationGeneratedResult(
  value: unknown,
): value is ServicePresentationGeneratedResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<ServicePresentationGeneratedResult>;

  return (
    typeof result.id === "string" &&
    typeof result.siteId === "string" &&
    findSiteById(result.siteId) !== null &&
    result.type === "document" &&
    (typeof result.documentNo === "string" || result.documentNo === undefined) &&
    typeof result.title === "string" &&
    Array.isArray(result.sourceRefs) &&
    (typeof result.outputRef === "string" || result.outputRef === null) &&
    typeof result.createdAt === "string" &&
    result.status === "generated"
  );
}

function mergeGeneratedResults(
  results: ServicePresentationGeneratedResult[],
) {
  const resultById = new Map<string, ServicePresentationGeneratedResult>();

  results.forEach((result) => {
    resultById.set(result.id, hydrateGeneratedResult(result));
  });

  return Array.from(resultById.values());
}

function readGeneratedResultsFromSession() {
  if (typeof window === "undefined") {
    return servicePresentationGeneratedResultsSeed.map((result) => ({ ...result }));
  }

  try {
    const storedResults = JSON.parse(
      window.sessionStorage.getItem(
        GENERATED_PRESENTATION_RESULTS_STORAGE_KEY,
      ) ?? "[]",
    );
    const sessionResults = Array.isArray(storedResults)
      ? storedResults.filter(isServicePresentationGeneratedResult)
      : [];

    return mergeGeneratedResults([
      ...servicePresentationGeneratedResultsSeed.map((result) => ({ ...result })),
      ...sessionResults,
    ]);
  } catch {
    return servicePresentationGeneratedResultsSeed.map((result) => ({ ...result }));
  }
}

function persistGeneratedResultsToSession(
  results: ServicePresentationGeneratedResult[],
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      GENERATED_PRESENTATION_RESULTS_STORAGE_KEY,
      JSON.stringify(results),
    );
  } catch {
    // Generated result persistence is best-effort for the local demo.
  }
}

export const useServicePresentationDemoStore = defineStore(
  "service-presentation-demo",
  () => {
    const selectedSiteId = ref<ServicePresentationSiteId | null>(
      readSelectedSiteIdFromSession(),
    );
    const generatedResults = ref<ServicePresentationGeneratedResult[]>(
      readGeneratedResultsFromSession(),
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
      ).map(hydrateGeneratedResult),
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

      const now = new Date();
      const createdAt = now.toISOString();
      const documentNo = formatGeneratedDocumentNo(now);
      const generatedResultId = `${site.siteId}:${documentType}:${documentNo}`;
      const generatedResult: ServicePresentationGeneratedResult = {
        id: generatedResultId,
        siteId: site.siteId,
        type: "document",
        documentType,
        documentNo,
        title: documentManifest.label,
        sourceRefs: documentManifest.inputFiles.map(
          (fileName) => `${documentManifest.sourceFolder}/${fileName}`,
        ),
        outputRef: documentManifest.outputExcel
          ? `${documentManifest.sourceFolder}/${documentManifest.outputExcel}`
          : null,
        createdAt,
        status: "generated",
      };

      const nextGeneratedResults = [
        generatedResult,
        ...generatedResults.value.filter(
          (result) => result.id !== generatedResultId,
        ),
      ];

      generatedResults.value = nextGeneratedResults;
      persistGeneratedResultsToSession(nextGeneratedResults);

      return generatedResult;
    }

    function deleteGeneratedResult(resultId: string) {
      const nextGeneratedResults = generatedResults.value.filter(
        (result) => result.id !== resultId && `demo:${result.id}` !== resultId,
      );

      if (nextGeneratedResults.length === generatedResults.value.length) {
        return false;
      }

      generatedResults.value = nextGeneratedResults;
      persistGeneratedResultsToSession(nextGeneratedResults);
      return true;
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
      deleteGeneratedResult,
      selectSite,
      resetToDefaultSite,
      clearSelectedSite,
    };
  },
);
