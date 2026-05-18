<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import imageIcon from "@fluentui/svg-icons/icons/image_20_regular.svg";
import chevronLeftIcon from "@fluentui/svg-icons/icons/chevron_left_20_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import chevronDoubleLeftIcon from "@fluentui/svg-icons/icons/chevron_double_left_20_regular.svg";
import chevronDoubleRightIcon from "@fluentui/svg-icons/icons/chevron_double_right_20_regular.svg";

import { actualWorkApi } from "@/features/document-conversion-demo/api/actual-work.api";
import type { ActualWorkResponse } from "@/features/document-conversion-demo/api/actual-work-api.types";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";

const { patchLoadedWorkActualDates } = useDesktopScheduleViewModel();

function applyActualWorkAffectedWorks(response: ActualWorkResponse) {
  if (response.affectedWorks?.length) {
    patchLoadedWorkActualDates(response.affectedWorks);
  }
}

type DailyReportWorkSection = "today" | "tomorrow";
type DailyReportEditorTabId =
  | "summary"
  | "todayWork"
  | "tomorrowWork"
  | "labor"
  | "material"
  | "equipment";
type DailyReportResourceKind = Extract<
  DailyReportEditorTabId,
  "labor" | "material" | "equipment"
>;

type DailyReportEditorTab = {
  id: DailyReportEditorTabId;
  label: string;
};

type DailyReportResourceColumnConfig = {
  key: string;
  label: string;
};

const DAILY_REPORT_EDITOR_TABS: DailyReportEditorTab[] = [
  { id: "summary", label: "요약" },
  { id: "todayWork", label: "오늘" },
  { id: "tomorrowWork", label: "내일" },
  { id: "labor", label: "인력" },
  { id: "material", label: "자재" },
  { id: "equipment", label: "장비" },
];

const HOMEPAGE_IMPORT_MIN_DURATION_MS = 2500;
const DAILY_REPORT_RESOURCE_COLUMN_WIDTH_STORAGE_KEY =
  "conelp.dailyReport.resourceColumnWidths.v1";
