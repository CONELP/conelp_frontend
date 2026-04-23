interface GeneratedDocumentListItem {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
}

interface GeneratedDocumentDateGroup {
  dateKey: string;
  dateLabel: string;
  documents: GeneratedDocumentListItem[];
}

interface GeneratedDocumentSeedItem {
  id: string;
  fileName: string;
  documentLabel: string;
  documentNumber?: string;
  createdAt: string;
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatGeneratedDocumentDate(value: string) {
  const createdAt = new Date(value);
  const year = createdAt.getFullYear();
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  const day = String(createdAt.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function formatGeneratedDocumentTime(value: string) {
  const createdAt = new Date(value);
  const hours = String(createdAt.getHours()).padStart(2, "0");
  const minutes = String(createdAt.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatGeneratedDocumentDateGroup(value: string) {
  const date = new Date(value);
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

const generatedDocumentSeeds: GeneratedDocumentSeedItem[] = [
  {
    id: "generated-daily-report",
    fileName: "2026.04.21 공사일보.pdf",
    documentLabel: "공사일보",
    documentNumber: "DR-2026-0421-01",
    createdAt: "2026-04-22T14:32:00+09:00",
  },
  {
    id: "generated-material-inspection",
    fileName: "2026.04.20 자재반입 검수요청.pdf",
    documentLabel: "자재반입 검수요청",
    documentNumber: "MI-2026-0420-03",
    createdAt: "2026-04-22T11:08:00+09:00",
  },
  {
    id: "generated-concrete-delivery",
    fileName: "2026.04.20 콘크리트 반입시험.pdf",
    documentLabel: "콘크리트 반입시험",
    createdAt: "2026-04-22T09:24:00+09:00",
  },
  {
    id: "generated-concrete-strength",
    fileName: "2026.04.20 콘크리트 압축강도.pdf",
    documentLabel: "콘크리트 압축강도",
    documentNumber: "CS-2026-0420-11",
    createdAt: "2026-04-20T09:16:00+09:00",
  },
  {
    id: "generated-inspection-request",
    fileName: "2026.04.18 검측 요청서.pdf",
    documentLabel: "검측 요청서",
    documentNumber: "IR-2026-0418-02",
    createdAt: "2026-04-18T09:41:00+09:00",
  },
  {
    id: "generated-daily-report-0417-1",
    fileName: "2026.04.17 공사일보.pdf",
    documentLabel: "공사일보",
    createdAt: "2026-04-17T18:22:00+09:00",
  },
  {
    id: "generated-material-inspection-0417-1",
    fileName: "2026.04.17 자재반입 검수요청.pdf",
    documentLabel: "자재반입 검수요청",
    createdAt: "2026-04-17T17:46:00+09:00",
  },
];

export function useGeneratedDocumentsDemoViewModel() {
  const generatedDocumentGroups = generatedDocumentSeeds.reduce<GeneratedDocumentDateGroup[]>(
    (groups, document) => {
      const dateGroup = formatGeneratedDocumentDateGroup(document.createdAt);
      const existingGroup = groups.find((group) => group.dateKey === dateGroup.key);
      const listItem: GeneratedDocumentListItem = {
        id: document.id,
        title: document.documentLabel,
        subtitle: `${
          document.documentNumber ?? formatGeneratedDocumentDate(document.createdAt)
        }, ${formatGeneratedDocumentTime(document.createdAt)}`,
        createdAt: document.createdAt,
      };

      if (existingGroup) {
        existingGroup.documents.push(listItem);
        return groups;
      }

      groups.push({
        dateKey: dateGroup.key,
        dateLabel: dateGroup.label,
        documents: [listItem],
      });

      return groups;
    },
    [],
  );

  const recentGeneratedDocuments = [...generatedDocumentGroups]
    .flatMap((group) => group.documents)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 5);

  const todayDateKey = formatGeneratedDocumentDateKey(new Date());
  const todayGeneratedDocuments =
    generatedDocumentGroups.find((group) => group.dateKey === todayDateKey)
      ?.documents ?? [];

  return {
    generatedDocumentGroups,
    recentGeneratedDocuments,
    todayGeneratedDocuments,
  };
}
