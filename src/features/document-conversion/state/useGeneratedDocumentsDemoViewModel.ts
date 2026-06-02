import { computed, onMounted, ref, watch } from "vue";

import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import type { DocumentJobResponse } from "@/features/document-conversion/api/material-inspection-request-api.types";
import { documentCatalog } from "@/features/document-conversion/data/document-conversion-demo.seed";
import type { DocumentCatalogType } from "@/features/document-conversion/model/document-conversion-demo.types";
import {
  useBackgroundDocumentJobsStore,
  type BackgroundDocumentJob,
} from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";

export type GeneratedDocumentStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "APPROVED"
  | "UNKNOWN";

export type GeneratedDocumentStatusTone =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "approved"
  | "unknown";

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
  status: GeneratedDocumentStatus;
  statusLabel: string;
  statusTone: GeneratedDocumentStatusTone;
  isDownloadable: boolean;
}

interface GeneratedDocumentDateGroup {
  dateKey: string;
  dateLabel: string;
  documents: GeneratedDocumentListItem[];
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const STATUS_LABEL: Record<GeneratedDocumentStatus, string> = {
  PENDING: "대기중",
  RUNNING: "생성중",
  SUCCEEDED: "생성됨",
  FAILED: "생성실패",
  APPROVED: "승인됨",
  UNKNOWN: "알 수 없음",
};
const STATUS_TONE: Record<GeneratedDocumentStatus, GeneratedDocumentStatusTone> = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  APPROVED: "approved",
  UNKNOWN: "unknown",
};
const DOWNLOADABLE_STATUSES: ReadonlyArray<GeneratedDocumentStatus> = [
  "SUCCEEDED",
  "APPROVED",
];
const DOCUMENT_LABEL_BY_TYPE: Record<string, string> = {
  DR: "일일 작업일보",
  MIR: "자재 반입 검수요청",
  CAT: "콘크리트 타설 요청",
  CCST: "압축강도 시험 의뢰",
  MAT_INOUT: "자재 수불현황표",
  SCHEDULE_3WEEK: "3주 공정표",
  SCHEDULE_3MONTH: "3개월 공정표",
};
const DOCUMENT_CATALOG_TYPE_BY_JOB_TYPE: Partial<Record<string, DocumentCatalogType>> = {
  DR: "daily_report_write",
  MIR: "material_registration",
  CAT: "concrete_delivery_csi",
  CCST: "concrete_strength_csi",
  MAT_INOUT: "material_supply_status",
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

function resolveGeneratedDocumentStatus(
  document: DocumentJobResponse,
): GeneratedDocumentStatus {
  switch (document.status) {
    case "PENDING":
    case "RUNNING":
    case "SUCCEEDED":
    case "FAILED":
    case "APPROVED":
      return document.status;
    default:
      return "UNKNOWN";
  }
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
  const status = resolveGeneratedDocumentStatus(document);

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
    status,
    statusLabel: STATUS_LABEL[status],
    statusTone: STATUS_TONE[status],
    isDownloadable: DOWNLOADABLE_STATUSES.includes(status),
  };
}

function resolvePendingCatalogType(
  documentType: string,
): DocumentCatalogType | null {
  return documentCatalog.some((document) => document.type === documentType)
    ? (documentType as DocumentCatalogType)
    : null;
}

// 인메모리 백그라운드 잡(아직 서버 목록에 안 뜬 진행중 잡)을 목록 아이템으로 변환.
// 동기 생성(자재 수불현황표 등)도 다른 문서처럼 "생성중"으로 보이게 통일.
function toPendingGeneratedDocumentListItem(
  job: BackgroundDocumentJob,
): GeneratedDocumentListItem {
  const createdAt = new Date(job.startedAt).toISOString();
  const timeLabel = formatGeneratedDocumentTime(createdAt);

  return {
    id: `pending-${job.id}`,
    jobId: -1,
    documentType: resolvePendingCatalogType(job.documentType),
    title: job.documentTypeLabel,
    subtitle: [job.summary, timeLabel].filter(Boolean).join(", "),
    createdAt,
    resultUrl: null,
    pdfUrl: null,
    downloadFileName: "",
    status: "RUNNING",
    statusLabel: STATUS_LABEL.RUNNING,
    statusTone: STATUS_TONE.RUNNING,
    isDownloadable: false,
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
  const backgroundJobs = useBackgroundDocumentJobsStore();

  // 서버 목록에서 이미 진행중(RUNNING/PENDING)으로 내려온 docType 집합.
  const inProgressServerTypes = computed(() => {
    const types = new Set<string>();
    generatedDocumentItems.value.forEach((item) => {
      if (
        item.documentType &&
        (item.status === "RUNNING" || item.status === "PENDING")
      ) {
        types.add(item.documentType);
      }
    });
    return types;
  });

  // 진행중 인메모리 잡(서버 목록 미반영분만) + 서버 생성 목록 병합.
  // 서버가 같은 docType 을 이미 진행중으로 내려주면 인메모리 pending 은 숨겨 이중 표시 방지.
  const pendingDocumentItems = computed(() =>
    backgroundJobs.activeJobs
      .map(toPendingGeneratedDocumentListItem)
      .filter(
        (item) =>
          !item.documentType ||
          !inProgressServerTypes.value.has(item.documentType),
      ),
  );

  const mergedDocumentItems = computed(() => [
    ...pendingDocumentItems.value,
    ...generatedDocumentItems.value,
  ]);

  const generatedDocumentGroups = computed(() =>
    mergedDocumentItems.value.reduce<GeneratedDocumentDateGroup[]>(
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
        documents.map(toGeneratedDocumentListItem),
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

  watch(
    () => backgroundJobs.completionSignal,
    () => {
      void refreshGeneratedDocuments();
    },
  );

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