const DAILY_REPORT_RESOURCE_COLUMN_MIN_WIDTH = 32;
const DAILY_REPORT_RESOURCE_COLUMN_MAX_WIDTH = 320;
const DAILY_REPORT_RESOURCE_COLUMNS = {
  labor: [
    { key: "workType", label: "공종" },
    { key: "subWorkType", label: "세부공종" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
  material: [
    { key: "workType", label: "공종" },
    { key: "type", label: "타입" },
    { key: "specification", label: "규격" },
    { key: "unit", label: "단위" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
  equipment: [
    { key: "process", label: "공정" },
    { key: "type", label: "타입" },
    { key: "specification", label: "규격" },
    { key: "unit", label: "단위" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
} satisfies Record<DailyReportResourceKind, readonly DailyReportResourceColumnConfig[]>;
const DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS = {
  labor: [124, 124, 82, 88],
  material: [124, 112, 112, 72, 82, 88],
  equipment: [124, 112, 112, 72, 82, 88],
} satisfies Record<DailyReportResourceKind, number[]>;

const DAILY_REPORT_LABOR_SUMMARY_WORK_TYPE_ALIASES: Record<string, string> = {
  RC공사: "철콘",
  철근콘크리트공사: "철콘",
  철콘공사: "철콘",
};

type DailyReportImageDraft = {
  id: string;
  src: string;
  description: string;
};

type DailyReportImageDropPosition = "before" | "after";

type DailyReportImageDragState = {
  section: DailyReportWorkSection;
  imageId: string;
};

type DailyReportImageDragOverState = DailyReportImageDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportResourceColumnResizeState = {
  kind: DailyReportResourceKind;
  columnIndex: number;
  startClientX: number;
  startWidth: number;
};

type DailyReportTaskDraft = {
  id: string;
  text: string;
  actualWorkId: number | null;
  isSyncing: boolean;
  hasReceivedResponse: boolean;
};

type DailyReportWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  tasks: DailyReportTaskDraft[];
};

type DailyReportQuantityDraft = {
  id: string;
  previousQuantity: number;
  todayQuantity: string;
};

type DailyReportMaterialDraft = DailyReportQuantityDraft & {
  workType: string;
  type: string;
  specification: string;
  unit: string;
};

type DailyReportEquipmentDraft = DailyReportQuantityDraft & {
  process: string;
  type: string;
  specification: string;
  unit: string;
};

type DailyReportLaborDraft = DailyReportQuantityDraft & {
  workType: string;
  subWorkType: string;
};

type DailyReportLaborGroup = {
  key: string;
  workType: string;
  rows: DailyReportLaborDraft[];
};

type DailyReportMaterialAddDraft = Pick<
  DailyReportMaterialDraft,
  "workType" | "type" | "specification" | "unit"
>;

type DailyReportEquipmentAddDraft = Pick<
  DailyReportEquipmentDraft,
  "process" | "type" | "specification" | "unit"
>;

type DailyReportLaborAddDraft = Pick<
  DailyReportLaborDraft,
  "workType" | "subWorkType"
>;

type DailyReportResourceAddFormState = Record<DailyReportResourceKind, boolean>;
type DailyReportResourceColumnWidthState = Record<DailyReportResourceKind, number[]>;

type DailyReportWorkTypeSuggestionState = {
  suggestions: WorkTypeReferenceResponse[];
  isLoading: boolean;
  errorMessage: string;
  isOpen: boolean;
  highlightedIndex: number;
  requestId: number;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

const todayImageInputRef = ref<HTMLInputElement | null>(null);
const tomorrowImageInputRef = ref<HTMLInputElement | null>(null);
const imageDragState = ref<DailyReportImageDragState | null>(null);
const imageDragOverState = ref<DailyReportImageDragOverState | null>(null);
const resourceColumnResizeState =
  ref<DailyReportResourceColumnResizeState | null>(null);
const todayWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const tomorrowWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const todayImages = ref<DailyReportImageDraft[]>([]);
const tomorrowImages = ref<DailyReportImageDraft[]>([]);
const materialRows = ref<DailyReportMaterialDraft[]>(
  createDefaultDailyReportMaterialRows(),
);
const equipmentRows = ref<DailyReportEquipmentDraft[]>(
  createDefaultDailyReportEquipmentRows(),
);
const laborRows = ref<DailyReportLaborDraft[]>(createDefaultDailyReportLaborRows());
const laborRowGroups = computed<DailyReportLaborGroup[]>(() => {
  const groups: DailyReportLaborGroup[] = [];
  const groupByWorkType = new Map<string, DailyReportLaborGroup>();

  laborRows.value.forEach((row) => {
    const groupKey = row.workType.trim() || row.id;
    let group = groupByWorkType.get(groupKey);

    if (!group) {
      group = {
        key: groupKey,
        workType: row.workType,
        rows: [],
      };
      groupByWorkType.set(groupKey, group);
      groups.push(group);
    }

    group.rows.push(row);
  });

  return groups;
});
const dailyReportLaborSummaryItems = computed(() => {
  return laborRowGroups.value
    .map((group) => {
      const details = group.rows
        .map((row) => ({
          label: getDailyReportLaborSummaryDetailName(row.subWorkType),
          quantity: parseDailyReportQuantity(row.todayQuantity),
        }))
        .filter((detail) => detail.quantity > 0);
      const totalQuantity = details.reduce(
        (sum, detail) => sum + detail.quantity,
        0,
      );

      return {
        workType: getDailyReportLaborSummaryWorkTypeName(group.workType),
        totalQuantity,
        details,
      };
    })
    .filter((summary) => summary.totalQuantity > 0)
    .map((summary, summaryIndex) => {
      const detailText =
        summary.details.length > 1
          ? `(${summary.details
              .map(
                (detail) =>
                  `${detail.label}${formatDailyReportQuantity(detail.quantity)}`,
              )
              .join(",")})`
          : "";

      return `${summaryIndex + 1}.${summary.workType}:${formatDailyReportQuantity(
        summary.totalQuantity,
      )}명${detailText}`;
    });
});
const dailyReportTodayWorkSummaryGroups = computed(() => {
  const grouped: Array<{ workTypeName: string; lines: string[] }> = [];
  const indexByName = new Map<string, number>();

  todayWorkTypes.value.forEach((workType) => {
    const name = workType.workTypeName.trim();
    const lines = workType.tasks
      .flatMap((task) => task.text.split(/\r?\n/))
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!name || lines.length === 0) {
      return;
    }

    const existingIndex = indexByName.get(name);
    if (existingIndex !== undefined) {
      grouped[existingIndex]!.lines.push(...lines);
      return;
    }

    indexByName.set(name, grouped.length);
    grouped.push({ workTypeName: name, lines });
  });

  return grouped;
});
const resourceColumnWidths = ref<DailyReportResourceColumnWidthState>(
  readStoredDailyReportResourceColumnWidths(),
);
const resourceAddFormsOpen = ref<DailyReportResourceAddFormState>({
  labor: false,
  material: false,
  equipment: false,
});
const materialAddDraft = ref<DailyReportMaterialAddDraft>(
  createDailyReportMaterialAddDraft(),
);
const equipmentAddDraft = ref<DailyReportEquipmentAddDraft>(
  createDailyReportEquipmentAddDraft(),
);
const laborAddDraft = ref<DailyReportLaborAddDraft>(createDailyReportLaborAddDraft());
const previewImage = ref<DailyReportImageDraft | null>(null);
const activeDailyReportTab = ref<DailyReportEditorTabId>("todayWork");
const workTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const homepageImportStatus = ref<"idle" | "loading" | "error">("idle");
const taskSyncRequestIds = new Map<string, number>();
const pendingTaskDeletes = new Set<string>();

function createDailyReportId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `daily-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDailyReportTask(text = ""): DailyReportTaskDraft {
  return {
    id: createDailyReportId(),
    text,
    actualWorkId: null,
    isSyncing: false,
    hasReceivedResponse: false,
  };
}

function createDailyReportTaskFromResponse(
  response: ActualWorkResponse,
): DailyReportTaskDraft {
  return {
    id: createDailyReportId(),
    text: response.context,
    actualWorkId: response.id,
    isSyncing: false,
    hasReceivedResponse: true,
  };
}

function createDailyReportWorkTypeDraft(
  taskText = "",
): DailyReportWorkTypeDraft {
  return {
    id: createDailyReportId(),
    workTypeId: null,
    workTypeName: "",
    tasks: [createDailyReportTask(taskText)],
  };
}

function createDailyReportMaterialRow(
  input: Omit<DailyReportMaterialDraft, "id" | "todayQuantity"> & {
    todayQuantity?: string;
  },
): DailyReportMaterialDraft {
  return {
    ...input,
    id: createDailyReportId(),
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportEquipmentRow(
  input: Omit<DailyReportEquipmentDraft, "id" | "todayQuantity"> & {
    todayQuantity?: string;
  },
): DailyReportEquipmentDraft {
  return {
    ...input,
    id: createDailyReportId(),
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportLaborRow(
  input: Omit<DailyReportLaborDraft, "id" | "todayQuantity"> & {
    todayQuantity?: string;
  },
): DailyReportLaborDraft {
  return {
    ...input,
    id: createDailyReportId(),
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportMaterialAddDraft(): DailyReportMaterialAddDraft {
  return {
    workType: "",
    type: "",
    specification: "",
    unit: "",
  };
}

function createDailyReportEquipmentAddDraft(): DailyReportEquipmentAddDraft {
  return {
    process: "",
    type: "",
    specification: "",
    unit: "",
  };
}

function createDailyReportLaborAddDraft(): DailyReportLaborAddDraft {
  return {
    workType: "",
    subWorkType: "",
  };
}

function createDefaultDailyReportMaterialRows(): DailyReportMaterialDraft[] {
  return [
    createDailyReportMaterialRow({
      workType: "콘크리트공사",
      type: "레미콘",
      specification: "13-21-150",
      unit: "m3",
      previousQuantity: 36,
    }),
    createDailyReportMaterialRow({
      workType: "콘크리트공사",
      type: "레미콘",
      specification: "25-18-120",
      unit: "m3",
      previousQuantity: 60,
    }),
    createDailyReportMaterialRow({
      workType: "콘크리트공사",
      type: "레미콘",
      specification: "25-18-150",
      unit: "m3",
      previousQuantity: 78,
    }),
    createDailyReportMaterialRow({
      workType: "콘크리트공사",
      type: "레미콘",
      specification: "25-30-150",
      unit: "m3",
      previousQuantity: 1326,
    }),
    createDailyReportMaterialRow({
      workType: "철근공사",
      type: "SD400",
      specification: "D10",
      unit: "TON",
      previousQuantity: 39,
    }),
    createDailyReportMaterialRow({
      workType: "철근공사",
      type: "SD400",
      specification: "D13",
      unit: "TON",
      previousQuantity: 54,
    }),
    createDailyReportMaterialRow({
      workType: "철근공사",
      type: "SD400",
      specification: "D16",
      unit: "TON",
      previousQuantity: 14,
    }),
    createDailyReportMaterialRow({
      workType: "철근공사",
      type: "SD500",
      specification: "D19",
      unit: "TON",
      previousQuantity: 30.5,
    }),
    createDailyReportMaterialRow({
      workType: "철근공사",
      type: "SD500",
      specification: "D22",
      unit: "TON",
      previousQuantity: 125,
    }),
  ];
}

function createDefaultDailyReportEquipmentRows(): DailyReportEquipmentDraft[] {
  return [
    createDailyReportEquipmentRow({
      process: "토공사",
      type: "굴착기",
      specification: "017",
      unit: "대",
      previousQuantity: 5,
    }),
    createDailyReportEquipmentRow({
      process: "토공사",
      type: "굴착기",
      specification: "035",
      unit: "대",
      previousQuantity: 30,
    }),
    createDailyReportEquipmentRow({
      process: "토공사",
      type: "굴착기",
      specification: "06",
      unit: "대",
      previousQuantity: 88,
    }),
    createDailyReportEquipmentRow({
      process: "토공사",
      type: "굴착기",
      specification: "08",
      unit: "대",
      previousQuantity: 117,
    }),
    createDailyReportEquipmentRow({
      process: "토공사",
      type: "로더",
      specification: "5.5ton",
      unit: "대",
      previousQuantity: 3,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "지게차",
      specification: "",
      unit: "HR",
      previousQuantity: 14,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "덤프트럭",
      specification: "25ton",
      unit: "대",
      previousQuantity: 564,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "카고트럭",
      specification: "1ton",
      unit: "대",
      previousQuantity: 12,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "카고트럭",
      specification: "2.5ton",
      unit: "대",
      previousQuantity: 33,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "카고트럭",
      specification: "3.5ton",
      unit: "대",
      previousQuantity: 1,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "카고트럭",
      specification: "5ton",
      unit: "대",
      previousQuantity: 4,
    }),
    createDailyReportEquipmentRow({
      process: "운반",
      type: "카고트럭",
      specification: "25ton",
      unit: "대",
      previousQuantity: 0,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "암롤트럭",
      specification: "25ton",
      unit: "대",
      previousQuantity: 8,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "기중기",
      specification: "12ton",
      unit: "대",
      previousQuantity: 4,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "기중기",
      specification: "16ton",
      unit: "대",
      previousQuantity: 4,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "기중기",
      specification: "20ton",
      unit: "대",
      previousQuantity: 5,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "기중기",
      specification: "25ton",
      unit: "대",
      previousQuantity: 3,
    }),
    createDailyReportEquipmentRow({
      process: "양중",
      type: "기중기",
      specification: "70ton",
      unit: "대",
      previousQuantity: 2,
    }),
    createDailyReportEquipmentRow({
      process: "가설공사",
      type: "거미크레인",
      specification: "",
      unit: "대",
      previousQuantity: 1,
    }),
    createDailyReportEquipmentRow({
      process: "타설",
      type: "펌프카",
      specification: "",
      unit: "대",
      previousQuantity: 13,
    }),
    createDailyReportEquipmentRow({
      process: "기타",
      type: "공기압축기",
      specification: "",
      unit: "대",
      previousQuantity: 17,
    }),
    createDailyReportEquipmentRow({
      process: "기타",
      type: "천공기",
      specification: "",
      unit: "대",
      previousQuantity: 23,
    }),
  ];
}

function createDefaultDailyReportLaborRows(): DailyReportLaborDraft[] {
  return [
    createDailyReportLaborRow({
      workType: "관리",
      subWorkType: "직원",
      previousQuantity: 1165,
      todayQuantity: "4",
    }),
    createDailyReportLaborRow({
      workType: "관리",
      subWorkType: "직영",
      previousQuantity: 363,
      todayQuantity: "2",
    }),
    createDailyReportLaborRow({
      workType: "가설공사",
      subWorkType: "가설휀스",
      previousQuantity: 23,
    }),
    createDailyReportLaborRow({
      workType: "가설공사",
      subWorkType: "시스템비계",
      previousQuantity: 0,
    }),
    createDailyReportLaborRow({
      workType: "가설공사",
      subWorkType: "타워크레인",
      previousQuantity: 15,
    }),
    createDailyReportLaborRow({
      workType: "RC공사",
      subWorkType: "직영",
      previousQuantity: 28,
    }),
    createDailyReportLaborRow({
      workType: "RC공사",
      subWorkType: "RC",
      previousQuantity: 1766,
      todayQuantity: "22",
    }),
    createDailyReportLaborRow({
      workType: "철골공사",
      subWorkType: "",
      previousQuantity: 10,
    }),
    createDailyReportLaborRow({
      workType: "조적공사",
      subWorkType: "",
      previousQuantity: 0,
    }),
    createDailyReportLaborRow({
      workType: "석공사",
      subWorkType: "석재",
      previousQuantity: 25,
    }),
    createDailyReportLaborRow({
      workType: "타일공사",
      subWorkType: "",
      previousQuantity: 0,
    }),
    createDailyReportLaborRow({
      workType: "목공사",
      subWorkType: "",
      previousQuantity: 0,
    }),
    createDailyReportLaborRow({
      workType: "한옥공사",
      subWorkType: "",
      previousQuantity: 0,
    }),
    createDailyReportLaborRow({
      workType: "방수공사",
      subWorkType: "",
      previousQuantity: 67,
    }),
    createDailyReportLaborRow({
      workType: "금속공사",
      subWorkType: "금속",
      previousQuantity: 90,
    }),
    createDailyReportLaborRow({
      workType: "미장공사",
      subWorkType: "종석미장",
      previousQuantity: 6,
    }),
  ];
}

function createDefaultDailyReportResourceColumnWidths(): DailyReportResourceColumnWidthState {
  return {
    labor: [...DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS.labor],
    material: [...DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS.material],
    equipment: [...DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS.equipment],
  };
}

function clampDailyReportResourceColumnWidth(value: number) {
  if (!Number.isFinite(value)) {
    return DAILY_REPORT_RESOURCE_COLUMN_MIN_WIDTH;
  }

  return Math.min(
    Math.max(value, DAILY_REPORT_RESOURCE_COLUMN_MIN_WIDTH),
    DAILY_REPORT_RESOURCE_COLUMN_MAX_WIDTH,
  );
}

function normalizeDailyReportResourceColumnWidths(
  kind: DailyReportResourceKind,
  value: unknown,
) {
  const defaultWidths = DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS[kind];

  if (!Array.isArray(value)) {
    return [...defaultWidths];
  }

  return defaultWidths.map((defaultWidth, columnIndex) => {
    const parsedWidth = Number(value[columnIndex]);
    return clampDailyReportResourceColumnWidth(
      Number.isFinite(parsedWidth) ? parsedWidth : defaultWidth,
    );
  });
}

function readStoredDailyReportResourceColumnWidths(): DailyReportResourceColumnWidthState {
  const defaultWidths = createDefaultDailyReportResourceColumnWidths();

  if (typeof window === "undefined") {
    return defaultWidths;
  }

  try {
    const storedValue = window.localStorage.getItem(
      DAILY_REPORT_RESOURCE_COLUMN_WIDTH_STORAGE_KEY,
    );

    if (!storedValue) {
      return defaultWidths;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<
      Record<DailyReportResourceKind, unknown>
    >;

    return {
      labor: normalizeDailyReportResourceColumnWidths("labor", parsedValue.labor),
      material: normalizeDailyReportResourceColumnWidths(
        "material",
        parsedValue.material,
      ),
      equipment: normalizeDailyReportResourceColumnWidths(
        "equipment",
        parsedValue.equipment,
      ),
    };
  } catch (error) {
    console.warn("daily report resource column width restore failed", error);
    return defaultWidths;
  }
}

function persistDailyReportResourceColumnWidths() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_RESOURCE_COLUMN_WIDTH_STORAGE_KEY,
    JSON.stringify(resourceColumnWidths.value),
  );
}

function getDailyReportResourceColumnWidths(kind: DailyReportResourceKind) {
  return resourceColumnWidths.value[kind];
}

function getDailyReportResourceTableWidth(kind: DailyReportResourceKind) {
  return getDailyReportResourceColumnWidths(kind).reduce(
    (sum, width) => sum + width,
    0,
  );
}

function getDailyReportResourceTableStyle(kind: DailyReportResourceKind) {
  const tableWidth = getDailyReportResourceTableWidth(kind);

  return {
    width: `${tableWidth}px`,
    minWidth: `${tableWidth}px`,
  };
}

function getDailyReportResourceColumnStyle(
  kind: DailyReportResourceKind,
  columnIndex: number,
) {
  return {
    width: `${getDailyReportResourceColumnWidths(kind)[columnIndex]}px`,
  };
}

function setDailyReportResourceColumnWidth(
  kind: DailyReportResourceKind,
  columnIndex: number,
  width: number,
) {
  const nextWidths = [...resourceColumnWidths.value[kind]];
  nextWidths[columnIndex] = clampDailyReportResourceColumnWidth(width);
  resourceColumnWidths.value = {
    ...resourceColumnWidths.value,
    [kind]: nextWidths,
  };
}

function startDailyReportResourceColumnResize(
  kind: DailyReportResourceKind,
  columnIndex: number,
  event: PointerEvent,
) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  resourceColumnResizeState.value = {
    kind,
    columnIndex,
    startClientX: event.clientX,
    startWidth: getDailyReportResourceColumnWidths(kind)[columnIndex],
  };

  window.addEventListener("pointermove", handleDailyReportResourceColumnResize);
  window.addEventListener("pointerup", stopDailyReportResourceColumnResize);
  window.addEventListener("pointercancel", stopDailyReportResourceColumnResize);
}

function handleDailyReportResourceColumnResize(event: PointerEvent) {
  const resizeState = resourceColumnResizeState.value;

  if (!resizeState) {
    return;
  }

  setDailyReportResourceColumnWidth(
    resizeState.kind,
    resizeState.columnIndex,
    resizeState.startWidth + event.clientX - resizeState.startClientX,
  );
}

function stopDailyReportResourceColumnResize() {
  if (resourceColumnResizeState.value) {
    persistDailyReportResourceColumnWidths();
  }

  resourceColumnResizeState.value = null;
  window.removeEventListener("pointermove", handleDailyReportResourceColumnResize);
  window.removeEventListener("pointerup", stopDailyReportResourceColumnResize);
  window.removeEventListener("pointercancel", stopDailyReportResourceColumnResize);
}

function handleDailyReportResourceColumnResizeKeydown(
  kind: DailyReportResourceKind,
  columnIndex: number,
  event: KeyboardEvent,
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  const direction = event.key === "ArrowLeft" ? -1 : 1;
  const step = event.shiftKey ? 24 : 8;

  setDailyReportResourceColumnWidth(
    kind,
    columnIndex,
    getDailyReportResourceColumnWidths(kind)[columnIndex] + direction * step,
  );
  persistDailyReportResourceColumnWidths();
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function addDays(value: string, delta: number) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + delta);
  return formatLocalDate(date);
}

function addMonths(value: string, delta: number) {
  const date = parseLocalDate(value);
  const targetMonth = date.getMonth() + delta;
  const targetYear = date.getFullYear();
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  date.setDate(Math.min(date.getDate(), lastDayOfTarget));
  date.setMonth(targetMonth);
  return formatLocalDate(date);
}

const selectedReportDate = ref<string>(formatLocalDate(new Date()));

const reportDates = computed(() => ({
  today: selectedReportDate.value,
  tomorrow: addDays(selectedReportDate.value, 1),
}));

const isCalendarOpen = ref(false);
const calendarViewMonth = ref<string>(selectedReportDate.value.slice(0, 7));
const calendarRootRef = ref<HTMLDivElement | null>(null);

const REPORT_DATE_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const calendarMonthLabel = computed(() => {
  const [year, month] = calendarViewMonth.value.split("-").map(Number);
  return `${year}년 ${month}월`;
});

type CalendarCell = {
  key: string;
  date: string | null;
  day: number | null;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};

const calendarCells = computed<CalendarCell[]>(() => {
  const [year, month] = calendarViewMonth.value.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = formatLocalDate(new Date());
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      key: `lead-${i}`,
      date: null,
      day: null,
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    cells.push({
      key: dateStr,
      date: dateStr,
      day,
      isCurrentMonth: true,
      isSelected: dateStr === selectedReportDate.value,
      isToday: dateStr === todayStr,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `tail-${cells.length}`,
      date: null,
      day: null,
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
    });
  }

  return cells;
});

const selectedReportDateLabel = computed(() => {
  const date = parseLocalDate(selectedReportDate.value);
  const weekday = REPORT_DATE_WEEKDAYS[date.getDay()];
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} (${weekday})`;
});

function shiftReportDate(delta: number, unit: "day" | "month") {
  selectedReportDate.value =
    unit === "day"
      ? addDays(selectedReportDate.value, delta)
      : addMonths(selectedReportDate.value, delta);
}

function toggleReportDateCalendar() {
  isCalendarOpen.value = !isCalendarOpen.value;
  if (isCalendarOpen.value) {
    calendarViewMonth.value = selectedReportDate.value.slice(0, 7);
  }
}

function closeReportDateCalendar() {
  isCalendarOpen.value = false;
}

function shiftCalendarMonth(delta: number) {
  calendarViewMonth.value = addMonths(`${calendarViewMonth.value}-01`, delta).slice(0, 7);
}

function pickCalendarDate(date: string | null) {
  if (!date) {
    return;
  }
  selectedReportDate.value = date;
  isCalendarOpen.value = false;
}

function jumpToToday() {
  pickCalendarDate(formatLocalDate(new Date()));
}

function handleReportDateOutsideClick(event: MouseEvent) {
  if (!isCalendarOpen.value) {
    return;
  }
  const target = event.target as Node | null;
  if (target && calendarRootRef.value && !calendarRootRef.value.contains(target)) {
    isCalendarOpen.value = false;
  }
}

watch(selectedReportDate, () => {
  void hydrateDailyReportFromServer();
});

function getSectionDate(section: DailyReportWorkSection) {
  return section === "today" ? reportDates.value.today : reportDates.value.tomorrow;
}

function getImageInputRef(section: DailyReportWorkSection) {
  return section === "today" ? todayImageInputRef.value : tomorrowImageInputRef.value;
}

function getWorkTypeDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayWorkTypes.value : tomorrowWorkTypes.value;
}

function ensureDefaultWorkTypes(workTypes: DailyReportWorkTypeDraft[]) {
  return workTypes.length > 0 ? workTypes : [createDailyReportWorkTypeDraft()];
}

function setWorkTypeDrafts(
  section: DailyReportWorkSection,
  workTypes: DailyReportWorkTypeDraft[],
) {
  const nextWorkTypes = ensureDefaultWorkTypes(workTypes);

  if (section === "today") {
    todayWorkTypes.value = nextWorkTypes;
    return;
  }

  tomorrowWorkTypes.value = nextWorkTypes;
}

function getImageDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayImages.value : tomorrowImages.value;
}

function setImageDrafts(
  section: DailyReportWorkSection,
  images: DailyReportImageDraft[],
) {
  if (section === "today") {
    todayImages.value = images;
    return;
  }

  tomorrowImages.value = images;
}

function findSectionForWorkType(
  workType: DailyReportWorkTypeDraft,
): DailyReportWorkSection | null {
  if (todayWorkTypes.value.some((entry) => entry.id === workType.id)) {
    return "today";
  }

  if (tomorrowWorkTypes.value.some((entry) => entry.id === workType.id)) {
    return "tomorrow";
  }

  return null;
}

function nextSyncRequestId(taskId: string) {
  const next = (taskSyncRequestIds.get(taskId) ?? 0) + 1;
  taskSyncRequestIds.set(taskId, next);
  return next;
}

function isLatestSync(taskId: string, requestId: number) {
  return taskSyncRequestIds.get(taskId) === requestId;
}

function applyResponseToTask(
  task: DailyReportTaskDraft,
  response: ActualWorkResponse,
) {
  task.actualWorkId = response.id;
  task.hasReceivedResponse = true;
}

async function syncTaskCreate(
  task: DailyReportTaskDraft,
  workType: DailyReportWorkTypeDraft,
  section: DailyReportWorkSection,
) {
  if (workType.workTypeId === null) {
    return;
  }

  const trimmedName = task.text.trim();

  if (!trimmedName) {
    return;
  }

  const requestId = nextSyncRequestId(task.id);
  task.isSyncing = true;

  try {
    const response = await actualWorkApi.create({
      date: getSectionDate(section),
      workTypeId: workType.workTypeId,
      context: trimmedName,
    });

    if (!isLatestSync(task.id, requestId)) {
      return;
    }

    if (pendingTaskDeletes.has(task.id)) {
      pendingTaskDeletes.delete(task.id);
      const deleteResponse = await actualWorkApi.delete(response.id);
      applyActualWorkAffectedWorks(deleteResponse);
      return;
    }

    applyResponseToTask(task, response);
    applyActualWorkAffectedWorks(response);
  } catch (error) {
    console.error("createActualWork failed", error);
  } finally {
    if (isLatestSync(task.id, requestId)) {
      task.isSyncing = false;
    }
  }
}

async function syncTaskUpdate(
  task: DailyReportTaskDraft,
  patch: { workTypeId?: number; context?: string },
) {
  if (task.actualWorkId === null) {
    return;
  }

  const body = {
    ...(typeof patch.workTypeId === "number" ? { workTypeId: patch.workTypeId } : {}),
    ...(typeof patch.context === "string" ? { context: patch.context } : {}),
  };

  if (Object.keys(body).length === 0) {
    return;
  }

  const requestId = nextSyncRequestId(task.id);
  task.isSyncing = true;

  try {
    const response = await actualWorkApi.update(task.actualWorkId, body);

    if (!isLatestSync(task.id, requestId)) {
      return;
    }

    applyResponseToTask(task, response);
    applyActualWorkAffectedWorks(response);
  } catch (error) {
    console.error("updateActualWork failed", error);
  } finally {
    if (isLatestSync(task.id, requestId)) {
      task.isSyncing = false;
    }
  }
}

async function syncTaskDelete(task: DailyReportTaskDraft) {
  if (task.actualWorkId === null) {
    pendingTaskDeletes.add(task.id);
    return;
  }

  try {
    const response = await actualWorkApi.delete(task.actualWorkId);
    applyActualWorkAffectedWorks(response);
  } catch (error) {
    console.error("deleteActualWork failed", error);
  }
}

function addDailyReportWorkType(section: DailyReportWorkSection) {
  setWorkTypeDrafts(section, [
    ...getWorkTypeDrafts(section),
    createDailyReportWorkTypeDraft(),
  ]);
}

function removeDailyReportWorkType(
  section: DailyReportWorkSection,
  workTypeId: string,
) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  const target = getWorkTypeDrafts(section).find(
    (workType) => workType.id === workTypeId,
  );

  setWorkTypeDrafts(
    section,
    getWorkTypeDrafts(section).filter((workType) => workType.id !== workTypeId),
  );

  target?.tasks.forEach((task) => {
    void syncTaskDelete(task);
  });
}

