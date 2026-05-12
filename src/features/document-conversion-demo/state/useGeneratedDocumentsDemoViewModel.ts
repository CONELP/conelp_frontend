import { computed, onMounted, ref } from "vue";

import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { DocumentJobResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion-demo/data/document-conversion-demo.seed";
import type { ServicePresentationGeneratedResult } from "@/features/service-presentation-demo/model/service-presentation-demo.types";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

export interface GeneratedDocumentListItem {
  id: string;
  jobId: number | null;
  demoResultId: string | null;
  canDelete: boolean;
  title: string;
  subtitle: string;
  createdAt: string;
  resultUrl: string | null;
  pdfUrl: string | null;
  downloadFileName: string;
}

interface GeneratedDocumentDateGroup {
  dateKey: string;
  dateLabel: string;
  documents: GeneratedDocumentListItem[];
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const SUCCESS_STATUS = "SUCCEEDED";
const DOCUMENT_LABEL_BY_TYPE: Record<string, string> = {
  DR: "일일 작업일보",
  MIR: "자재 반입 검수요청",
  CAT: "콘크리트 타설 요청",
  CCST: "압축강도 시험 의뢰",
  SCHEDULE_3WEEK: "3주 공정표",
  SCHEDULE_3MONTH: "3개월 공정표",
};

function formatGeneratedDocumentDate(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const year = createdAt.getFullYear();
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  const day = String(createdAt.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function formatGeneratedDocumentNumber(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const year = String(createdAt.getFullYear()).slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  const day = String(createdAt.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatGeneratedDocumentTime(value: string) {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "";
  }

  const hours = String(createdAt.getHours()).padStart(2, "0");
  const minutes = String(createdAt.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatGeneratedDocumentDateGroup(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      key: "unknown",
      label: "날짜 없음",
    };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = KOREAN_WEEKDAYS[date.getDay()];

  return {
    key: `${year}-${month}-${day}`,
    label: `${year}.${month}.${day}.${weekday}`,
  };
}

function formatGeneratedDocumentDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resolveGeneratedDocumentFileExtension(value: string | null | undefined) {
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

  const match = decodedPathname.toLowerCase().match(/\.(pdf|xlsx|xls|hwp|docx)$/);

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

function resolveGeneratedDocumentDate(document: DocumentJobResponse) {
  return document.createdAt ?? document.completedAt ?? document.startedAt ?? "";
}

function resolveGeneratedDocumentTitle(document: DocumentJobResponse) {
  return DOCUMENT_LABEL_BY_TYPE[document.docType] ?? document.docType;
}

function resolveDemoGeneratedDocumentTitle(result: ServicePresentationGeneratedResult) {
  if (!result.documentType) {
    return result.title;
  }

  return (
    documentCatalog.find((document) => document.type === result.documentType)?.label ??
    result.title
  );
}

function toGeneratedDocumentListItem(
  document: DocumentJobResponse,
): GeneratedDocumentListItem {
  const createdAt = resolveGeneratedDocumentDate(document);
  const timeLabel = formatGeneratedDocumentTime(createdAt);
  const fallbackDateLabel = formatGeneratedDocumentDate(createdAt);
  const subtitleBase = document.docNo ?? fallbackDateLabel;
  const title = resolveGeneratedDocumentTitle(document);
  const documentName = removeWhitespace(title);
  const docNo = removeWhitespace(document.docNo ?? String(document.id));
  const sourceUrl = document.resultUrl ?? document.pdfUrl;

  return {
    id: String(document.id),
    jobId: document.id,
    demoResultId: null,
    canDelete: false,
    title,
    subtitle: [subtitleBase, timeLabel].filter(Boolean).join(", "),
    createdAt,
    resultUrl: document.resultUrl,
    pdfUrl: document.pdfUrl,
    downloadFileName: `${documentName}_${docNo}${resolveGeneratedDocumentFileExtension(sourceUrl)}`,
  };
}

function toDemoGeneratedDocumentListItem(
  result: ServicePresentationGeneratedResult,
): GeneratedDocumentListItem {
  const outputFileName = resolveFileNameFromPath(result.outputRef);
  const documentNumber = result.documentNo ?? formatGeneratedDocumentNumber(result.createdAt);
  const timeLabel = formatGeneratedDocumentTime(result.createdAt);
  const fallbackDateLabel = formatGeneratedDocumentDate(result.createdAt);
  const title = resolveDemoGeneratedDocumentTitle(result);

  return {
    id: `demo:${result.id}`,
    jobId: null,
    demoResultId: result.id,
    canDelete: true,
    title,
    subtitle: [documentNumber || fallbackDateLabel, timeLabel].filter(Boolean).join(", "),
    createdAt: result.createdAt,
    resultUrl: result.outputRef,
    pdfUrl: null,
    downloadFileName:
      outputFileName ??
      `${removeWhitespace(title)}_${fallbackDateLabel}.xlsx`,
  };
}

function sortGeneratedDocuments(
  documents: GeneratedDocumentListItem[],
) {
  return [...documents].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function useGeneratedDocumentsDemoViewModel() {
  const { selectedSiteGeneratedResults, deleteGeneratedResult } =
    useServicePresentationDemoViewModel();
  const backendGeneratedDocumentItems = ref<GeneratedDocumentListItem[]>([]);
  const isBackendGeneratedDocumentsLoading = ref(false);
  const backendGeneratedDocumentsErrorMessage = ref("");

  const demoGeneratedDocumentItems = computed(() =>
    selectedSiteGeneratedResults.value
      .filter((result) => result.type === "document" && result.status === "generated")
      .map(toDemoGeneratedDocumentListItem),
  );

  const generatedDocumentItems = computed(() =>
    sortGeneratedDocuments([
      ...demoGeneratedDocumentItems.value,
      ...backendGeneratedDocumentItems.value,
    ]),
  );

  const generatedDocumentGroups = computed(() =>
    generatedDocumentItems.value.reduce<GeneratedDocumentDateGroup[]>(
      (groups, document) => {
        const dateGroup = formatGeneratedDocumentDateGroup(document.createdAt);
        const existingGroup = groups.find((group) => group.dateKey === dateGroup.key);

        if (existingGroup) {
          existingGroup.documents.push(document);
          return groups;
        }

        groups.push({
          dateKey: dateGroup.key,
          dateLabel: dateGroup.label,
          documents: [document],
        });

        return groups;
      },
      [],
    ),
  );

  const recentGeneratedDocuments = computed(() =>
    sortGeneratedDocuments(
      generatedDocumentGroups.value.flatMap((group) => group.documents),
    ).slice(0, 5),
  );

  const todayDateKey = formatGeneratedDocumentDateKey(new Date());
  const todayGeneratedDocuments = computed(
    () =>
      generatedDocumentGroups.value.find((group) => group.dateKey === todayDateKey)
        ?.documents ?? [],
  );
  const isGeneratedDocumentsLoading = computed(
    () =>
      isBackendGeneratedDocumentsLoading.value &&
      generatedDocumentItems.value.length === 0,
  );
  const generatedDocumentsErrorMessage = computed(() =>
    generatedDocumentItems.value.length === 0
      ? backendGeneratedDocumentsErrorMessage.value
      : "",
  );

  async function refreshGeneratedDocuments() {
    isBackendGeneratedDocumentsLoading.value = true;
    backendGeneratedDocumentsErrorMessage.value = "";

    try {
      const documents = await materialInspectionRequestApi.getDocumentJobList();

      backendGeneratedDocumentItems.value = sortGeneratedDocuments(
        documents
          .filter((document) => document.status === SUCCESS_STATUS)
          .map(toGeneratedDocumentListItem),
      );
    } catch (error) {
      backendGeneratedDocumentsErrorMessage.value =
        error instanceof Error
          ? error.message
          : "생성된 문서 목록을 불러오지 못했습니다.";
      backendGeneratedDocumentItems.value = [];
    } finally {
      isBackendGeneratedDocumentsLoading.value = false;
    }
  }

  function deleteGeneratedDocument(document: GeneratedDocumentListItem) {
    if (!document.demoResultId) {
      return false;
    }

    return deleteGeneratedResult(document.demoResultId);
  }

  function deleteGeneratedDocumentById(demoResultId: string | null) {
    if (!demoResultId) {
      return false;
    }

    return deleteGeneratedResult(demoResultId);
  }

  onMounted(() => {
    void refreshGeneratedDocuments();
  });

  return {
    generatedDocumentGroups,
    recentGeneratedDocuments,
    todayGeneratedDocuments,
    isGeneratedDocumentsLoading,
    generatedDocumentsErrorMessage,
    refreshGeneratedDocuments,
    deleteGeneratedDocument,
    deleteGeneratedDocumentById,
  };
}
