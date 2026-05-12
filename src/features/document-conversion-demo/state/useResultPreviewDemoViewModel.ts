import { computed, watch } from "vue";
import { useRoute } from "vue-router";

import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

const DEFAULT_REVIEW_ITEMS = [
  "내일 작업 내용이 없어요.",
  "오늘 작업 사진이 등록되지 않았어요.",
];

function formatResultFileName(label: string, date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} ${label}.pdf`;
}

function resolveResultFileExtension(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const [pathname] = value.split("?");
  let decodedPathname = pathname;

  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    decodedPathname = pathname;
  }

  decodedPathname = decodedPathname.toLowerCase();
  const match = decodedPathname.match(/\.(pdf|xlsx|xls|hwp|docx)$/);

  return match ? `.${match[1]}` : "";
}

function removeWhitespace(value: string) {
  return value.replace(/\s+/g, "");
}

function resolveFileNameFromPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const pathSegments = value.split("/").filter(Boolean);

  return pathSegments[pathSegments.length - 1] ?? value;
}

function resolveSelectedManifestOutputRef(
  sourceFolder: string,
  outputExcel: string | null,
) {
  if (!outputExcel) {
    return "";
  }

  return `${sourceFolder.replace(/\/$/, "")}/${outputExcel}`;
}

function formatResultTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function isDocumentCatalogType(value: string): value is DocumentCatalogType {
  return documentCatalog.some((document) => document.type === value);
}

export function useResultPreviewDemoViewModel() {
  const store = useDocumentConversionDemoStore();
  const route = useRoute();
  const {
    getSelectedSiteDocumentManifest,
    getSelectedSiteDocumentResult,
  } = useServicePresentationDemoViewModel();

  const routeDocumentType = computed<DocumentCatalogType>(() => {
    const documentType = route.query.documentType;

    return typeof documentType === "string" && isDocumentCatalogType(documentType)
      ? documentType
      : store.selectedDocument?.type ?? documentCatalog[0].type;
  });

  watch(
    () => route.query.documentType,
    (documentType) => {
      if (
        typeof documentType === "string" &&
        isDocumentCatalogType(documentType) &&
        store.selectedDocumentType !== documentType
      ) {
        store.selectDocument(documentType);
      }
    },
    { immediate: true },
  );

  const selectedDocument = computed(
    () =>
      documentCatalog.find((document) => document.type === routeDocumentType.value) ??
      store.selectedDocument ??
      documentCatalog[0],
  );
  const activeCreateResult = computed(
    () => store.catCreateResult ?? store.mirCreateResult,
  );
  const selectedManifest = computed(() =>
    getSelectedSiteDocumentManifest(selectedDocument.value.type),
  );
  const selectedDemoResult = computed(() =>
    getSelectedSiteDocumentResult(selectedDocument.value.type),
  );
  const selectedManifestOutputRef = computed(() => {
    const manifest = selectedManifest.value;

    return manifest
      ? resolveSelectedManifestOutputRef(manifest.sourceFolder, manifest.outputExcel)
      : "";
  });

  const resultFileName = computed(() => {
    if (activeCreateResult.value?.docNo) {
      return activeCreateResult.value.docNo;
    }

    return (
      resolveFileNameFromPath(selectedManifest.value?.outputExcel) ??
      resolveFileNameFromPath(selectedDemoResult.value?.outputRef) ??
      formatResultFileName(selectedDocument.value.label, new Date())
    );
  });

  const resultDownloadUrl = computed(
    () =>
      activeCreateResult.value?.resultUrl ??
      activeCreateResult.value?.pdfUrl ??
      selectedDemoResult.value?.outputRef ??
      selectedManifestOutputRef.value,
  );

  const resultDownloadJobId = computed(
    () => activeCreateResult.value?.jobId ?? null,
  );

  const resultDocumentTitle = computed(() => {
    if (store.catCreateResult) {
      return "콘크리트 반입시험";
    }

    if (store.mirCreateResult) {
      return "자재 반입 검수요청";
    }

    return selectedDocument.value.label;
  });

  const resultDocumentSubtitle = computed(() => {
    if (!activeCreateResult.value) {
      return resultFileName.value;
    }

    const createdTime = formatResultTime(
      activeCreateResult.value.completedAt ??
        activeCreateResult.value.createdAt ??
        activeCreateResult.value.startedAt,
    );

    return [activeCreateResult.value.docNo, createdTime].filter(Boolean).join(", ");
  });

  const resultDownloadFileName = computed(() => {
    if (!activeCreateResult.value?.docNo) {
      return resultFileName.value;
    }

    const documentName = removeWhitespace(resultDocumentTitle.value);
    const docNo = removeWhitespace(activeCreateResult.value.docNo);

    return `${documentName}_${docNo}${resolveResultFileExtension(resultDownloadUrl.value)}`;
  });

  const isResultDownloadAvailable = computed(() =>
    Boolean(resultDownloadUrl.value || resultDownloadJobId.value),
  );

  const reviewItems = computed(() =>
    activeCreateResult.value || selectedManifest.value?.outputExcel
      ? []
      : DEFAULT_REVIEW_ITEMS,
  );

  return {
    resultFileName,
    resultDownloadUrl,
    resultDownloadJobId,
    resultDownloadFileName,
    resultDocumentTitle,
    resultDocumentSubtitle,
    isResultDownloadAvailable,
    reviewItems,
  };
}