function getPrimaryDailyReportTask(workType: DailyReportWorkTypeDraft) {
  if (workType.tasks.length === 0) {
    workType.tasks = [createDailyReportTask()];
  }

  return workType.tasks[0]!;
}

function resizeDailyReportTaskTextarea(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

async function handleTaskBlur(
  workType: DailyReportWorkTypeDraft,
  task: DailyReportTaskDraft,
) {
  const trimmedName = task.text.trim();

  if (!trimmedName) {
    return;
  }

  if (task.actualWorkId === null) {
    const section = findSectionForWorkType(workType);

    if (!section) {
      return;
    }

    await syncTaskCreate(task, workType, section);
    return;
  }

  await syncTaskUpdate(task, { context: trimmedName });
}

function createSuggestionState(): DailyReportWorkTypeSuggestionState {
  return {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };
}

function getWorkTypeSuggestionState(workTypeId: string) {
  return workTypeSuggestionStates.value[workTypeId] ?? createSuggestionState();
}

function ensureWorkTypeSuggestionState(workTypeId: string) {
  const currentState = workTypeSuggestionStates.value[workTypeId];

  if (currentState) {
    return currentState;
  }

  const nextState = createSuggestionState();

  workTypeSuggestionStates.value = {
    ...workTypeSuggestionStates.value,
    [workTypeId]: nextState,
  };

  return nextState;
}

function clearWorkTypeSuggestionCloseTimer(workTypeId: string) {
  const state = workTypeSuggestionStates.value[workTypeId];

  if (state?.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
}

function clearDailyReportWorkTypeSuggestions(workTypeId: string) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.suggestions = [];
  state.errorMessage = "";
  state.isLoading = false;
  state.isOpen = false;
  state.highlightedIndex = -1;
}

async function loadDailyReportWorkTypeSuggestions(
  workType: DailyReportWorkTypeDraft,
) {
  const query = workType.workTypeName.trim();
  const state = ensureWorkTypeSuggestionState(workType.id);
  const requestId = state.requestId + 1;
  state.requestId = requestId;

  if (!query) {
    clearDailyReportWorkTypeSuggestions(workType.id);
    return;
  }

  state.isLoading = true;
  state.errorMessage = "";
  state.isOpen = true;

  try {
    const suggestions =
      await materialInspectionRequestApi.getWorkTypeListByName(query);

    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = suggestions;
    state.highlightedIndex = suggestions.length > 0 ? 0 : -1;
  } catch (error) {
    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = [];
    state.highlightedIndex = -1;
    state.errorMessage =
      error instanceof Error ? error.message : "공종명을 불러오지 못했습니다.";
  } finally {
    if (state.requestId === requestId) {
      state.isLoading = false;
    }
  }
}

function handleDailyReportWorkTypeNameInput(
  workType: DailyReportWorkTypeDraft,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  workType.workTypeName = input?.value ?? "";
  workType.workTypeId = null;
  void loadDailyReportWorkTypeSuggestions(workType);
}

function setDailyReportWorkTypeHighlightedIndex(
  workTypeId: string,
  index: number,
) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.highlightedIndex = Math.min(
    Math.max(index, -1),
    state.suggestions.length - 1,
  );
}

