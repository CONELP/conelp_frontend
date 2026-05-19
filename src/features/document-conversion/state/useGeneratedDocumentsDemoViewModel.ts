import { computed, onMounted, ref } from "vue";

import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import type { DocumentJobResponse } from "@/features/document-conversion/api/material-inspection-request-api.types";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";

export interface GeneratedDocumentListItem {
  id: string;
  jobId: number;
  documentType: DocumentCatalogType | null;
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
const DOCUMENT_CATALOG_TYPE_BY_JOB_TYPE: Partial<Record<string, DocumentCatalogType>> = {
  DR: "daily_report_write",
  MIR: "material_registration",
  CAT: "concrete_delivery_csi",
  CCST: "concrete_strength_csi",
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

function resolveGeneratedDocumentDate(document: DocumentJobResponse) {
  return document.createdAt ?? document.completedAt ?? document.startedAt ?? "";
}

function resolveGeneratedDocumentTitle(document: DocumentJobResponse) {
  return DOCUMENT_LABEL_BY_TYPE[document.docType] ?? document.docType;
}

function resolveGeneratedDocumentCatalogType(document: DocumentJobResponse) {
  return DOCUMENT_CATALOG_TYPE_BY_JOB_TYPE[document.docType] ?? null;
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
    documentType: resolveGeneratedDocumentCatalogType(document),
    title,
    subtitle: [subtitleBase, timeLabel].filter(Boolean).join(", "),
    createdAt,
    resultUrl: document.resultUrl,
    pdfUrl: document.pdfUrl,
    downloadFileName: `${documentName}_${docNo}${resolveGeneratedDocumentFileExtension(sourceUrl)}`,
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
  const generatedDocumentItems = ref<GeneratedDocumentListItem[]>([]);
  const isGeneratedDocumentsLoading = ref(false);
  const generatedDocumentsErrorMessage = ref("");

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

  async function refreshGeneratedDocuments() {
    isGeneratedDocumentsLoading.value = true;
    generatedDocumentsErrorMessage.value = "";

    try {
      const documents = await materialInspectionRequestApi.getDocumentJobList();

      generatedDocumentItems.value = sortGeneratedDocuments(
        documents
          .filter((document) => document.status === SUCCESS_STATUS)
          .map(toGeneratedDocumentListItem),
      );
    } catch (error) {
      generatedDocumentsErrorMessage.value =
        error instanceof Error
          ? error.message
          : "생성된 문서 목록을 불러오지 못했습니다.";
      generatedDocumentItems.value = [];
    } finally {
      isGeneratedDocumentsLoading.value = false;
    }
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
  };
}