function handleDailyReportWorkTypeKeydown(
  workType: DailyReportWorkTypeDraft,
  event: KeyboardEvent,
) {
  const state = ensureWorkTypeSuggestionState(workType.id);
  const suggestionCount = state.suggestions.length;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    clearWorkTypeSuggestionCloseTimer(workType.id);

    if (workType.workTypeName.trim()) {
      state.isOpen = true;
    }

    if (suggestionCount === 0) {
      return;
    }

    const offset = event.key === "ArrowDown" ? 1 : -1;
    const baseIndex =
      state.highlightedIndex >= 0
        ? state.highlightedIndex
        : event.key === "ArrowDown"
          ? -1
          : 0;
    state.highlightedIndex = (baseIndex + offset + suggestionCount) % suggestionCount;
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    if (!state.isOpen || suggestionCount === 0) {
      return;
    }

    event.preventDefault();
    const selectedIndex =
      state.highlightedIndex >= 0 && state.highlightedIndex < suggestionCount
        ? state.highlightedIndex
        : 0;
    const suggestion = state.suggestions[selectedIndex];

    if (suggestion) {
      selectDailyReportWorkTypeSuggestion(workType, suggestion);
    }
    return;
  }

  if (event.key === "Escape" && state.isOpen) {
    event.preventDefault();
    state.isOpen = false;
    state.highlightedIndex = -1;
  }
}

function openDailyReportWorkTypeSuggestionList(
  workType: DailyReportWorkTypeDraft,
) {
  clearWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0
      ? state.highlightedIndex
      : state.suggestions.length > 0
        ? 0
        : -1;

  if (!state.isLoading && state.suggestions.length === 0) {
    void loadDailyReportWorkTypeSuggestions(workType);
  }
}

function scheduleCloseDailyReportWorkTypeSuggestionList(workTypeId: string) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.closeTimer = setTimeout(() => {
    state.isOpen = false;
    state.closeTimer = null;
  }, 120);
}

function selectDailyReportWorkTypeSuggestion(
  workType: DailyReportWorkTypeDraft,
  suggestion: WorkTypeReferenceResponse,
) {
  clearWorkTypeSuggestionCloseTimer(workType.id);
  const state = ensureWorkTypeSuggestionState(workType.id);
  state.requestId += 1;

  const previousWorkTypeId = workType.workTypeId;
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  state.suggestions = [];
  state.errorMessage = "";
  state.isOpen = false;
  state.highlightedIndex = -1;

  if (previousWorkTypeId === suggestion.id) {
    return;
  }

  const section = findSectionForWorkType(workType);

  if (!section) {
    return;
  }

  workType.tasks.forEach((task) => {
    if (task.actualWorkId !== null) {
      void syncTaskUpdate(task, { workTypeId: suggestion.id });
      return;
    }

    if (task.text.trim()) {
      void syncTaskCreate(task, workType, section);
    }
  });
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.readAsDataURL(file);
  });
}

function openImagePicker(section: DailyReportWorkSection) {
  getImageInputRef(section)?.click();
}

async function handleDailyReportImageChange(
  section: DailyReportWorkSection,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

  if (input) {
    input.value = "";
  }

  if (files.length === 0) {
    return;
  }

  const nextImages = await Promise.all(
    files.map(async (file) => ({
      id: createDailyReportId(),
      src: await readImageFileAsDataUrl(file),
      description: "",
    })),
  );

  setImageDrafts(section, [...getImageDrafts(section), ...nextImages]);
}

function removeDailyReportImage(
  section: DailyReportWorkSection,
  imageId: string,
) {
  setImageDrafts(
    section,
    getImageDrafts(section).filter((image) => image.id !== imageId),
  );
}

function openDailyReportImagePreview(image: DailyReportImageDraft) {
  previewImage.value = image;
}

function closeDailyReportImagePreview() {
  previewImage.value = null;
}

function getImageDropPosition(event: DragEvent): DailyReportImageDropPosition {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return "after";
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientX > targetRect.left + targetRect.width / 2 ? "after" : "before";
}

function moveDailyReportImage(
  section: DailyReportWorkSection,
  sourceImageId: string,
  targetImageId: string,
  position: DailyReportImageDropPosition,
) {
  if (sourceImageId === targetImageId) {
    return;
  }

  const images = getImageDrafts(section);
  const sourceIndex = images.findIndex((image) => image.id === sourceImageId);
  const targetIndex = images.findIndex((image) => image.id === targetImageId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const nextImages = [...images];
  const [movedImage] = nextImages.splice(sourceIndex, 1);

  if (!movedImage) {
    return;
  }

  const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextImages.splice(insertIndex, 0, movedImage);
  setImageDrafts(section, nextImages);
}

function handleImageDragStart(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const target = event.target;

  if (target instanceof HTMLElement && target.closest("button, input, textarea")) {
    event.preventDefault();
    return;
  }

  imageDragState.value = { section, imageId };
  imageDragOverState.value = null;
  event.dataTransfer?.setData("text/plain", imageId);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleImageDragOver(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;

  if (!dragState || dragState.section !== section || dragState.imageId === imageId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  imageDragOverState.value = {
    section,
    imageId,
    position: getImageDropPosition(event),
  };
}

function handleImageDrop(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;
  const position = getImageDropPosition(event);
  event.preventDefault();

  if (dragState?.section === section) {
    moveDailyReportImage(section, dragState.imageId, imageId, position);
  }

  imageDragState.value = null;
  imageDragOverState.value = null;
}

function endImageDrag() {
  imageDragState.value = null;
  imageDragOverState.value = null;
}

function getImageCardDragClass(section: DailyReportWorkSection, imageId: string) {
  return {
    "daily-report-write-image-card--dragging":
      imageDragState.value?.section === section && imageDragState.value.imageId === imageId,
    "daily-report-write-image-card--drop-before":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "before",
    "daily-report-write-image-card--drop-after":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "after",
  };
}

function waitForHomepageImportFeedback() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, HOMEPAGE_IMPORT_MIN_DURATION_MS);
  });
}

async function handleHomepageDataImport() {
  if (homepageImportStatus.value === "loading") {
    return;
  }

  homepageImportStatus.value = "loading";

  try {
    await Promise.all([
      hydrateDailyReportFromServer(),
      waitForHomepageImportFeedback(),
    ]);
    homepageImportStatus.value = "idle";
  } catch (error) {
    console.error("homepage daily report import failed", error);
    homepageImportStatus.value = "error";
  }
}

function normalizeDailyReportQuantityInput(value: string) {
  const compactValue = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = compactValue.split(".");
  const decimalPart = decimalParts.join("");

  return decimalParts.length > 0
    ? `${integerPart}.${decimalPart}`
    : integerPart;
}

function parseDailyReportQuantity(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = normalizeDailyReportQuantityInput(value);
  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatDailyReportQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });
}

function getDailyReportLaborSummaryWorkTypeName(workType: string) {
  const trimmedWorkType = workType.trim();
  const compactWorkType = trimmedWorkType.replace(/\s+/g, "");
  const alias = DAILY_REPORT_LABOR_SUMMARY_WORK_TYPE_ALIASES[compactWorkType];

  if (alias) {
    return alias;
  }

  return trimmedWorkType.replace(/공사$/, "").trim() || "기타";
}

function getDailyReportLaborSummaryDetailName(subWorkType: string) {
  return subWorkType.trim() || "기타";
}

function getDailyReportCumulativeQuantity(row: DailyReportQuantityDraft) {
  return row.previousQuantity + parseDailyReportQuantity(row.todayQuantity);
}

function updateDailyReportTodayQuantity(
  row: DailyReportQuantityDraft,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  const nextValue = normalizeDailyReportQuantityInput(input?.value ?? "");
  row.todayQuantity = nextValue;

  if (input && input.value !== nextValue) {
    input.value = nextValue;
  }
}

function toggleDailyReportResourceAddForm(kind: DailyReportResourceKind) {
  resourceAddFormsOpen.value[kind] = !resourceAddFormsOpen.value[kind];
}

function closeDailyReportResourceAddForm(kind: DailyReportResourceKind) {
  resourceAddFormsOpen.value[kind] = false;
}

function resetDailyReportResourceAddDraft(kind: DailyReportResourceKind) {
  if (kind === "material") {
    materialAddDraft.value = createDailyReportMaterialAddDraft();
    return;
  }

  if (kind === "equipment") {
    equipmentAddDraft.value = createDailyReportEquipmentAddDraft();
    return;
  }

  laborAddDraft.value = createDailyReportLaborAddDraft();
}

function cancelDailyReportResourceAdd(kind: DailyReportResourceKind) {
  resetDailyReportResourceAddDraft(kind);
  closeDailyReportResourceAddForm(kind);
}

function hasEveryDailyReportResourceField(values: string[]) {
  return values.every((value) => value.trim().length > 0);
}

function canAddDailyReportResource(kind: DailyReportResourceKind) {
  if (kind === "material") {
    return hasEveryDailyReportResourceField([
      materialAddDraft.value.workType,
      materialAddDraft.value.type,
      materialAddDraft.value.specification,
      materialAddDraft.value.unit,
    ]);
  }

  if (kind === "equipment") {
    return hasEveryDailyReportResourceField([
      equipmentAddDraft.value.process,
      equipmentAddDraft.value.type,
      equipmentAddDraft.value.specification,
      equipmentAddDraft.value.unit,
    ]);
  }

  return hasEveryDailyReportResourceField([
    laborAddDraft.value.workType,
    laborAddDraft.value.subWorkType,
  ]);
}

function addDailyReportMaterialResource() {
  if (!canAddDailyReportResource("material")) {
    return;
  }

  materialRows.value = [
    ...materialRows.value,
    createDailyReportMaterialRow({
      workType: materialAddDraft.value.workType.trim(),
      type: materialAddDraft.value.type.trim(),
      specification: materialAddDraft.value.specification.trim(),
      unit: materialAddDraft.value.unit.trim(),
      previousQuantity: 0,
    }),
  ];
  cancelDailyReportResourceAdd("material");
}

function addDailyReportEquipmentResource() {
  if (!canAddDailyReportResource("equipment")) {
    return;
  }

  equipmentRows.value = [
    ...equipmentRows.value,
    createDailyReportEquipmentRow({
      process: equipmentAddDraft.value.process.trim(),
      type: equipmentAddDraft.value.type.trim(),
      specification: equipmentAddDraft.value.specification.trim(),
      unit: equipmentAddDraft.value.unit.trim(),
      previousQuantity: 0,
    }),
  ];
  cancelDailyReportResourceAdd("equipment");
}

function addDailyReportLaborResource() {
  if (!canAddDailyReportResource("labor")) {
    return;
  }

  laborRows.value = [
    ...laborRows.value,
    createDailyReportLaborRow({
      workType: laborAddDraft.value.workType.trim(),
      subWorkType: laborAddDraft.value.subWorkType.trim(),
      previousQuantity: 0,
    }),
  ];
  cancelDailyReportResourceAdd("labor");
}

function handleDailyReportSave() {
  homepageImportStatus.value = "idle";
}

function buildWorkTypeDraftsFromResponses(
  responses: ActualWorkResponse[],
): DailyReportWorkTypeDraft[] {
  const groupOrder: number[] = [];
  const groups = new Map<number, DailyReportWorkTypeDraft>();

  responses.forEach((response) => {
    let group = groups.get(response.workTypeId);

    if (!group) {
      group = {
        id: createDailyReportId(),
        workTypeId: response.workTypeId,
        workTypeName: response.workTypeName,
        tasks: [],
      };
      groups.set(response.workTypeId, group);
      groupOrder.push(response.workTypeId);
    }

    group.tasks.push(createDailyReportTaskFromResponse(response));
  });

  return groupOrder.map((workTypeId) => groups.get(workTypeId)!);
}

async function hydrateDailyReportFromServer() {
  try {
    const [todayResponses, tomorrowResponses] = await Promise.all([
      actualWorkApi.listByDate(reportDates.value.today),
      actualWorkApi.listByDate(reportDates.value.tomorrow),
    ]);
    todayWorkTypes.value = ensureDefaultWorkTypes(
      buildWorkTypeDraftsFromResponses(todayResponses),
    );
    tomorrowWorkTypes.value = ensureDefaultWorkTypes(
      buildWorkTypeDraftsFromResponses(tomorrowResponses),
    );
  } catch (error) {
    console.error("hydrate daily report failed", error);
  }
}

onMounted(() => {
  void hydrateDailyReportFromServer();
  document.addEventListener("mousedown", handleReportDateOutsideClick);
});

onUnmounted(() => {
  stopDailyReportResourceColumnResize();
  document.removeEventListener("mousedown", handleReportDateOutsideClick);
  Object.values(workTypeSuggestionStates.value).forEach((state) => {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
    }
    state.requestId += 1;
  });
});
</script>

<template>
  <div class="daily-report-editor-panel">
  <aside
    class="daily-report-write-panel daily-report-write-panel--with-tabs"
    aria-label="공사일보 작성"
  >
    <header
      ref="calendarRootRef"
      class="daily-report-date-bar"
      aria-label="작업일보 날짜 선택"
    >
      <div class="daily-report-date-bar__controls">
        <button
          type="button"
          class="daily-report-date-bar__nav"
          aria-label="이전 달"
          @click="shiftReportDate(-1, 'month')"
        >
          <img
            class="daily-report-date-bar__nav-icon"
            :src="chevronDoubleLeftIcon"
            alt=""
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="daily-report-date-bar__nav"
          aria-label="이전 날"
          @click="shiftReportDate(-1, 'day')"
        >
          <img
            class="daily-report-date-bar__nav-icon"
            :src="chevronLeftIcon"
            alt=""
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="daily-report-date-bar__current"
          :aria-expanded="isCalendarOpen"
          aria-haspopup="dialog"
          @click="toggleReportDateCalendar"
        >
          {{ selectedReportDateLabel }}
        </button>
        <button
          type="button"
          class="daily-report-date-bar__nav"
          aria-label="다음 날"
          @click="shiftReportDate(1, 'day')"
        >
          <img
            class="daily-report-date-bar__nav-icon"
            :src="chevronRightIcon"
            alt=""
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="daily-report-date-bar__nav"
          aria-label="다음 달"
          @click="shiftReportDate(1, 'month')"
        >
          <img
            class="daily-report-date-bar__nav-icon"
            :src="chevronDoubleRightIcon"
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        v-if="isCalendarOpen"
        class="daily-report-date-calendar"
        role="dialog"
        aria-label="달력"
      >
        <div class="daily-report-date-calendar__header">
          <button
            type="button"
            class="daily-report-date-calendar__nav"
            aria-label="이전 달"
            @click="shiftCalendarMonth(-1)"
          >
            <img
              class="daily-report-date-calendar__nav-icon"
              :src="chevronLeftIcon"
              alt=""
              aria-hidden="true"
            />
          </button>
          <span class="daily-report-date-calendar__title">
            {{ calendarMonthLabel }}
          </span>
          <button
            type="button"
            class="daily-report-date-calendar__nav"
            aria-label="다음 달"
            @click="shiftCalendarMonth(1)"
          >
            <img
              class="daily-report-date-calendar__nav-icon"
              :src="chevronRightIcon"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
        <div class="daily-report-date-calendar__weekdays">
          <span
            v-for="weekday in REPORT_DATE_WEEKDAYS"
            :key="weekday"
            class="daily-report-date-calendar__weekday"
          >
            {{ weekday }}
          </span>
        </div>
        <div class="daily-report-date-calendar__grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="daily-report-date-calendar__cell"
            :class="{
              'daily-report-date-calendar__cell--muted': !cell.isCurrentMonth,
              'daily-report-date-calendar__cell--today': cell.isToday,
              'daily-report-date-calendar__cell--selected': cell.isSelected,
            }"
            :disabled="!cell.date"
            @click="pickCalendarDate(cell.date)"
          >
            {{ cell.day ?? "" }}
          </button>
        </div>
        <div class="daily-report-date-calendar__footer">
          <button
            type="button"
            class="daily-report-date-calendar__action"
            @click="jumpToToday"
          >
            오늘로
          </button>
          <button
            type="button"
            class="daily-report-date-calendar__action"
            @click="closeReportDateCalendar"
          >
            닫기
          </button>
        </div>
      </div>
    </header>

    <nav
      class="daily-report-write-panel__tabs"
      role="tablist"
      aria-label="공사일보 항목"
    >
      <button
        v-for="tab in DAILY_REPORT_EDITOR_TABS"
        :id="`daily-report-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        class="daily-report-write-panel__tab"
        :class="{ 'daily-report-write-panel__tab--active': activeDailyReportTab === tab.id }"
        role="tab"
        :aria-selected="activeDailyReportTab === tab.id"
        :aria-controls="`daily-report-panel-${tab.id}`"
        @click="activeDailyReportTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="daily-report-write-panel__content">
      <div
        v-show="activeDailyReportTab === 'summary'"
        id="daily-report-panel-summary"
        class="daily-report-tab-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-summary"
      >
        <section
          class="daily-report-summary-card"
          aria-label="오늘 작업 요약"
          aria-live="polite"
        >
          <header class="daily-report-summary-card__header">
            <span class="daily-report-summary-card__title">오늘작업</span>
          </header>
          <div class="daily-report-summary-card__body">
            <div
              v-for="group in dailyReportTodayWorkSummaryGroups"
              :key="group.workTypeName"
              class="daily-report-summary__group"
            >
              <h3 class="daily-report-summary__group-title">{{ group.workTypeName }}</h3>
              <ol class="daily-report-summary__task-list">
                <li
                  v-for="(line, lineIndex) in group.lines"
                  :key="lineIndex"
                  class="daily-report-summary__task"
                >{{ line }}</li>
              </ol>
            </div>
            <p
              v-if="dailyReportTodayWorkSummaryGroups.length === 0"
              class="daily-report-summary__empty"
            >
              오늘작업 내용이 없습니다.
            </p>
          </div>
        </section>
      </div>
      <div
        v-show="activeDailyReportTab === 'todayWork'"
        id="daily-report-panel-todayWork"
        class="daily-report-tab-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-todayWork"
      >
      <section class="daily-report-write-editor">
        <input
          ref="todayImageInputRef"
          class="daily-report-write-editor__file-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleDailyReportImageChange('today', $event)"
        />

        <div class="daily-report-write-work-cell">
          <div class="daily-report-write-work-cell__header">
            <span class="daily-report-write-work-cell__title">오늘작업</span>
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('today')"
            >
              + 공종 추가
            </button>
          </div>

          <div class="daily-report-worktype-list">
            <article
              v-for="workType in todayWorkTypes"
              :key="workType.id"
              class="daily-report-worktype-entry daily-report-worktype-entry--freeform"
            >
              <label class="daily-report-worktype-field">
                <span class="daily-report-worktype-field__control">
                  <span class="daily-report-worktype-field__marker" aria-hidden="true" />
                  <span class="daily-report-worktype-field__input-wrap">
                    <input
                      :value="workType.workTypeName"
                      class="daily-report-worktype-field__input"
                      type="text"
                      autocomplete="off"
                      placeholder="공종명을 입력해 주세요."
                      role="combobox"
                      :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
                      aria-autocomplete="list"
                      @input="handleDailyReportWorkTypeNameInput(workType, $event)"
                      @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
                      @focus="openDailyReportWorkTypeSuggestionList(workType)"
                      @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('today', workType.id)"
                    >
                      ×
                    </button>

                    <Transition name="daily-report-typeahead">
                      <div
                        v-if="getWorkTypeSuggestionState(workType.id).isOpen"
                        class="daily-report-typeahead"
                        role="listbox"
                        aria-label="공종명 후보"
                        @mousedown.prevent
                      >
                        <p
                          v-if="getWorkTypeSuggestionState(workType.id).isLoading"
                          class="daily-report-typeahead__state"
                        >
                          불러오는 중
                        </p>
                        <p
                          v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
                          class="daily-report-typeahead__state"
                        >
                          {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
                        </p>
                        <template
                          v-else-if="
                            getWorkTypeSuggestionState(workType.id).suggestions.length > 0
                          "
                        >
                          <button
                            v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
                              workType.id,
                            ).suggestions"
                            :key="suggestion.id"
                            class="daily-report-typeahead__option"
                            :class="{
                              'daily-report-typeahead__option--highlighted':
                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                                suggestionIndex,
                            }"
                            type="button"
                            role="option"
                            :aria-selected="
                              getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                              suggestionIndex
                            "
                            @mouseenter="
                              setDailyReportWorkTypeHighlightedIndex(
                                workType.id,
                                suggestionIndex,
                              )
                            "
                            @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
                          >
                            {{ suggestion.name }}
                          </button>
                        </template>
                        <p
                          v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
                          class="daily-report-typeahead__state"
                        >
                          매칭되는 공종명이 없어요
                        </p>
                      </div>
                    </Transition>
                  </span>
                </span>
              </label>

              <div class="daily-report-task-list">
                <div class="daily-report-task-row daily-report-task-row--freeform">
                  <div class="daily-report-task-field daily-report-task-field--freeform">
                    <textarea
                      v-model="getPrimaryDailyReportTask(workType).text"
                      class="daily-report-task-input daily-report-task-textarea"
                    rows="4"
                      placeholder="작업 사항을 입력해 주세요."
                      @input="resizeDailyReportTaskTextarea"
                      @blur="handleTaskBlur(workType, getPrimaryDailyReportTask(workType))"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-write-attachments">
            <TransitionGroup
              v-if="todayImages.length > 0"
              name="daily-report-image-list"
              tag="div"
              class="daily-report-write-image-list"
            >
              <article
                v-for="image in todayImages"
                :key="image.id"
                class="daily-report-write-image-card"
                :class="getImageCardDragClass('today', image.id)"
                draggable="true"
                @dragstart="handleImageDragStart('today', image.id, $event)"
                @dragover="handleImageDragOver('today', image.id, $event)"
                @dragleave="imageDragOverState = null"
                @drop="handleImageDrop('today', image.id, $event)"
                @dragend="endImageDrag"
              >
                <figure
                  class="daily-report-write-image-card__preview"
                  @click="openDailyReportImagePreview(image)"
                >
                  <img
                    class="daily-report-write-image-card__image"
                    :src="image.src"
                    alt=""
                    draggable="false"
                  />
                </figure>
                <textarea
                  v-model="image.description"
                  class="daily-report-write-image-card__description"
                  rows="2"
                  placeholder="설명을 적어주세요."
                />
                <button
                  type="button"
                  class="daily-report-write-image-card__remove"
                  aria-label="이미지 삭제"
                  @click.stop="removeDailyReportImage('today', image.id)"
                >
                  ×
                </button>
              </article>
            </TransitionGroup>

            <button
              type="button"
              class="daily-report-write-attachments__add"
              @click="openImagePicker('today')"
            >
              <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                <img
                  class="daily-report-write-attachments__add-icon"
                  :src="imageIcon"
                  alt=""
                />
              </span>
              <span>이미지 추가</span>
            </button>
          </div>
        </div>
      </section>
      </div>

      <div
        v-show="activeDailyReportTab === 'tomorrowWork'"
        id="daily-report-panel-tomorrowWork"
        class="daily-report-tab-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-tomorrowWork"
      >
      <section class="daily-report-write-editor">
        <input
          ref="tomorrowImageInputRef"
          class="daily-report-write-editor__file-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleDailyReportImageChange('tomorrow', $event)"
        />

        <div class="daily-report-write-work-cell">
          <div class="daily-report-write-work-cell__header">
            <span class="daily-report-write-work-cell__title">내일작업</span>
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('tomorrow')"
            >
              + 공종 추가
            </button>
          </div>

          <div class="daily-report-worktype-list">
            <article
              v-for="workType in tomorrowWorkTypes"
              :key="workType.id"
              class="daily-report-worktype-entry daily-report-worktype-entry--freeform"
            >
              <label class="daily-report-worktype-field">
                <span class="daily-report-worktype-field__control">
                  <span class="daily-report-worktype-field__marker" aria-hidden="true" />
                  <span class="daily-report-worktype-field__input-wrap">
                    <input
                      :value="workType.workTypeName"
                      class="daily-report-worktype-field__input"
                      type="text"
                      autocomplete="off"
                      placeholder="공종명을 입력해 주세요."
                      role="combobox"
                      :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
                      aria-autocomplete="list"
                      @input="handleDailyReportWorkTypeNameInput(workType, $event)"
                      @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
                      @focus="openDailyReportWorkTypeSuggestionList(workType)"
                      @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('tomorrow', workType.id)"
                    >
                      ×
                    </button>

                    <Transition name="daily-report-typeahead">
                      <div
                        v-if="getWorkTypeSuggestionState(workType.id).isOpen"
                        class="daily-report-typeahead"
                        role="listbox"
                        aria-label="공종명 후보"
                        @mousedown.prevent
                      >
                        <p
                          v-if="getWorkTypeSuggestionState(workType.id).isLoading"
                          class="daily-report-typeahead__state"
                        >
                          불러오는 중
                        </p>
                        <p
                          v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
                          class="daily-report-typeahead__state"
                        >
                          {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
                        </p>
                        <template
                          v-else-if="
                            getWorkTypeSuggestionState(workType.id).suggestions.length > 0
                          "
                        >
                          <button
                            v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
                              workType.id,
                            ).suggestions"
                            :key="suggestion.id"
                            class="daily-report-typeahead__option"
                            :class="{
                              'daily-report-typeahead__option--highlighted':
                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                                suggestionIndex,
                            }"
                            type="button"
                            role="option"
                            :aria-selected="
                              getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                              suggestionIndex
                            "
                            @mouseenter="
                              setDailyReportWorkTypeHighlightedIndex(
                                workType.id,
                                suggestionIndex,
                              )
                            "
                            @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
                          >
                            {{ suggestion.name }}
                          </button>
                        </template>
                        <p
                          v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
                          class="daily-report-typeahead__state"
                        >
                          매칭되는 공종명이 없어요
                        </p>
                      </div>
                    </Transition>
                  </span>
                </span>
              </label>

              <div class="daily-report-task-list">
                <div class="daily-report-task-row daily-report-task-row--freeform">
                  <div class="daily-report-task-field daily-report-task-field--freeform">
                    <textarea
                      v-model="getPrimaryDailyReportTask(workType).text"
                      class="daily-report-task-input daily-report-task-textarea"
                    rows="4"
                      placeholder="작업 사항을 입력해 주세요."
                      @input="resizeDailyReportTaskTextarea"
                      @blur="handleTaskBlur(workType, getPrimaryDailyReportTask(workType))"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-write-attachments">
            <TransitionGroup
              v-if="tomorrowImages.length > 0"
              name="daily-report-image-list"
              tag="div"
              class="daily-report-write-image-list"
            >
              <article
                v-for="image in tomorrowImages"
                :key="image.id"
                class="daily-report-write-image-card"
                :class="getImageCardDragClass('tomorrow', image.id)"
                draggable="true"
                @dragstart="handleImageDragStart('tomorrow', image.id, $event)"
                @dragover="handleImageDragOver('tomorrow', image.id, $event)"
                @dragleave="imageDragOverState = null"
                @drop="handleImageDrop('tomorrow', image.id, $event)"
                @dragend="endImageDrag"
              >
                <figure
                  class="daily-report-write-image-card__preview"
                  @click="openDailyReportImagePreview(image)"
                >
                  <img
                    class="daily-report-write-image-card__image"
                    :src="image.src"
                    alt=""
                    draggable="false"
                  />
                </figure>
                <textarea
                  v-model="image.description"
                  class="daily-report-write-image-card__description"
                  rows="2"
                  placeholder="설명을 적어주세요."
                />
                <button
                  type="button"
                  class="daily-report-write-image-card__remove"
                  aria-label="이미지 삭제"
                  @click.stop="removeDailyReportImage('tomorrow', image.id)"
                >
                  ×
                </button>
              </article>
            </TransitionGroup>

            <button
              type="button"
              class="daily-report-write-attachments__add"
              @click="openImagePicker('tomorrow')"
            >
              <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                <img
                  class="daily-report-write-attachments__add-icon"
                  :src="imageIcon"
                  alt=""
                />
              </span>
              <span>이미지 추가</span>
            </button>
          </div>
        </div>
      </section>
      </div>

      <section
        v-show="activeDailyReportTab === 'labor'"
        id="daily-report-panel-labor"
        class="daily-report-resource-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-labor"
      >
        <div class="daily-report-resource-table daily-report-resource-table--labor">
          <div class="daily-report-resource-table__header">
            <h2 class="daily-report-resource-table__title">인력투입</h2>
            <button
              type="button"
              class="daily-report-resource-add"
              @click="toggleDailyReportResourceAddForm('labor')"
            >
              + 추가하기
            </button>
          </div>

          <form
            v-if="resourceAddFormsOpen.labor"
            class="daily-report-resource-add-form"
            @submit.prevent="addDailyReportLaborResource"
          >
            <label class="daily-report-resource-add-form__field">
              <span>공종</span>
              <input
                v-model="laborAddDraft.workType"
                type="text"
                placeholder="공종"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>세부공종</span>
              <input
                v-model="laborAddDraft.subWorkType"
                type="text"
                placeholder="세부공종"
              />
            </label>
            <div class="daily-report-resource-add-form__actions">
              <button
                type="button"
                class="daily-report-resource-add-form__button"
                @click="cancelDailyReportResourceAdd('labor')"
              >
                취소
              </button>
              <button
                type="submit"
                class="daily-report-resource-add-form__button daily-report-resource-add-form__button--primary"
                :disabled="!canAddDailyReportResource('labor')"
              >
                추가
              </button>
            </div>
          </form>

          <div
            v-if="dailyReportLaborSummaryItems.length > 0"
            class="daily-report-labor-summary"
            aria-label="금일 인력 투입 요약"
            aria-live="polite"
          >
            <p
              v-for="(summaryItem, summaryIndex) in dailyReportLaborSummaryItems"
              :key="`${summaryIndex}-${summaryItem}`"
              class="daily-report-labor-summary__line"
            >
              {{ summaryItem }}
            </p>
          </div>

          <div class="daily-report-resource-sheet" role="region" aria-label="인력 투입현황 표">
            <table
              class="daily-report-resource-sheet__table daily-report-resource-sheet__table--labor"
              :style="getDailyReportResourceTableStyle('labor')"
            >
              <colgroup>
                <col
                  v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.labor"
                  :key="column.key"
                  :style="getDailyReportResourceColumnStyle('labor', columnIndex)"
                />
              </colgroup>
              <thead>
                <tr>
                  <th
                    v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.labor"
                    :key="column.key"
                    scope="col"
                  >
                    <span class="daily-report-resource-sheet__header-label">
                      {{ column.label }}
                    </span>
                    <button
                      type="button"
                      class="daily-report-resource-sheet__resize-handle"
                      :aria-label="`${column.label} 컬럼 너비 조절`"
                      @pointerdown="
                        startDailyReportResourceColumnResize(
                          'labor',
                          columnIndex,
                          $event,
                        )
                      "
                      @keydown="
                        handleDailyReportResourceColumnResizeKeydown(
                          'labor',
                          columnIndex,
                          $event,
                        )
                      "
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="group in laborRowGroups"
                  :key="group.key"
                >
                  <tr
                    v-for="(row, rowIndex) in group.rows"
                    :key="row.id"
                  >
                    <td
                      v-if="rowIndex === 0"
                      class="daily-report-resource-sheet__group-cell"
                      :rowspan="group.rows.length"
                    >
                      {{ group.workType }}
                    </td>
                    <td>{{ row.subWorkType }}</td>
                    <td class="daily-report-resource-sheet__today-cell">
                      <input
                        v-model="row.todayQuantity"
                        class="daily-report-resource-sheet__today-input"
                        inputmode="decimal"
                        type="text"
                        aria-label="인력 금일 수량"
                        placeholder="0"
                        @input="updateDailyReportTodayQuantity(row, $event)"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                      {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        v-show="activeDailyReportTab === 'material'"
        id="daily-report-panel-material"
        class="daily-report-resource-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-material"
      >
        <div class="daily-report-resource-table daily-report-resource-table--material">
          <div class="daily-report-resource-table__header">
            <h2 class="daily-report-resource-table__title">자재투입</h2>
            <button
              type="button"
              class="daily-report-resource-add"
              @click="toggleDailyReportResourceAddForm('material')"
            >
              + 추가하기
            </button>
          </div>

          <form
            v-if="resourceAddFormsOpen.material"
            class="daily-report-resource-add-form"
            @submit.prevent="addDailyReportMaterialResource"
          >
            <label class="daily-report-resource-add-form__field">
              <span>공종</span>
              <input
                v-model="materialAddDraft.workType"
                type="text"
                placeholder="공종"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>타입</span>
              <input
                v-model="materialAddDraft.type"
                type="text"
                placeholder="타입"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>규격</span>
              <input
                v-model="materialAddDraft.specification"
                type="text"
                placeholder="규격"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>단위</span>
              <input
                v-model="materialAddDraft.unit"
                type="text"
                placeholder="단위"
              />
            </label>
            <div class="daily-report-resource-add-form__actions">
              <button
                type="button"
                class="daily-report-resource-add-form__button"
                @click="cancelDailyReportResourceAdd('material')"
              >
                취소
              </button>
              <button
                type="submit"
                class="daily-report-resource-add-form__button daily-report-resource-add-form__button--primary"
                :disabled="!canAddDailyReportResource('material')"
              >
                추가
              </button>
            </div>
          </form>

          <div class="daily-report-resource-sheet" role="region" aria-label="주요자재 투입현황 표">
            <table
              class="daily-report-resource-sheet__table daily-report-resource-sheet__table--material"
              :style="getDailyReportResourceTableStyle('material')"
            >
              <colgroup>
                <col
                  v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.material"
                  :key="column.key"
                  :style="getDailyReportResourceColumnStyle('material', columnIndex)"
                />
              </colgroup>
              <thead>
                <tr>
                  <th
                    v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.material"
                    :key="column.key"
                    scope="col"
                  >
                    <span class="daily-report-resource-sheet__header-label">
                      {{ column.label }}
                    </span>
                    <button
                      type="button"
                      class="daily-report-resource-sheet__resize-handle"
                      :aria-label="`${column.label} 컬럼 너비 조절`"
                      @pointerdown="
                        startDailyReportResourceColumnResize(
                          'material',
                          columnIndex,
                          $event,
                        )
                      "
                      @keydown="
                        handleDailyReportResourceColumnResizeKeydown(
                          'material',
                          columnIndex,
                          $event,
                        )
                      "
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in materialRows" :key="row.id">
                  <td>{{ row.workType }}</td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.specification }}</td>
                  <td>{{ row.unit }}</td>
                  <td class="daily-report-resource-sheet__today-cell">
                    <input
                      v-model="row.todayQuantity"
                      class="daily-report-resource-sheet__today-input"
                      inputmode="decimal"
                      type="text"
                      aria-label="자재 금일 수량"
                      placeholder="0"
                      @input="updateDailyReportTodayQuantity(row, $event)"
                    />
                  </td>
                  <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                    {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        v-show="activeDailyReportTab === 'equipment'"
        id="daily-report-panel-equipment"
        class="daily-report-resource-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-equipment"
      >
        <div class="daily-report-resource-table daily-report-resource-table--equipment">
          <div class="daily-report-resource-table__header">
            <h2 class="daily-report-resource-table__title">장비투입</h2>
            <button
              type="button"
              class="daily-report-resource-add"
              @click="toggleDailyReportResourceAddForm('equipment')"
            >
              + 추가하기
            </button>
          </div>

          <form
            v-if="resourceAddFormsOpen.equipment"
            class="daily-report-resource-add-form"
            @submit.prevent="addDailyReportEquipmentResource"
          >
            <label class="daily-report-resource-add-form__field">
              <span>공정</span>
              <input
                v-model="equipmentAddDraft.process"
                type="text"
                placeholder="공정"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>타입</span>
              <input
                v-model="equipmentAddDraft.type"
                type="text"
                placeholder="타입"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>규격</span>
              <input
                v-model="equipmentAddDraft.specification"
                type="text"
                placeholder="규격"
              />
            </label>
            <label class="daily-report-resource-add-form__field">
              <span>단위</span>
              <input
                v-model="equipmentAddDraft.unit"
                type="text"
                placeholder="단위"
              />
            </label>
            <div class="daily-report-resource-add-form__actions">
              <button
                type="button"
                class="daily-report-resource-add-form__button"
                @click="cancelDailyReportResourceAdd('equipment')"
              >
                취소
              </button>
              <button
                type="submit"
                class="daily-report-resource-add-form__button daily-report-resource-add-form__button--primary"
                :disabled="!canAddDailyReportResource('equipment')"
              >
                추가
              </button>
            </div>
          </form>

          <div class="daily-report-resource-sheet" role="region" aria-label="장비 투입현황 표">
            <table
              class="daily-report-resource-sheet__table daily-report-resource-sheet__table--equipment"
              :style="getDailyReportResourceTableStyle('equipment')"
            >
              <colgroup>
                <col
                  v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.equipment"
                  :key="column.key"
                  :style="getDailyReportResourceColumnStyle('equipment', columnIndex)"
                />
              </colgroup>
              <thead>
                <tr>
                  <th
                    v-for="(column, columnIndex) in DAILY_REPORT_RESOURCE_COLUMNS.equipment"
                    :key="column.key"
                    scope="col"
                  >
                    <span class="daily-report-resource-sheet__header-label">
                      {{ column.label }}
                    </span>
                    <button
                      type="button"
                      class="daily-report-resource-sheet__resize-handle"
                      :aria-label="`${column.label} 컬럼 너비 조절`"
                      @pointerdown="
                        startDailyReportResourceColumnResize(
                          'equipment',
                          columnIndex,
                          $event,
                        )
                      "
                      @keydown="
                        handleDailyReportResourceColumnResizeKeydown(
                          'equipment',
                          columnIndex,
                          $event,
                        )
                      "
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in equipmentRows" :key="row.id">
                  <td>{{ row.process }}</td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.specification }}</td>
                  <td>{{ row.unit }}</td>
                  <td class="daily-report-resource-sheet__today-cell">
                    <input
                      v-model="row.todayQuantity"
                      class="daily-report-resource-sheet__today-input"
                      inputmode="decimal"
                      type="text"
                      aria-label="장비 금일 수량"
                      placeholder="0"
                      @input="updateDailyReportTodayQuantity(row, $event)"
                    />
                  </td>
                  <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                    {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <footer class="daily-report-write-save-bar">
      <button
        type="button"
        class="daily-report-write-import-button"
        :disabled="homepageImportStatus === 'loading'"
        @click="handleHomepageDataImport"
      >
        {{ homepageImportStatus === "loading" ? "홈페이지 자료 불러오는 중" : "홈페이지 자료 불러오기" }}
      </button>
      <button
        type="button"
        class="daily-report-write-save-button"
        @click="handleDailyReportSave"
      >
        생성하기
      </button>
    </footer>

    <Transition name="daily-report-homepage-import-overlay">
      <div
        v-if="homepageImportStatus === 'loading'"
        class="daily-report-homepage-import-overlay"
        role="status"
        aria-live="polite"
      >
        <div class="daily-report-homepage-import-overlay__card">
          <span
            class="daily-report-homepage-import-overlay__indicator"
            aria-hidden="true"
          />
          <span>홈페이지 자료를 가져오고 있어요.</span>
        </div>
      </div>
    </Transition>
  </aside>

  <Transition name="daily-report-image-preview">
    <div
      v-if="previewImage"
      class="daily-report-image-preview"
      role="presentation"
      @click.self="closeDailyReportImagePreview"
    >
      <section
        class="daily-report-image-preview__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="이미지 크게 보기"
      >
        <button
          type="button"
          class="daily-report-image-preview__close"
          aria-label="닫기"
          @click="closeDailyReportImagePreview"
        >
          ×
        </button>
        <img
          class="daily-report-image-preview__image"
          :src="previewImage.src"
          alt=""
        />
        <p
          v-if="previewImage.description"
          class="daily-report-image-preview__description"
        >
          {{ previewImage.description }}
        </p>
      </section>
    </div>
  </Transition>
  </div>
</template>

<style scoped>
.daily-report-editor-panel {
  display: flex;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.daily-report-editor-panel :deep(.daily-report-write-panel) {
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.daily-report-editor-panel :deep(.daily-report-write-panel__content) {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>

<style scoped src="../styles/DailyReportWritePage.css"></style>
