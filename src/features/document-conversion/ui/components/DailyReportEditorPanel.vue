<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import imageIcon from "@fluentui/svg-icons/icons/image_20_regular.svg";
import chevronLeftIcon from "@fluentui/svg-icons/icons/chevron_left_20_regular.svg";
import chevronRightIcon from "@fluentui/svg-icons/icons/chevron_right_20_regular.svg";
import chevronDoubleLeftIcon from "@fluentui/svg-icons/icons/chevron_double_left_20_regular.svg";
import chevronDoubleRightIcon from "@fluentui/svg-icons/icons/chevron_double_right_20_regular.svg";

import { actualWorkApi } from "@/features/document-conversion/api/actual-work.api";
import type { ActualWorkResponse } from "@/features/document-conversion/api/actual-work-api.types";
import { dailyReportResourceApi } from "@/features/document-conversion/api/daily-report-resource.api";
import type {
  DailyReportEquipmentSpecResponse,
  DailyReportEquipmentTypeResponse,
  DailyReportLaborTypeResponse,
  DailyReportMaterialDeliveryResponse,
  DailyReportMaterialDeliveryUpdateRequest,
  DailyReportMaterialSpecResponse,
  DailyReportMaterialTypeResponse,
} from "@/features/document-conversion/api/daily-report-resource-api.types";
import { materialInspectionRequestApi } from "@/features/document-conversion/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion/api/material-inspection-request-api.types";
import { useDesktopScheduleViewModel } from "@/features/desktop-schedule/state/useDesktopScheduleViewModel";
import { analyticsClient } from "@/shared/analytics/analytics-stub";
import WorkTypeTypeaheadInput from "@/shared/ui/WorkTypeTypeaheadInput.vue";

const scheduleVm = useDesktopScheduleViewModel();
const { dailyReport } = scheduleVm;
const emit = defineEmits<{
  "report-date-change": [
    payload: {
      source: "calendar" | "nav" | "today";
      unit: "date" | "day" | "month";
      direction: "current" | "next" | "previous";
    },
  ];
}>();

function applyActualWorkAffectedWorks(response: ActualWorkResponse) {
  if (response.affectedWorks?.length) {
    dailyReport.patchLoadedWorkActualDates(response.affectedWorks);
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
  { id: "summary", label: "모아보기" },
  { id: "todayWork", label: "오늘" },
  { id: "tomorrowWork", label: "내일" },
  { id: "labor", label: "인력" },
  { id: "material", label: "자재" },
  { id: "equipment", label: "장비" },
];

const HOMEPAGE_IMPORT_MIN_DURATION_MS = 2500;
const DAILY_REPORT_RESOURCE_COLUMN_WIDTH_STORAGE_KEY =
  "conelp.dailyReport.resourceColumnWidths.v3";
const DAILY_REPORT_RESOURCE_COLUMN_MIN_WIDTH = 32;
const DAILY_REPORT_RESOURCE_COLUMN_MAX_WIDTH = 320;
const DAILY_REPORT_RESOURCE_CONTEXT_MENU_WIDTH = 148;
const DAILY_REPORT_RESOURCE_CONTEXT_MENU_HEIGHT = 86;
const DAILY_REPORT_RESOURCE_COLUMNS = {
  labor: [
    { key: "includedInDocument", label: "문서 포함" },
    { key: "workType", label: "공종" },
    { key: "subWorkType", label: "직종" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
  material: [
    { key: "includedInDocument", label: "문서 포함" },
    { key: "workType", label: "공종" },
    { key: "type", label: "타입" },
    { key: "specification", label: "규격" },
    { key: "unit", label: "단위" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
  equipment: [
    { key: "includedInDocument", label: "문서 포함" },
    { key: "process", label: "공종" },
    { key: "type", label: "타입" },
    { key: "specification", label: "규격" },
    { key: "unit", label: "단위" },
    { key: "todayQuantity", label: "금일" },
    { key: "totalQuantity", label: "누계" },
  ],
} satisfies Record<DailyReportResourceKind, readonly DailyReportResourceColumnConfig[]>;
const DAILY_REPORT_RESOURCE_DEFAULT_COLUMN_WIDTHS = {
  labor: [82, 124, 124, 82, 88],
  material: [82, 124, 112, 112, 72, 82, 88],
  equipment: [82, 124, 112, 112, 72, 82, 88],
} satisfies Record<DailyReportResourceKind, number[]>;
const DAILY_REPORT_PANEL_ANALYTICS_FEATURE = "daily_report_panel";

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

type DailyReportResourceFloatingPosition = {
  left: number;
  top: number;
};

type DailyReportResourceContextMenuState =
  DailyReportResourceFloatingPosition & {
    kind: DailyReportResourceKind;
    rowId: string;
  };

type DailyReportResourceEditDraft = {
  includedInDocument: boolean;
  workType: string;
  workTypeId: number | null;
  subWorkType: string;
  type: string;
  specification: string;
  unit: string;
  todayQuantity: string;
};

type DailyReportResourceEditState = {
  kind: DailyReportResourceKind;
  rowId: string;
  draft: DailyReportResourceEditDraft;
};

type DailyReportResourceRowsSnapshot = {
  labor: DailyReportLaborDraft[];
  material: DailyReportMaterialDraft[];
  equipment: DailyReportEquipmentDraft[];
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
  includedInDocument: boolean;
  previousQuantity: number;
  todayQuantity: string;
};

type DailyReportMaterialDraft = DailyReportQuantityDraft & {
  materialDeliveryId: number | null;
  deliveryLineId: number | null;
  materialSpecId: number | null;
  materialTypeId: number | null;
  workTypeId: number | null;
  workType: string;
  type: string;
  specification: string;
  unit: string;
};

type DailyReportEquipmentDraft = DailyReportQuantityDraft & {
  equipmentSpecId: number | null;
  equipmentTypeId: number | null;
  workTypeId: number | null;
  process: string;
  type: string;
  specification: string;
  unit: string;
};

type DailyReportLaborDraft = DailyReportQuantityDraft & {
  laborTypeId: number | null;
  workTypeId: number | null;
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
  | "includedInDocument"
  | "workTypeId"
  | "workType"
  | "type"
  | "specification"
  | "unit"
  | "todayQuantity"
>;

type DailyReportEquipmentAddDraft = Pick<
  DailyReportEquipmentDraft,
  | "includedInDocument"
  | "workTypeId"
  | "process"
  | "type"
  | "specification"
  | "unit"
  | "todayQuantity"
>;

type DailyReportLaborAddDraft = Pick<
  DailyReportLaborDraft,
  "includedInDocument" | "workTypeId" | "workType" | "subWorkType" | "todayQuantity"
>;

type DailyReportResourceAddFormState = Record<DailyReportResourceKind, boolean>;
type DailyReportResourceColumnWidthState = Record<DailyReportResourceKind, number[]>;

const todayImageInputRef = ref<HTMLInputElement | null>(null);
const tomorrowImageInputRef = ref<HTMLInputElement | null>(null);
const imageDragState = ref<DailyReportImageDragState | null>(null);
const imageDragOverState = ref<DailyReportImageDragOverState | null>(null);
const resourceColumnResizeState =
  ref<DailyReportResourceColumnResizeState | null>(null);
const dailyReportResourceContextMenu =
  ref<DailyReportResourceContextMenuState | null>(null);
const dailyReportResourceEditState = ref<DailyReportResourceEditState | null>(
  null,
);
const todayWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const tomorrowWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const todayImages = ref<DailyReportImageDraft[]>([]);
const tomorrowImages = ref<DailyReportImageDraft[]>([]);
const materialRows = ref<DailyReportMaterialDraft[]>([]);
const equipmentRows = ref<DailyReportEquipmentDraft[]>([]);
const laborRows = ref<DailyReportLaborDraft[]>([]);
const laborTypeOptions = ref<DailyReportLaborTypeResponse[]>([]);
const equipmentSpecOptions = ref<DailyReportEquipmentSpecResponse[]>([]);
const equipmentTypeOptions = ref<DailyReportEquipmentTypeResponse[]>([]);
const materialTypeOptions = ref<DailyReportMaterialTypeResponse[]>([]);
const materialSpecOptionsByTypeId = ref(
  new Map<number, DailyReportMaterialSpecResponse[]>(),
);
const isDailyReportSaving = ref(false);
const dailyReportSaveMessage = ref("");
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
        .filter((row) => row.includedInDocument)
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
    .map((summary) => {
      const detailText =
        summary.details.length > 1
          ? `(${summary.details
              .map(
                (detail) =>
                  `${detail.label}${formatDailyReportQuantity(detail.quantity)}`,
              )
              .join(",")})`
          : "";

      return `${summary.workType}:${formatDailyReportQuantity(
        summary.totalQuantity,
      )}명${detailText}`;
    });
});
const dailyReportMaterialSummaryItems = computed(() => {
  return materialRows.value
    .filter((row) => row.includedInDocument)
    .map((row) => ({
      label: [
        row.workType.trim(),
        row.type.trim(),
        row.specification.trim(),
      ].filter(Boolean).join(" / "),
      unit: row.unit.trim(),
      quantity: parseDailyReportQuantity(row.todayQuantity),
    }))
    .filter((summary) => summary.quantity > 0)
    .map((summary) => {
      const quantityText = `${formatDailyReportQuantity(summary.quantity)}${summary.unit}`;

      return `${summary.label || "자재"}:${quantityText}`;
    });
});
const dailyReportEquipmentSummaryItems = computed(() => {
  return equipmentRows.value
    .filter((row) => row.includedInDocument)
    .map((row) => ({
      label: [
        row.process.trim(),
        row.type.trim(),
        row.specification.trim(),
      ].filter(Boolean).join(" / "),
      unit: row.unit.trim(),
      quantity: parseDailyReportQuantity(row.todayQuantity),
    }))
    .filter((summary) => summary.quantity > 0)
    .map((summary) => {
      const quantityText = `${formatDailyReportQuantity(summary.quantity)}${summary.unit}`;

      return `${summary.label || "장비"}:${quantityText}`;
    });
});
const dailyReportResourceSummaryGroups = computed(() => [
  {
    key: "labor",
    title: "인력",
    items: dailyReportLaborSummaryItems.value,
  },
  {
    key: "material",
    title: "자재",
    items: dailyReportMaterialSummaryItems.value,
  },
  {
    key: "equipment",
    title: "장비",
    items: dailyReportEquipmentSummaryItems.value,
  },
]);
const hasDailyReportResourceSummary = computed(() =>
  dailyReportResourceSummaryGroups.value.some((group) => group.items.length > 0),
);
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
const homepageImportStatus = ref<"idle" | "loading" | "error">("idle");
const taskSyncRequestIds = new Map<string, number>();
const pendingTaskDeletes = new Set<string>();

function createDailyReportId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `daily-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function trackDailyReportPanelAction(
  action: string,
  result: "success" | "fail" | "attempt",
  meta?: Record<string, unknown>,
) {
  analyticsClient.trackAction(
    DAILY_REPORT_PANEL_ANALYTICS_FEATURE,
    action,
    result,
    meta,
  );
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
  input: Omit<
    DailyReportMaterialDraft,
    | "id"
    | "includedInDocument"
    | "todayQuantity"
    | "materialDeliveryId"
    | "deliveryLineId"
    | "materialSpecId"
    | "materialTypeId"
    | "workTypeId"
  > & {
    includedInDocument?: boolean;
    materialDeliveryId?: number | null;
    deliveryLineId?: number | null;
    materialSpecId?: number | null;
    materialTypeId?: number | null;
    workTypeId?: number | null;
    todayQuantity?: string;
  },
): DailyReportMaterialDraft {
  return {
    ...input,
    id: createDailyReportId(),
    includedInDocument: input.includedInDocument ?? true,
    materialDeliveryId: input.materialDeliveryId ?? null,
    deliveryLineId: input.deliveryLineId ?? null,
    materialSpecId: input.materialSpecId ?? null,
    materialTypeId: input.materialTypeId ?? null,
    workTypeId: input.workTypeId ?? null,
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportEquipmentRow(
  input: Omit<
    DailyReportEquipmentDraft,
    | "id"
    | "includedInDocument"
    | "todayQuantity"
    | "equipmentSpecId"
    | "equipmentTypeId"
    | "workTypeId"
  > & {
    includedInDocument?: boolean;
    equipmentSpecId?: number | null;
    equipmentTypeId?: number | null;
    workTypeId?: number | null;
    todayQuantity?: string;
  },
): DailyReportEquipmentDraft {
  return {
    ...input,
    id: createDailyReportId(),
    includedInDocument: input.includedInDocument ?? true,
    equipmentSpecId: input.equipmentSpecId ?? null,
    equipmentTypeId: input.equipmentTypeId ?? null,
    workTypeId: input.workTypeId ?? null,
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportLaborRow(
  input: Omit<
    DailyReportLaborDraft,
    "id" | "includedInDocument" | "todayQuantity" | "laborTypeId" | "workTypeId"
  > & {
    includedInDocument?: boolean;
    laborTypeId?: number | null;
    workTypeId?: number | null;
    todayQuantity?: string;
  },
): DailyReportLaborDraft {
  return {
    ...input,
    id: createDailyReportId(),
    includedInDocument: input.includedInDocument ?? true,
    laborTypeId: input.laborTypeId ?? null,
    workTypeId: input.workTypeId ?? null,
    todayQuantity: input.todayQuantity ?? "",
  };
}

function createDailyReportMaterialAddDraft(): DailyReportMaterialAddDraft {
  return {
    includedInDocument: true,
    workTypeId: null,
    workType: "",
    type: "",
    specification: "",
    unit: "",
    todayQuantity: "",
  };
}

function createDailyReportEquipmentAddDraft(): DailyReportEquipmentAddDraft {
  return {
    includedInDocument: true,
    workTypeId: null,
    process: "",
    type: "",
    specification: "",
    unit: "",
    todayQuantity: "",
  };
}

function createDailyReportLaborAddDraft(): DailyReportLaborAddDraft {
  return {
    includedInDocument: true,
    workTypeId: null,
    workType: "",
    subWorkType: "",
    todayQuantity: "",
  };
}

function cloneDailyReportResourceRowsSnapshot(): DailyReportResourceRowsSnapshot {
  return {
    labor: laborRows.value.map((row) => ({ ...row })),
    material: materialRows.value.map((row) => ({ ...row })),
    equipment: equipmentRows.value.map((row) => ({ ...row })),
  };
}

function restoreDailyReportResourceRowsSnapshot(
  snapshot: DailyReportResourceRowsSnapshot,
) {
  laborRows.value = snapshot.labor.map((row) => ({ ...row }));
  materialRows.value = snapshot.material.map((row) => ({ ...row }));
  equipmentRows.value = snapshot.equipment.map((row) => ({ ...row }));
}

function getDailyReportResourceKindLabel(kind: DailyReportResourceKind) {
  if (kind === "labor") {
    return "인력";
  }

  if (kind === "material") {
    return "자재";
  }

  return "장비";
}

function getClampedDailyReportResourceFloatingPosition(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): DailyReportResourceFloatingPosition {
  const viewportWidth = window.innerWidth || width;
  const viewportHeight = window.innerHeight || height;
  const margin = 8;

  return {
    left: Math.max(
      margin,
      Math.min(clientX, viewportWidth - width - margin),
    ),
    top: Math.max(
      margin,
      Math.min(clientY, viewportHeight - height - margin),
    ),
  };
}

function getDailyReportResourceFloatingPositionStyle(
  state: DailyReportResourceFloatingPosition,
) {
  return {
    left: `${state.left}px`,
    top: `${state.top}px`,
  };
}

function getDailyReportLaborRow(rowId: string) {
  return laborRows.value.find((row) => row.id === rowId) ?? null;
}

function getDailyReportMaterialRow(rowId: string) {
  return materialRows.value.find((row) => row.id === rowId) ?? null;
}

function getDailyReportEquipmentRow(rowId: string) {
  return equipmentRows.value.find((row) => row.id === rowId) ?? null;
}

function hasDailyReportResourceRow(kind: DailyReportResourceKind, rowId: string) {
  if (kind === "labor") {
    return getDailyReportLaborRow(rowId) !== null;
  }

  if (kind === "material") {
    return getDailyReportMaterialRow(rowId) !== null;
  }

  return getDailyReportEquipmentRow(rowId) !== null;
}

function createDailyReportResourceEditDraft(
  kind: DailyReportResourceKind,
  rowId: string,
): DailyReportResourceEditDraft | null {
  if (kind === "labor") {
    const row = getDailyReportLaborRow(rowId);

    return row
      ? {
          includedInDocument: row.includedInDocument,
          workType: row.workType,
          workTypeId: row.workTypeId,
          subWorkType: row.subWorkType,
          type: "",
          specification: "",
          unit: "",
          todayQuantity: row.todayQuantity,
        }
      : null;
  }

  if (kind === "material") {
    const row = getDailyReportMaterialRow(rowId);

    return row
      ? {
          includedInDocument: row.includedInDocument,
          workType: row.workType,
          workTypeId: row.workTypeId,
          subWorkType: "",
          type: row.type,
          specification: row.specification,
          unit: row.unit,
          todayQuantity: row.todayQuantity,
        }
      : null;
  }

  const row = getDailyReportEquipmentRow(rowId);

  return row
    ? {
        includedInDocument: row.includedInDocument,
        workType: row.process,
        workTypeId: row.workTypeId,
        subWorkType: "",
        type: row.type,
        specification: row.specification,
        unit: row.unit,
        todayQuantity: row.todayQuantity,
      }
    : null;
}

function closeDailyReportResourceContextMenu() {
  dailyReportResourceContextMenu.value = null;
}

function openDailyReportResourceRowMenu(
  kind: DailyReportResourceKind,
  row: DailyReportQuantityDraft,
  event: MouseEvent,
) {
  if (isDailyReportResourceEditingRow(kind, row.id)) {
    event.preventDefault();
    return;
  }

  if (resourceColumnResizeState.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const position = getClampedDailyReportResourceFloatingPosition(
    event.clientX,
    event.clientY,
    DAILY_REPORT_RESOURCE_CONTEXT_MENU_WIDTH,
    DAILY_REPORT_RESOURCE_CONTEXT_MENU_HEIGHT,
  );

  dailyReportResourceContextMenu.value = {
    ...position,
    kind,
    rowId: row.id,
  };
  trackDailyReportPanelAction("open_resource_row_menu", "success", { kind });
}

function isDailyReportResourceContextRow(
  kind: DailyReportResourceKind,
  rowId: string,
) {
  const contextMenu = dailyReportResourceContextMenu.value;

  return contextMenu?.kind === kind && contextMenu.rowId === rowId;
}

function isDailyReportResourceEditingRow(
  kind: DailyReportResourceKind,
  rowId: string,
) {
  const editState = dailyReportResourceEditState.value;

  return editState?.kind === kind && editState.rowId === rowId;
}

function isDailyReportLaborGroupInInlineEdit(group: DailyReportLaborGroup) {
  return group.rows.some((row) =>
    isDailyReportResourceEditingRow("labor", row.id),
  );
}

function startDailyReportResourceContextRowEdit() {
  const contextMenu = dailyReportResourceContextMenu.value;

  if (!contextMenu) {
    return;
  }

  const draft = createDailyReportResourceEditDraft(
    contextMenu.kind,
    contextMenu.rowId,
  );

  if (!draft) {
    closeDailyReportResourceContextMenu();
    return;
  }

  dailyReportResourceEditState.value = {
    kind: contextMenu.kind,
    rowId: contextMenu.rowId,
    draft,
  };
  closeDailyReportResourceContextMenu();
  trackDailyReportPanelAction("edit_resource_row", "attempt", {
    kind: dailyReportResourceEditState.value.kind,
  });
}

function cancelDailyReportResourceRowEdit() {
  dailyReportResourceEditState.value = null;
}

function updateDailyReportResourceEditWorkType(value: string) {
  const editState = dailyReportResourceEditState.value;

  if (!editState) {
    return;
  }

  editState.draft.workType = value;
  editState.draft.workTypeId = null;
}

function selectDailyReportResourceEditWorkType(
  suggestion: Pick<WorkTypeReferenceResponse, "id" | "name">,
) {
  const editState = dailyReportResourceEditState.value;

  if (!editState) {
    return;
  }

  editState.draft.workType = suggestion.name;
  editState.draft.workTypeId = suggestion.id;
}

function updateDailyReportResourceEditQuantity(event: Event) {
  const editState = dailyReportResourceEditState.value;

  if (!editState) {
    return;
  }

  const input = event.target as HTMLInputElement | null;
  const nextValue = normalizeDailyReportQuantityInput(input?.value ?? "");
  editState.draft.todayQuantity = nextValue;

  if (input && input.value !== nextValue) {
    input.value = nextValue;
  }
}

function canSaveDailyReportResourceEdit(
  editState = dailyReportResourceEditState.value,
) {
  if (!editState) {
    return false;
  }

  const { draft, kind } = editState;

  if (kind === "labor") {
    return hasEveryDailyReportResourceField([draft.workType, draft.subWorkType]);
  }

  return hasEveryDailyReportResourceField([
    draft.workType,
    draft.type,
    draft.specification,
    draft.unit,
  ]);
}

function applyDailyReportResourceEditDraft(
  editState: DailyReportResourceEditState,
) {
  const draft = editState.draft;
  const normalizedQuantity = normalizeDailyReportQuantityInput(draft.todayQuantity);

  if (editState.kind === "labor") {
    const row = getDailyReportLaborRow(editState.rowId);
    if (!row) {
      return false;
    }

    const laborType = findDailyReportLaborType(
      draft.workType,
      draft.subWorkType,
    );
    row.includedInDocument = draft.includedInDocument;
    row.workType = draft.workType.trim();
    row.subWorkType = draft.subWorkType.trim();
    row.todayQuantity = normalizedQuantity;
    row.laborTypeId = laborType?.id ?? null;
    row.workTypeId = laborType?.workTypeId ?? draft.workTypeId;
    return true;
  }

  if (editState.kind === "material") {
    const row = getDailyReportMaterialRow(editState.rowId);
    if (!row) {
      return false;
    }

    const typeChanged =
      normalizeDailyReportMatchText(row.type) !==
      normalizeDailyReportMatchText(draft.type);
    const specificationChanged =
      normalizeDailyReportMatchText(row.specification) !==
      normalizeDailyReportMatchText(draft.specification);

    row.includedInDocument = draft.includedInDocument;
    row.workType = draft.workType.trim();
    row.workTypeId = draft.workTypeId;
    row.type = draft.type.trim();
    row.specification = draft.specification.trim();
    row.unit = draft.unit.trim();
    row.todayQuantity = normalizedQuantity;

    if (typeChanged) {
      row.materialDeliveryId = null;
      row.deliveryLineId = null;
      row.materialTypeId = null;
      row.materialSpecId = null;
    } else if (specificationChanged) {
      row.deliveryLineId = null;
      row.materialSpecId = null;
    }

    return true;
  }

  const row = getDailyReportEquipmentRow(editState.rowId);
  if (!row) {
    return false;
  }

  const equipmentIdentityChanged =
    normalizeDailyReportMatchText(row.type) !==
      normalizeDailyReportMatchText(draft.type) ||
    normalizeDailyReportMatchText(row.specification) !==
      normalizeDailyReportMatchText(draft.specification);
  const equipmentSpec = equipmentIdentityChanged
    ? findDailyReportEquipmentSpec(draft.type, draft.specification)
    : null;

  row.includedInDocument = draft.includedInDocument;
  row.process = draft.workType.trim();
  row.workTypeId = draft.workTypeId;
  row.type = draft.type.trim();
  row.specification = draft.specification.trim();
  row.unit = draft.unit.trim();
  row.todayQuantity = normalizedQuantity;

  if (equipmentIdentityChanged) {
    row.equipmentSpecId = equipmentSpec?.id ?? null;
    row.equipmentTypeId = equipmentSpec?.equipmentTypeId ?? null;
  }

  return true;
}

function removeDailyReportResourceRowFromState(
  kind: DailyReportResourceKind,
  rowId: string,
) {
  if (kind === "labor") {
    laborRows.value = laborRows.value.filter((row) => row.id !== rowId);
    return;
  }

  if (kind === "material") {
    materialRows.value = materialRows.value.filter((row) => row.id !== rowId);
    return;
  }

  equipmentRows.value = equipmentRows.value.filter((row) => row.id !== rowId);
}

async function saveDailyReportResourceKind(kind: DailyReportResourceKind) {
  if (kind === "labor") {
    await saveDailyReportAttendance();
    return;
  }

  if (kind === "material") {
    await saveDailyReportMaterial();
    return;
  }

  await saveDailyReportEquipment();
}

async function persistDailyReportResourceKind(
  kind: DailyReportResourceKind,
  action: "edit_resource_row" | "delete_resource_row",
) {
  if (isDailyReportSaving.value) {
    return false;
  }

  dailyReportSaveMessage.value = "";
  isDailyReportSaving.value = true;

  try {
    await saveDailyReportResourceKind(kind);
    dailyReportSaveMessage.value = `${getDailyReportResourceKindLabel(kind)} 항목을 저장했어요.`;
    trackDailyReportPanelAction(action, "success", { kind });
    await hydrateDailyReportResourcesFromServer();
    return true;
  } catch (error) {
    console.error(`${action} failed`, error);
    dailyReportSaveMessage.value =
      error instanceof Error ? error.message : "항목 저장에 실패했어요.";
    trackDailyReportPanelAction(action, "fail", {
      kind,
      error_kind: error instanceof Error ? "api" : "unknown",
    });
    return false;
  } finally {
    isDailyReportSaving.value = false;
  }
}

async function saveDailyReportResourceRowEdit() {
  const editState = dailyReportResourceEditState.value;

  if (!editState || !canSaveDailyReportResourceEdit(editState)) {
    trackDailyReportPanelAction("edit_resource_row", "fail", {
      kind: editState?.kind ?? "unknown",
      reason: "validation",
    });
    return;
  }

  const snapshot = cloneDailyReportResourceRowsSnapshot();

  if (!applyDailyReportResourceEditDraft(editState)) {
    cancelDailyReportResourceRowEdit();
    return;
  }

  const success = await persistDailyReportResourceKind(
    editState.kind,
    "edit_resource_row",
  );

  if (success) {
    cancelDailyReportResourceRowEdit();
  } else {
    restoreDailyReportResourceRowsSnapshot(snapshot);
  }
}

async function deleteDailyReportResourceContextRow() {
  const contextMenu = dailyReportResourceContextMenu.value;

  if (!contextMenu || !hasDailyReportResourceRow(contextMenu.kind, contextMenu.rowId)) {
    closeDailyReportResourceContextMenu();
    return;
  }

  const { kind, rowId } = contextMenu;
  const snapshot = cloneDailyReportResourceRowsSnapshot();
  closeDailyReportResourceContextMenu();

  if (isDailyReportResourceEditingRow(kind, rowId)) {
    cancelDailyReportResourceRowEdit();
  }

  removeDailyReportResourceRowFromState(kind, rowId);

  const success = await persistDailyReportResourceKind(kind, "delete_resource_row");

  if (!success) {
    restoreDailyReportResourceRowsSnapshot(snapshot);
  }
}

function handleDailyReportResourceDocumentMouseDown(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;

  if (target?.closest(".daily-report-resource-context-menu")) {
    return;
  }

  closeDailyReportResourceContextMenu();
}

function handleDailyReportResourceDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  if (dailyReportResourceContextMenu.value) {
    closeDailyReportResourceContextMenu();
    return;
  }

  if (dailyReportResourceEditState.value) {
    cancelDailyReportResourceRowEdit();
  }
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
    width: `max(${tableWidth}px, 100%)`,
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
  const previousDate = selectedReportDate.value;
  const nextDate =
    unit === "day" ? addDays(previousDate, delta) : addMonths(previousDate, delta);

  if (nextDate === previousDate) {
    return;
  }

  selectedReportDate.value = nextDate;
  emit("report-date-change", {
    source: "nav",
    unit,
    direction: delta > 0 ? "next" : "previous",
  });
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
  const previousDate = selectedReportDate.value;
  selectedReportDate.value = date;
  isCalendarOpen.value = false;

  if (date !== previousDate) {
    emit("report-date-change", {
      source: "calendar",
      unit: "date",
      direction: date > previousDate ? "next" : "previous",
    });
  }
}

function jumpToToday() {
  const today = formatLocalDate(new Date());
  const previousDate = selectedReportDate.value;

  selectedReportDate.value = today;
  isCalendarOpen.value = false;

  if (today !== previousDate) {
    emit("report-date-change", {
      source: "today",
      unit: "date",
      direction: "current",
    });
  }
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
  closeDailyReportResourceContextMenu();
  cancelDailyReportResourceRowEdit();
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

function findSectionForTask(task: DailyReportTaskDraft): DailyReportWorkSection | null {
  if (
    todayWorkTypes.value.some((workType) =>
      workType.tasks.some((candidate) => candidate.id === task.id),
    )
  ) {
    return "today";
  }

  if (
    tomorrowWorkTypes.value.some((workType) =>
      workType.tasks.some((candidate) => candidate.id === task.id),
    )
  ) {
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
    trackDailyReportPanelAction("save_work_content", "success", {
      operation: "create",
      section,
      has_work_type: true,
      character_count: trimmedName.length,
    });
  } catch (error) {
    if (isDailyReportMainWorkTypeConnectorError(error)) {
      workType.workTypeId = null;
      trackDailyReportPanelAction("save_work_content", "fail", {
        operation: "create",
        section,
        has_work_type: false,
        error_kind: "missing_connector",
      });
      return;
    }

    console.error("createActualWork failed", error);
    trackDailyReportPanelAction("save_work_content", "fail", {
      operation: "create",
      section,
      has_work_type: workType.workTypeId !== null,
    });
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
    trackDailyReportPanelAction("save_work_content", "success", {
      operation: "update",
      section: findSectionForTask(task) ?? "unknown",
      update_work_type: typeof patch.workTypeId === "number",
      update_context: typeof patch.context === "string",
      character_count: typeof patch.context === "string" ? patch.context.length : 0,
    });
  } catch (error) {
    if (isDailyReportMainWorkTypeConnectorError(error)) {
      trackDailyReportPanelAction("save_work_content", "fail", {
        operation: "update",
        section: findSectionForTask(task) ?? "unknown",
        update_work_type: typeof patch.workTypeId === "number",
        update_context: typeof patch.context === "string",
        error_kind: "missing_connector",
      });
      return;
    }

    console.error("updateActualWork failed", error);
    trackDailyReportPanelAction("save_work_content", "fail", {
      operation: "update",
      section: findSectionForTask(task) ?? "unknown",
      update_work_type: typeof patch.workTypeId === "number",
      update_context: typeof patch.context === "string",
    });
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
    trackDailyReportPanelAction("delete_work_content", "success", {
      section: findSectionForTask(task) ?? "unknown",
    });
  } catch (error) {
    console.error("deleteActualWork failed", error);
    trackDailyReportPanelAction("delete_work_content", "fail", {
      section: findSectionForTask(task) ?? "unknown",
    });
  }
}

function addDailyReportWorkType(section: DailyReportWorkSection) {
  setWorkTypeDrafts(section, [
    ...getWorkTypeDrafts(section),
    createDailyReportWorkTypeDraft(),
  ]);
  trackDailyReportPanelAction("add_work_type", "success", {
    section,
    work_type_count: getWorkTypeDrafts(section).length,
  });
}

function removeDailyReportWorkType(
  section: DailyReportWorkSection,
  workTypeId: string,
) {
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
  trackDailyReportPanelAction("remove_work_type", "success", {
    section,
    task_count: target?.tasks.length ?? 0,
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

function handleDailyReportTaskEnter(
  section: DailyReportWorkSection,
  workType: DailyReportWorkTypeDraft,
  task: DailyReportTaskDraft,
  event: KeyboardEvent,
) {
  if (event.isComposing) {
    return;
  }

  const trimmedText = task.text.trim();

  if (!trimmedText) {
    return;
  }

  trackDailyReportPanelAction("enter_work_content", "success", {
    section,
    has_work_type: workType.workTypeId !== null,
    character_count: trimmedText.length,
    line_count: task.text.split(/\r?\n/).length,
    modified_enter: event.shiftKey || event.metaKey || event.ctrlKey || event.altKey,
  });
}

function loadWorkTypeSuggestions(query: string) {
  return materialInspectionRequestApi.getWorkTypeListByName(query);
}

function updateDailyReportWorkTypeName(
  workType: DailyReportWorkTypeDraft,
  value: string,
) {
  workType.workTypeName = value;
  workType.workTypeId = null;
}

function selectDailyReportWorkTypeSuggestion(
  workType: DailyReportWorkTypeDraft,
  suggestion: Pick<WorkTypeReferenceResponse, "id" | "name">,
) {
  const previousWorkTypeId = workType.workTypeId;
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  trackDailyReportPanelAction("select_work_type", "success", {
    section: findSectionForWorkType(workType) ?? "resource_add_form",
    changed: previousWorkTypeId !== suggestion.id,
  });

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

function isDailyReportMainWorkTypeConnectorError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("workTypeId가 메인 공정표 소속이 아니거나 connector가 없습니다")
  );
}

async function resolveDailyReportWorkContentWorkTypeId(
  workType: DailyReportWorkTypeDraft,
) {
  const resolvedWorkTypeId = await resolveDailyReportWorkTypeId(workType.workTypeName);

  if (resolvedWorkTypeId !== null) {
    workType.workTypeId = resolvedWorkTypeId;
    return resolvedWorkTypeId;
  }

  return workType.workTypeId;
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

function cleanDailyReportReferenceName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/[.,;:，。；：]+$/g, "").trim();
}

function normalizeDailyReportMatchText(value: string | null | undefined) {
  return cleanDailyReportReferenceName(value).replace(/\s+/g, "").toLowerCase();
}

function createDailyReportResourceInclusionKey(
  values: Array<number | string | null | undefined>,
) {
  return values
    .map((value) =>
      typeof value === "number"
        ? String(value)
        : normalizeDailyReportMatchText(value),
    )
    .join("|");
}

function getDailyReportLaborInclusionKey(row: DailyReportLaborDraft) {
  return createDailyReportResourceInclusionKey([
    row.laborTypeId ?? row.workType,
    row.subWorkType,
  ]);
}

function getDailyReportMaterialInclusionKey(row: DailyReportMaterialDraft) {
  if (row.materialDeliveryId !== null && row.materialSpecId !== null) {
    return createDailyReportResourceInclusionKey([
      row.materialDeliveryId,
      row.materialSpecId,
    ]);
  }

  return createDailyReportResourceInclusionKey([
    row.materialSpecId ?? row.specification,
    row.workTypeId ?? row.workType,
    row.materialTypeId ?? row.type,
    row.workType,
    row.type,
    row.specification,
    row.unit,
  ]);
}

function getDailyReportEquipmentInclusionKey(row: DailyReportEquipmentDraft) {
  return createDailyReportResourceInclusionKey([
    row.equipmentSpecId ?? row.specification,
    row.workTypeId ?? row.process,
    row.type,
  ]);
}

function captureDailyReportResourceInclusionState() {
  return {
    labor: new Map(
      laborRows.value.map((row) => [
        getDailyReportLaborInclusionKey(row),
        row.includedInDocument,
      ]),
    ),
    material: new Map(
      materialRows.value.map((row) => [
        getDailyReportMaterialInclusionKey(row),
        row.includedInDocument,
      ]),
    ),
    equipment: new Map(
      equipmentRows.value.map((row) => [
        getDailyReportEquipmentInclusionKey(row),
        row.includedInDocument,
      ]),
    ),
  };
}

function findDailyReportLaborType(workType: string, laborTypeName: string) {
  const normalizedWorkType = normalizeDailyReportMatchText(workType);
  const normalizedLaborTypeName = normalizeDailyReportMatchText(laborTypeName);

  if (!normalizedWorkType || !normalizedLaborTypeName) {
    return null;
  }

  return (
    laborTypeOptions.value.find(
      (option) =>
        normalizeDailyReportMatchText(option.workTypeName) === normalizedWorkType &&
        normalizeDailyReportMatchText(option.name) === normalizedLaborTypeName,
    ) ?? null
  );
}

function isDailyReportLaborTypeMatchForRow(
  laborType: DailyReportLaborTypeResponse,
  row: DailyReportLaborDraft,
) {
  if (
    normalizeDailyReportMatchText(laborType.name) !==
    normalizeDailyReportMatchText(row.subWorkType)
  ) {
    return false;
  }

  if (row.workType.trim()) {
    return (
      normalizeDailyReportMatchText(laborType.workTypeName) ===
      normalizeDailyReportMatchText(row.workType)
    );
  }

  return row.workTypeId !== null && row.workTypeId === laborType.workTypeId;
}

function findDailyReportEquipmentSpec(type: string, specification: string) {
  const normalizedType = normalizeDailyReportMatchText(type);
  const normalizedSpecification = normalizeDailyReportMatchText(specification);

  if (!normalizedSpecification) {
    return null;
  }

  const exactMatches = equipmentSpecOptions.value.filter(
    (option) =>
      normalizeDailyReportMatchText(option.name) === normalizedSpecification &&
      (!normalizedType ||
        normalizeDailyReportMatchText(option.equipmentTypeName) === normalizedType),
  );

  return exactMatches.length === 1 ? exactMatches[0]! : null;
}

async function ensureDailyReportEquipmentTypesLoaded() {
  if (equipmentTypeOptions.value.length > 0) {
    return;
  }

  equipmentTypeOptions.value = await dailyReportResourceApi.getEquipmentTypeList();
}

function findDailyReportEquipmentType(typeName: string) {
  const normalizedTypeName = normalizeDailyReportMatchText(typeName);

  if (!normalizedTypeName) {
    return null;
  }

  const exactMatches = equipmentTypeOptions.value.filter(
    (option) => normalizeDailyReportMatchText(option.name) === normalizedTypeName,
  );

  return exactMatches.length === 1 ? exactMatches[0]! : null;
}

async function ensureDailyReportMaterialTypesLoaded() {
  if (materialTypeOptions.value.length > 0) {
    return;
  }

  materialTypeOptions.value = await dailyReportResourceApi.getMaterialTypeList();
}

async function ensureDailyReportMaterialSpecsLoaded(materialTypeId: number) {
  if (materialSpecOptionsByTypeId.value.has(materialTypeId)) {
    return materialSpecOptionsByTypeId.value.get(materialTypeId)!;
  }

  const specs = await dailyReportResourceApi.getMaterialSpecList(materialTypeId);
  const nextSpecsByTypeId = new Map(materialSpecOptionsByTypeId.value);
  nextSpecsByTypeId.set(materialTypeId, specs);
  materialSpecOptionsByTypeId.value = nextSpecsByTypeId;

  return specs;
}

function findDailyReportMaterialType(typeName: string) {
  const normalizedTypeName = normalizeDailyReportMatchText(typeName);

  if (!normalizedTypeName) {
    return null;
  }

  const exactMatches = materialTypeOptions.value.filter(
    (option) => normalizeDailyReportMatchText(option.name) === normalizedTypeName,
  );

  return exactMatches.length === 1 ? exactMatches[0]! : null;
}

async function findDailyReportMaterialSpec(
  materialTypeId: number,
  specification: string,
) {
  const normalizedSpecification = normalizeDailyReportMatchText(specification);

  if (!normalizedSpecification) {
    return null;
  }

  const specs = await ensureDailyReportMaterialSpecsLoaded(materialTypeId);
  const exactMatches = specs.filter(
    (option) =>
      normalizeDailyReportMatchText(option.name) === normalizedSpecification,
  );

  return exactMatches.length === 1 ? exactMatches[0]! : null;
}

function getDailyReportScheduleWorkTypeName(workTypeId: number) {
  const shellLike = scheduleVm.layout.shell as
    | {
        rows?: Array<{
          workTypeId?: number;
          workType?: string;
          name?: string;
          kind?: string;
        }>;
        value?: {
          rows?: Array<{
            workTypeId?: number;
            workType?: string;
            name?: string;
            kind?: string;
          }>;
        };
      }
    | undefined;
  const rows = Array.isArray(shellLike?.rows)
    ? shellLike.rows
    : Array.isArray(shellLike?.value?.rows)
      ? shellLike.value.rows
      : [];
  const row = rows.find((candidate) => candidate.workTypeId === workTypeId);

  return row?.workType || (row?.kind === "work-type-header" ? row.name : "") || "";
}

function getDailyReportKnownWorkTypeName(workTypeId: number | null) {
  if (workTypeId === null) {
    return "";
  }

  const scheduleName = getDailyReportScheduleWorkTypeName(workTypeId);
  if (scheduleName) {
    return scheduleName;
  }

  const laborType = laborTypeOptions.value.find(
    (option) => option.workTypeId === workTypeId,
  );
  if (laborType?.workTypeName) {
    return laborType.workTypeName;
  }

  const workTypeDraft =
    [...todayWorkTypes.value, ...tomorrowWorkTypes.value].find(
      (draft) => draft.workTypeId === workTypeId,
    ) ?? null;

  return workTypeDraft?.workTypeName ?? `공종 ${workTypeId}`;
}

function findKnownDailyReportWorkTypeId(workTypeName: string) {
  const normalizedWorkTypeName = normalizeDailyReportMatchText(workTypeName);

  if (!normalizedWorkTypeName) {
    return null;
  }

  const exactMatches = laborTypeOptions.value.filter(
    (option) => normalizeDailyReportMatchText(option.workTypeName) === normalizedWorkTypeName,
  );
  const uniqueIds = Array.from(
    new Set(
      exactMatches
        .map((option) => option.workTypeId)
        .filter((id): id is number => id !== null),
    ),
  );

  return uniqueIds.length === 1 ? uniqueIds[0]! : null;
}

async function resolveDailyReportWorkTypeId(workTypeName: string) {
  const knownId = findKnownDailyReportWorkTypeId(workTypeName);

  if (knownId !== null) {
    return knownId;
  }

  const trimmedWorkTypeName = workTypeName.trim();

  if (!trimmedWorkTypeName) {
    return null;
  }

  const suggestions =
    await materialInspectionRequestApi.getWorkTypeListByName(trimmedWorkTypeName);
  const normalizedWorkTypeName = normalizeDailyReportMatchText(trimmedWorkTypeName);
  const exactMatches = suggestions.filter(
    (suggestion) => normalizeDailyReportMatchText(suggestion.name) === normalizedWorkTypeName,
  );

  return exactMatches.length === 1 ? exactMatches[0]!.id : null;
}

async function resolveDailyReportResourceWorkTypeId(
  workTypeName: string,
  currentWorkTypeId: number | null,
) {
  const cleanedWorkTypeName = cleanDailyReportReferenceName(workTypeName);

  if (!cleanedWorkTypeName) {
    return currentWorkTypeId;
  }

  return await resolveDailyReportWorkTypeId(cleanedWorkTypeName);
}

async function loadDailyReportResourceReferences() {
  try {
    const [laborTypes, equipmentSpecs, equipmentTypes, materialTypes] = await Promise.all([
      dailyReportResourceApi.getLaborTypeList(),
      dailyReportResourceApi.getEquipmentSpecList(),
      dailyReportResourceApi.getEquipmentTypeList(),
      dailyReportResourceApi.getMaterialTypeList(),
    ]);

    laborTypeOptions.value = laborTypes;
    equipmentSpecOptions.value = equipmentSpecs;
    equipmentTypeOptions.value = equipmentTypes;
    materialTypeOptions.value = materialTypes;
  } catch (error) {
    console.error("daily report resource references failed", error);
  }
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

function updateDailyReportAddTodayQuantity(
  row: Pick<DailyReportQuantityDraft, "todayQuantity">,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  const nextValue = normalizeDailyReportQuantityInput(input?.value ?? "");
  row.todayQuantity = nextValue;

  if (input && input.value !== nextValue) {
    input.value = nextValue;
  }
}

function trackDailyReportResourceQuantityCommit(
  kind: DailyReportResourceKind,
  row: Pick<DailyReportQuantityDraft, "todayQuantity" | "includedInDocument">,
  source: "existing_row" | "add_form",
) {
  if (source === "add_form") {
    return;
  }

  const normalizedQuantity = normalizeDailyReportQuantityInput(row.todayQuantity);

  if (!normalizedQuantity) {
    return;
  }

  trackDailyReportPanelAction("input_resource_quantity", "success", {
    kind,
    source,
    included_in_document: row.includedInDocument,
    quantity_gt_zero: parseDailyReportQuantity(normalizedQuantity) > 0,
  });
}

function trackDailyReportResourceFieldCommit(
  kind: DailyReportResourceKind,
  field: string,
  value: string,
  source: "add_form" | "existing_row" = "add_form",
) {
  if (source === "add_form") {
    return;
  }

  if (!value.trim()) {
    return;
  }

  trackDailyReportPanelAction("input_resource_field", "success", {
    kind,
    field,
    source,
  });
}

function handleDailyReportResourceInclusionChange(
  kind: DailyReportResourceKind,
  event: Event,
  source: "existing_row" | "add_form",
) {
  if (source === "add_form") {
    return;
  }

  const input = event.target as HTMLInputElement | null;

  trackDailyReportPanelAction("toggle_resource_inclusion", "success", {
    kind,
    source,
    included_in_document: input?.checked ?? false,
  });
}

function toggleDailyReportResourceAddForm(kind: DailyReportResourceKind) {
  const nextOpen = !resourceAddFormsOpen.value[kind];
  resourceAddFormsOpen.value[kind] = nextOpen;
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
    trackDailyReportPanelAction("add_resource_row", "fail", {
      kind: "material",
      reason: "validation",
    });
    return;
  }

  const quantity = normalizeDailyReportQuantityInput(
    materialAddDraft.value.todayQuantity,
  );
  materialRows.value = [
    ...materialRows.value,
    createDailyReportMaterialRow({
      includedInDocument: materialAddDraft.value.includedInDocument,
      materialDeliveryId: null,
      deliveryLineId: null,
      materialSpecId: null,
      materialTypeId: null,
      workTypeId: materialAddDraft.value.workTypeId,
      workType: materialAddDraft.value.workType.trim(),
      type: materialAddDraft.value.type.trim(),
      specification: materialAddDraft.value.specification.trim(),
      unit: materialAddDraft.value.unit.trim(),
      previousQuantity: 0,
      todayQuantity: quantity,
    }),
  ];
  trackDailyReportPanelAction("add_resource_row", "success", {
    kind: "material",
    included_in_document: materialAddDraft.value.includedInDocument,
    has_quantity: Boolean(quantity),
    quantity_gt_zero: parseDailyReportQuantity(quantity) > 0,
    resolved_work_type: materialAddDraft.value.workTypeId !== null,
  });
  resetDailyReportResourceAddDraft("material");
  closeDailyReportResourceAddForm("material");
}

function addDailyReportEquipmentResource() {
  if (!canAddDailyReportResource("equipment")) {
    trackDailyReportPanelAction("add_resource_row", "fail", {
      kind: "equipment",
      reason: "validation",
    });
    return;
  }

  const equipmentSpec = findDailyReportEquipmentSpec(
    equipmentAddDraft.value.type,
    equipmentAddDraft.value.specification,
  );
  const workTypeId =
    equipmentAddDraft.value.workTypeId ??
    findKnownDailyReportWorkTypeId(equipmentAddDraft.value.process);
  const quantity = normalizeDailyReportQuantityInput(
    equipmentAddDraft.value.todayQuantity,
  );

  equipmentRows.value = [
    ...equipmentRows.value,
    createDailyReportEquipmentRow({
      includedInDocument: equipmentAddDraft.value.includedInDocument,
      equipmentSpecId: equipmentSpec?.id ?? null,
      equipmentTypeId: equipmentSpec?.equipmentTypeId ?? null,
      workTypeId,
      process: equipmentAddDraft.value.process.trim(),
      type: equipmentAddDraft.value.type.trim(),
      specification: equipmentAddDraft.value.specification.trim(),
      unit: equipmentAddDraft.value.unit.trim(),
      previousQuantity: 0,
      todayQuantity: quantity,
    }),
  ];
  trackDailyReportPanelAction("add_resource_row", "success", {
    kind: "equipment",
    included_in_document: equipmentAddDraft.value.includedInDocument,
    has_quantity: Boolean(quantity),
    quantity_gt_zero: parseDailyReportQuantity(quantity) > 0,
    resolved_spec: equipmentSpec !== null,
    resolved_work_type: workTypeId !== null,
  });
  resetDailyReportResourceAddDraft("equipment");
  closeDailyReportResourceAddForm("equipment");
}

function addDailyReportLaborResource() {
  if (!canAddDailyReportResource("labor")) {
    trackDailyReportPanelAction("add_resource_row", "fail", {
      kind: "labor",
      reason: "validation",
    });
    return;
  }

  const laborType = findDailyReportLaborType(
    laborAddDraft.value.workType,
    laborAddDraft.value.subWorkType,
  );
  const workTypeId =
    laborType?.workTypeId ??
    laborAddDraft.value.workTypeId ??
    findKnownDailyReportWorkTypeId(laborAddDraft.value.workType);
  const quantity = normalizeDailyReportQuantityInput(
    laborAddDraft.value.todayQuantity,
  );

  laborRows.value = [
    ...laborRows.value,
    createDailyReportLaborRow({
      includedInDocument: laborAddDraft.value.includedInDocument,
      laborTypeId: laborType?.id ?? null,
      workTypeId,
      workType: laborAddDraft.value.workType.trim(),
      subWorkType: laborAddDraft.value.subWorkType.trim(),
      previousQuantity: 0,
      todayQuantity: quantity,
    }),
  ];
  trackDailyReportPanelAction("add_resource_row", "success", {
    kind: "labor",
    included_in_document: laborAddDraft.value.includedInDocument,
    has_quantity: Boolean(quantity),
    quantity_gt_zero: parseDailyReportQuantity(quantity) > 0,
    resolved_labor_type: laborType !== null,
  });
  resetDailyReportResourceAddDraft("labor");
  closeDailyReportResourceAddForm("labor");
}

function waitForDailyReportTaskSync(task: DailyReportTaskDraft) {
  if (!task.isSyncing) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      if (!task.isSyncing || Date.now() - startedAt > 5000) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, 60);
  });
}

async function saveDailyReportTask(
  workType: DailyReportWorkTypeDraft,
  task: DailyReportTaskDraft,
  section: DailyReportWorkSection,
) {
  await waitForDailyReportTaskSync(task);

  const trimmedContext = task.text.trim();

  if (!trimmedContext) {
    return;
  }

  const workTypeId = await resolveDailyReportWorkContentWorkTypeId(workType);

  if (workTypeId === null) {
    throw new Error("작업내용의 공종을 선택해 주세요.");
  }

  try {
    if (task.actualWorkId === null) {
      const response = await actualWorkApi.create({
        date: getSectionDate(section),
        workTypeId,
        context: trimmedContext,
      });
      applyResponseToTask(task, response);
      applyActualWorkAffectedWorks(response);
      return;
    }

    const response = await actualWorkApi.update(task.actualWorkId, {
      date: getSectionDate(section),
      workTypeId,
      context: trimmedContext,
    });
    applyResponseToTask(task, response);
    applyActualWorkAffectedWorks(response);
  } catch (error) {
    if (isDailyReportMainWorkTypeConnectorError(error)) {
      workType.workTypeId = null;
      throw new Error(
        `작업내용의 공종을 다시 선택해 주세요: ${workType.workTypeName}`,
      );
    }

    throw error;
  }
}

async function saveDailyReportWorkSection(section: DailyReportWorkSection) {
  for (const workType of getWorkTypeDrafts(section)) {
    for (const task of workType.tasks) {
      await saveDailyReportTask(workType, task, section);
    }
  }
}

async function resolveDailyReportLaborTypeId(
  row: DailyReportLaborDraft,
  shouldCreateMissing = false,
) {
  if (row.laborTypeId !== null) {
    const existingLaborType =
      laborTypeOptions.value.find((option) => option.id === row.laborTypeId) ?? null;

    if (
      existingLaborType &&
      isDailyReportLaborTypeMatchForRow(existingLaborType, row)
    ) {
      return row.laborTypeId;
    }

    if (
      existingLaborType &&
      row.workTypeId === existingLaborType.workTypeId &&
      normalizeDailyReportMatchText(row.workType) !==
        normalizeDailyReportMatchText(existingLaborType.workTypeName)
    ) {
      row.workTypeId = null;
    }

    row.laborTypeId = null;
  }

  const laborType = findDailyReportLaborType(row.workType, row.subWorkType);
  if (laborType) {
    row.laborTypeId = laborType.id;
    row.workTypeId = laborType.workTypeId;
    return laborType.id;
  }

  if (!shouldCreateMissing) {
    return null;
  }

  const laborTypeName = cleanDailyReportReferenceName(row.subWorkType);
  const workTypeName = cleanDailyReportReferenceName(row.workType);

  if (!laborTypeName || !workTypeName) {
    return null;
  }

  const workTypeId = await resolveDailyReportResourceWorkTypeId(
    workTypeName,
    row.workTypeId,
  );

  if (workTypeId === null) {
    return null;
  }

  const createdLaborType = await dailyReportResourceApi.createLaborType({
    name: laborTypeName,
    workTypeId,
    isVisible: true,
  });

  laborTypeOptions.value = [...laborTypeOptions.value, createdLaborType];
  row.laborTypeId = createdLaborType.id;
  row.workTypeId = createdLaborType.workTypeId;
  row.workType = createdLaborType.workTypeName || workTypeName;
  row.subWorkType = createdLaborType.name;

  return createdLaborType.id;
}

async function resolveDailyReportEquipmentTypeId(
  row: DailyReportEquipmentDraft,
  shouldCreateMissing = false,
) {
  if (row.equipmentTypeId !== null) {
    return row.equipmentTypeId;
  }

  await ensureDailyReportEquipmentTypesLoaded();
  const equipmentType = findDailyReportEquipmentType(row.type);

  if (equipmentType) {
    row.equipmentTypeId = equipmentType.id;
    row.type = equipmentType.name;
    return equipmentType.id;
  }

  if (!shouldCreateMissing) {
    return null;
  }

  const equipmentTypeName = cleanDailyReportReferenceName(row.type);

  if (!equipmentTypeName) {
    return null;
  }

  const createdEquipmentType = await dailyReportResourceApi.createEquipmentType({
    name: equipmentTypeName,
  });

  equipmentTypeOptions.value = [...equipmentTypeOptions.value, createdEquipmentType];
  row.equipmentTypeId = createdEquipmentType.id;
  row.type = createdEquipmentType.name;

  return createdEquipmentType.id;
}

async function resolveDailyReportMaterialTypeId(
  row: DailyReportMaterialDraft,
  shouldCreateMissing = false,
) {
  if (row.materialTypeId !== null) {
    return row.materialTypeId;
  }

  await ensureDailyReportMaterialTypesLoaded();
  const materialType = findDailyReportMaterialType(row.type);

  if (materialType) {
    row.materialTypeId = materialType.id;

    if (!row.unit.trim()) {
      row.unit = materialType.unit ?? "";
    }

    return materialType.id;
  }

  if (!shouldCreateMissing) {
    return null;
  }

  const materialTypeName = cleanDailyReportReferenceName(row.type);

  if (!materialTypeName) {
    return null;
  }

  const createdMaterialType = await dailyReportResourceApi.createMaterialType({
    name: materialTypeName,
    unit: cleanDailyReportReferenceName(row.unit) || undefined,
  });

  materialTypeOptions.value = [...materialTypeOptions.value, createdMaterialType];
  row.materialTypeId = createdMaterialType.id;
  row.type = createdMaterialType.name;

  if (!row.unit.trim()) {
    row.unit = createdMaterialType.unit ?? "";
  }

  return createdMaterialType.id;
}

function appendDailyReportMaterialSpecOption(
  materialTypeId: number,
  materialSpec: DailyReportMaterialSpecResponse,
) {
  const nextSpecsByTypeId = new Map(materialSpecOptionsByTypeId.value);
  const specs = nextSpecsByTypeId.get(materialTypeId) ?? [];
  nextSpecsByTypeId.set(materialTypeId, [...specs, materialSpec]);
  materialSpecOptionsByTypeId.value = nextSpecsByTypeId;
}

async function saveDailyReportAttendance() {
  const entryMap = new Map<number, number>();
  const unresolvedRows: string[] = [];

  for (const row of laborRows.value) {
    const count = Math.max(0, Math.round(parseDailyReportQuantity(row.todayQuantity)));
    const hasInput = row.todayQuantity.trim().length > 0 || count > 0;
    const laborTypeId = await resolveDailyReportLaborTypeId(row, hasInput);

    if (laborTypeId === null) {
      if (hasInput) {
        unresolvedRows.push(`${row.workType} / ${row.subWorkType}`);
      }
      continue;
    }

    entryMap.set(laborTypeId, (entryMap.get(laborTypeId) ?? 0) + count);
  }

  if (unresolvedRows.length > 0) {
    throw new Error(`인력 항목의 직종을 찾지 못했습니다: ${unresolvedRows.join(", ")}`);
  }

  const entries = Array.from(entryMap.entries()).map(([laborTypeId, count]) => ({
    laborTypeId,
    count,
  }));

  await dailyReportResourceApi.updateAttendance({
    date: reportDates.value.today,
    entries,
  });
}

async function resolveDailyReportEquipmentRowIds(
  row: DailyReportEquipmentDraft,
  shouldCreateMissing = false,
) {
  let equipmentSpecId = row.equipmentSpecId;
  let workTypeId = row.workTypeId;

  if (equipmentSpecId === null) {
    const equipmentSpec = findDailyReportEquipmentSpec(row.type, row.specification);
    if (equipmentSpec) {
      row.equipmentSpecId = equipmentSpec.id;
      row.equipmentTypeId = equipmentSpec.equipmentTypeId;
      equipmentSpecId = equipmentSpec.id;
    }
  }

  if (equipmentSpecId === null && shouldCreateMissing) {
    const equipmentTypeId = await resolveDailyReportEquipmentTypeId(row, true);
    const equipmentSpecName = cleanDailyReportReferenceName(row.specification);

    if (equipmentTypeId !== null && equipmentSpecName) {
      const createdEquipmentSpec = await dailyReportResourceApi.createEquipmentSpec({
        name: equipmentSpecName,
        equipmentTypeId,
        isVisible: true,
      });

      equipmentSpecOptions.value = [...equipmentSpecOptions.value, createdEquipmentSpec];
      row.equipmentSpecId = createdEquipmentSpec.id;
      row.equipmentTypeId = createdEquipmentSpec.equipmentTypeId;
      row.type = createdEquipmentSpec.equipmentTypeName || row.type;
      row.specification = createdEquipmentSpec.name;
      equipmentSpecId = createdEquipmentSpec.id;
    }
  }

  workTypeId = await resolveDailyReportResourceWorkTypeId(row.process, workTypeId);
  row.workTypeId = workTypeId;

  return equipmentSpecId !== null && workTypeId !== null
    ? { equipmentSpecId, workTypeId }
    : null;
}

async function saveDailyReportEquipment() {
  const entryMap = new Map<string, { equipmentSpecId: number; workTypeId: number; count: number }>();
  const unresolvedRows: string[] = [];

  for (const row of equipmentRows.value) {
    const count = Math.max(0, Math.round(parseDailyReportQuantity(row.todayQuantity)));
    const hasInput = row.todayQuantity.trim().length > 0 || count > 0;
    const resolved = await resolveDailyReportEquipmentRowIds(row, hasInput);

    if (!resolved) {
      if (hasInput) {
        unresolvedRows.push(`${row.process} / ${row.type} / ${row.specification}`);
      }
      continue;
    }

    const key = `${resolved.equipmentSpecId}:${resolved.workTypeId}`;
    const previous = entryMap.get(key);
    entryMap.set(key, {
      ...resolved,
      count: (previous?.count ?? 0) + count,
    });
  }

  if (unresolvedRows.length > 0) {
    throw new Error(`장비 항목의 공종 또는 규격을 찾지 못했습니다: ${unresolvedRows.join(", ")}`);
  }

  const entries = Array.from(entryMap.values());

  await dailyReportResourceApi.updateEquipmentDeployment({
    date: reportDates.value.today,
    entries,
  });
}

async function resolveDailyReportMaterialRowIds(
  row: DailyReportMaterialDraft,
  shouldCreateMissing = false,
) {
  let materialTypeId = row.materialTypeId;
  let materialSpecId = row.materialSpecId;
  let workTypeId = row.workTypeId;

  if (materialTypeId === null) {
    materialTypeId = await resolveDailyReportMaterialTypeId(row, shouldCreateMissing);
  }

  if (materialTypeId !== null && materialSpecId === null) {
    const materialSpec = await findDailyReportMaterialSpec(
      materialTypeId,
      row.specification,
    );

    if (materialSpec) {
      row.materialSpecId = materialSpec.id;
      materialSpecId = materialSpec.id;
    }
  }

  if (materialTypeId !== null && materialSpecId === null && shouldCreateMissing) {
    const materialSpecName = cleanDailyReportReferenceName(row.specification);

    if (materialSpecName) {
      const createdMaterialSpec = await dailyReportResourceApi.createMaterialSpec({
        name: materialSpecName,
        materialTypeId,
        isVisible: true,
      });

      appendDailyReportMaterialSpecOption(materialTypeId, createdMaterialSpec);
      row.materialSpecId = createdMaterialSpec.id;
      row.specification = createdMaterialSpec.name;
      materialSpecId = createdMaterialSpec.id;
    }
  }

  workTypeId = await resolveDailyReportResourceWorkTypeId(row.workType, workTypeId);
  row.workTypeId = workTypeId;

  return materialTypeId !== null &&
    materialSpecId !== null &&
    workTypeId !== null
    ? { materialTypeId, materialSpecId, workTypeId }
    : null;
}

function toDailyReportMaterialDeliveryQuantity(value: string | number | null) {
  if (value === null || value === undefined) {
    return "0";
  }

  return normalizeDailyReportQuantityInput(String(value));
}

function toDailyReportMaterialDeliveryRequestItem(
  delivery: DailyReportMaterialDeliveryResponse,
) {
  if (delivery.workTypeId === null) {
    throw new Error(
      `${delivery.date} ${delivery.materialTypeName ?? "자재"} 항목의 공종 매핑을 찾지 못했습니다.`,
    );
  }

  return {
    materialDeliveryId: delivery.materialDeliveryId,
    date: delivery.date,
    workTypeId: delivery.workTypeId,
    materialTypeId: delivery.materialTypeId,
    lines: delivery.lines.map((line) => ({
      materialSpecId: line.materialSpecId,
      quantity: toDailyReportMaterialDeliveryQuantity(line.quantity),
    })),
  };
}

function getDailyReportMaterialDeliveryGroupKey(date: string, materialTypeId: number) {
  return `${date}:${materialTypeId}`;
}

function getDailyReportMaterialLineQuantityKey(
  workTypeId: number | null,
  materialTypeId: number,
  materialSpecId: number,
) {
  return `${workTypeId ?? "unknown"}:${materialTypeId}:${materialSpecId}`;
}

async function buildCurrentDateMaterialDeliveryRequests(
  currentDeliveries: DailyReportMaterialDeliveryResponse[],
) {
  const selectedDate = reportDates.value.today;
  const deliveryByGroupKey = new Map(
    currentDeliveries.map((delivery) => [
      getDailyReportMaterialDeliveryGroupKey(delivery.date, delivery.materialTypeId),
      delivery,
    ]),
  );
  const groupMap = new Map<
    number,
    {
      materialDeliveryId: number | null;
      workTypeId: number;
      materialTypeId: number;
      lineQuantities: Map<number, number>;
    }
  >();
  const unresolvedRows: string[] = [];

  for (const row of materialRows.value) {
    const hasInput =
      row.workType.trim() ||
      row.type.trim() ||
      row.specification.trim() ||
      row.unit.trim() ||
      row.todayQuantity.trim();
    const resolved = await resolveDailyReportMaterialRowIds(row, Boolean(hasInput));

    if (!resolved) {
      if (hasInput) {
        unresolvedRows.push(
          [row.workType, row.type, row.specification].filter(Boolean).join(" / "),
        );
      }
      continue;
    }

    const existingDelivery = deliveryByGroupKey.get(
      getDailyReportMaterialDeliveryGroupKey(
        selectedDate,
        resolved.materialTypeId,
      ),
    );
    const group = groupMap.get(resolved.materialTypeId);

    if (group && group.workTypeId !== resolved.workTypeId) {
      throw new Error(
        `${row.type} 자재는 같은 날짜에 하나의 공종으로만 저장할 수 있습니다.`,
      );
    }

    const nextGroup =
      group ??
      {
        materialDeliveryId:
          existingDelivery?.materialDeliveryId ?? row.materialDeliveryId ?? null,
        workTypeId: resolved.workTypeId,
        materialTypeId: resolved.materialTypeId,
        lineQuantities: new Map<number, number>(),
      };
    const quantity = Math.max(0, parseDailyReportQuantity(row.todayQuantity));
    nextGroup.lineQuantities.set(
      resolved.materialSpecId,
      (nextGroup.lineQuantities.get(resolved.materialSpecId) ?? 0) + quantity,
    );
    groupMap.set(resolved.materialTypeId, nextGroup);
  }

  if (unresolvedRows.length > 0) {
    throw new Error(
      `자재 항목의 공종, 타입 또는 규격을 찾지 못했습니다: ${unresolvedRows.join(", ")}`,
    );
  }

  return Array.from(groupMap.values()).map((group) => ({
    materialDeliveryId: group.materialDeliveryId,
    date: selectedDate,
    workTypeId: group.workTypeId,
    materialTypeId: group.materialTypeId,
    lines: Array.from(group.lineQuantities.entries()).map(
      ([materialSpecId, quantity]) => ({
        materialSpecId,
        quantity: toDailyReportMaterialDeliveryQuantity(quantity),
      }),
    ),
  }));
}

async function saveDailyReportMaterial() {
  const currentDeliveries = await dailyReportResourceApi.getMaterialDeliveryList();
  const selectedDate = reportDates.value.today;

  if (
    materialRows.value.length === 0 &&
    !currentDeliveries.some((delivery) => delivery.date === selectedDate)
  ) {
    return;
  }

  const preservedRequests = currentDeliveries
    .filter((delivery) => delivery.date !== selectedDate)
    .map(toDailyReportMaterialDeliveryRequestItem);
  const currentDateRequests =
    await buildCurrentDateMaterialDeliveryRequests(currentDeliveries);
  const requestBody: DailyReportMaterialDeliveryUpdateRequest = [
    ...preservedRequests,
    ...currentDateRequests,
  ];

  await dailyReportResourceApi.updateMaterialDeliveryList(requestBody);
}

async function handleDailyReportSave() {
  if (isDailyReportSaving.value) {
    return;
  }

  homepageImportStatus.value = "idle";
  dailyReportSaveMessage.value = "";
  isDailyReportSaving.value = true;

  try {
    await saveDailyReportWorkSection("today");
    await saveDailyReportWorkSection("tomorrow");
    await saveDailyReportAttendance();
    await saveDailyReportMaterial();
    await saveDailyReportEquipment();
    dailyReportSaveMessage.value = "작업내용, 인력, 자재, 장비를 저장했어요.";
    trackDailyReportPanelAction("save_panel", "success", {
      today_work_type_count: todayWorkTypes.value.length,
      tomorrow_work_type_count: tomorrowWorkTypes.value.length,
      labor_row_count: laborRows.value.length,
      material_row_count: materialRows.value.length,
      equipment_row_count: equipmentRows.value.length,
    });
    await hydrateDailyReportFromServer();
  } catch (error) {
    console.error("daily report save failed", error);
    dailyReportSaveMessage.value =
      error instanceof Error ? error.message : "작업일보 저장에 실패했어요.";
    trackDailyReportPanelAction("save_panel", "fail", {
      error_kind: error instanceof Error ? "api" : "unknown",
    });
  } finally {
    isDailyReportSaving.value = false;
  }
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

async function hydrateDailyReportActualWorksFromServer() {
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
    console.error("hydrate daily report actual works failed", error);
  }
}

async function hydrateDailyReportResourcesFromServer() {
  try {
    const inclusionState = captureDailyReportResourceInclusionState();
    const [attendanceResponses, equipmentResponses, materialDeliveries] =
      await Promise.all([
        dailyReportResourceApi.getAttendanceListByDate(reportDates.value.today),
        dailyReportResourceApi.getEquipmentDeploymentListByDate(reportDates.value.today),
        dailyReportResourceApi.getMaterialDeliveryList(),
      ]);

    laborRows.value = attendanceResponses.map((response) =>
      createDailyReportLaborRow({
        includedInDocument:
          inclusionState.labor.get(
            createDailyReportResourceInclusionKey([
              response.laborTypeId,
              response.laborTypeName,
            ]),
          ) ?? true,
        laborTypeId: response.laborTypeId,
        workTypeId: response.workTypeId,
        workType: response.workTypeName ?? "",
        subWorkType: response.laborTypeName ?? "",
        previousQuantity: 0,
        todayQuantity: String(response.count),
      }),
    );

    equipmentRows.value = equipmentResponses.map((response) =>
      createDailyReportEquipmentRow({
        includedInDocument:
          inclusionState.equipment.get(
            createDailyReportResourceInclusionKey([
              response.equipmentSpecId,
              response.workTypeId,
              response.equipmentTypeName,
            ]),
          ) ?? true,
        equipmentSpecId: response.equipmentSpecId,
        equipmentTypeId: response.equipmentTypeId,
        workTypeId: response.workTypeId,
        process: response.workTypeName ?? "",
        type: response.equipmentTypeName ?? "",
        specification: response.equipmentSpecName ?? "",
        unit: "",
        previousQuantity: 0,
        todayQuantity: String(response.count),
      }),
    );

    const selectedDate = reportDates.value.today;
    const previousQuantityByLineKey = new Map<string, number>();

    materialDeliveries
      .filter((delivery) => delivery.date < selectedDate)
      .forEach((delivery) => {
        delivery.lines.forEach((line) => {
          const key = getDailyReportMaterialLineQuantityKey(
            delivery.workTypeId,
            delivery.materialTypeId,
            line.materialSpecId,
          );
          previousQuantityByLineKey.set(
            key,
            (previousQuantityByLineKey.get(key) ?? 0) +
              parseDailyReportQuantity(line.quantity ?? 0),
          );
        });
      });

    materialRows.value = materialDeliveries
      .filter((delivery) => delivery.date === selectedDate)
      .flatMap((delivery) =>
        delivery.lines.map((line) =>
          createDailyReportMaterialRow({
            includedInDocument:
              inclusionState.material.get(
                createDailyReportResourceInclusionKey([
                  delivery.materialDeliveryId,
                  line.materialSpecId,
                ]),
              ) ??
              inclusionState.material.get(
                createDailyReportResourceInclusionKey([
                  line.materialSpecId,
                  delivery.workTypeId,
                  delivery.materialTypeId,
                  getDailyReportKnownWorkTypeName(delivery.workTypeId),
                  delivery.materialTypeName,
                  line.materialSpecName,
                  delivery.unit,
                ]),
              ) ??
              true,
            materialDeliveryId: delivery.materialDeliveryId,
            deliveryLineId: line.deliveryLineId,
            materialSpecId: line.materialSpecId,
            materialTypeId: delivery.materialTypeId,
            workTypeId: delivery.workTypeId,
            workType: getDailyReportKnownWorkTypeName(delivery.workTypeId),
            type: delivery.materialTypeName ?? "",
            specification: line.materialSpecName ?? "",
            unit: delivery.unit ?? "",
            previousQuantity:
              previousQuantityByLineKey.get(
                getDailyReportMaterialLineQuantityKey(
                  delivery.workTypeId,
                  delivery.materialTypeId,
                  line.materialSpecId,
                ),
              ) ?? 0,
            todayQuantity:
              line.quantity === null || line.quantity === undefined
                ? ""
                : String(line.quantity),
          }),
        ),
      );
  } catch (error) {
    console.error("hydrate daily report resources failed", error);
  }
}

async function hydrateDailyReportFromServer() {
  await Promise.all([
    hydrateDailyReportActualWorksFromServer(),
    hydrateDailyReportResourcesFromServer(),
  ]);
}

onMounted(() => {
  void loadDailyReportResourceReferences();
  void hydrateDailyReportFromServer();
  document.addEventListener("mousedown", handleReportDateOutsideClick);
  document.addEventListener("mousedown", handleDailyReportResourceDocumentMouseDown);
  document.addEventListener("keydown", handleDailyReportResourceDocumentKeydown);
});

onUnmounted(() => {
  stopDailyReportResourceColumnResize();
  document.removeEventListener("mousedown", handleReportDateOutsideClick);
  document.removeEventListener(
    "mousedown",
    handleDailyReportResourceDocumentMouseDown,
  );
  document.removeEventListener("keydown", handleDailyReportResourceDocumentKeydown);
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
        class="daily-report-tab-panel daily-report-tab-panel--summary"
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
              <ul class="daily-report-summary__task-list">
                <li
                  v-for="(line, lineIndex) in group.lines"
                  :key="lineIndex"
                  class="daily-report-summary__task"
                >{{ line }}</li>
              </ul>
            </div>
            <p
              v-if="dailyReportTodayWorkSummaryGroups.length === 0"
              class="daily-report-summary__empty"
            >
              오늘작업 내용이 없습니다.
            </p>
          </div>
        </section>

        <section
          class="daily-report-summary-card"
          aria-label="투입현황 모아보기"
          aria-live="polite"
        >
          <header class="daily-report-summary-card__header">
            <span class="daily-report-summary-card__title">투입현황</span>
          </header>
          <div class="daily-report-summary-card__body">
            <template v-if="hasDailyReportResourceSummary">
              <div
                v-for="group in dailyReportResourceSummaryGroups"
                :key="group.key"
                class="daily-report-summary__group"
              >
                <h3 class="daily-report-summary__group-title">{{ group.title }}</h3>
                <ul
                  v-if="group.items.length > 0"
                  class="daily-report-summary__task-list"
                >
                  <li
                    v-for="(item, itemIndex) in group.items"
                    :key="`${group.key}-${itemIndex}-${item}`"
                    class="daily-report-summary__task"
                  >{{ item }}</li>
                </ul>
                <p
                  v-else
                  class="daily-report-summary__empty daily-report-summary__empty--group"
                >
                  입력된 {{ group.title }} 투입 내용이 없습니다.
                </p>
              </div>
            </template>
            <p
              v-else
              class="daily-report-summary__empty"
            >
              입력된 투입 내용이 없습니다.
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
                    <WorkTypeTypeaheadInput
                      :model-value="workType.workTypeName"
                      variant="daily-report"
                      placeholder="공종명을 입력해 주세요."
                      :selected-id="workType.workTypeId"
                      :load-suggestions="loadWorkTypeSuggestions"
                      :option-id-prefix="`daily-report-today-work-type-${workType.id}`"
                      @update:model-value="
                        updateDailyReportWorkTypeName(workType, $event)
                      "
                      @select="selectDailyReportWorkTypeSuggestion(workType, $event)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('today', workType.id)"
                    >
                      ×
                    </button>
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
	                      @keydown.enter="
	                        handleDailyReportTaskEnter(
	                          'today',
	                          workType,
	                          getPrimaryDailyReportTask(workType),
	                          $event,
	                        )
	                      "
	                      @blur="handleTaskBlur(workType, getPrimaryDailyReportTask(workType))"
	                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-worktype-add-row">
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('today')"
            >
              + 공종 추가
            </button>
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
                    <WorkTypeTypeaheadInput
                      :model-value="workType.workTypeName"
                      variant="daily-report"
                      placeholder="공종명을 입력해 주세요."
                      :selected-id="workType.workTypeId"
                      :load-suggestions="loadWorkTypeSuggestions"
                      :option-id-prefix="`daily-report-tomorrow-work-type-${workType.id}`"
                      @update:model-value="
                        updateDailyReportWorkTypeName(workType, $event)
                      "
                      @select="selectDailyReportWorkTypeSuggestion(workType, $event)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('tomorrow', workType.id)"
                    >
                      ×
                    </button>
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
	                      @keydown.enter="
	                        handleDailyReportTaskEnter(
	                          'tomorrow',
	                          workType,
	                          getPrimaryDailyReportTask(workType),
	                          $event,
	                        )
	                      "
	                      @blur="handleTaskBlur(workType, getPrimaryDailyReportTask(workType))"
	                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-worktype-add-row">
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('tomorrow')"
            >
              + 공종 추가
            </button>
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
                <col class="daily-report-resource-sheet__filler-col" />
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
                  <th
                    class="daily-report-resource-sheet__filler-header"
                    aria-hidden="true"
                  ></th>
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
                    :class="{
                      'daily-report-resource-sheet__row--excluded':
                        !row.includedInDocument,
                      'daily-report-resource-sheet__row--menu-open':
                        isDailyReportResourceContextRow('labor', row.id),
                      'daily-report-resource-sheet__row--editing':
                        isDailyReportResourceEditingRow('labor', row.id),
                    }"
                    @contextmenu="
                      openDailyReportResourceRowMenu('labor', row, $event)
                    "
                  >
                    <template
                      v-if="
                        isDailyReportResourceEditingRow('labor', row.id) &&
                        dailyReportResourceEditState
                      "
                    >
                      <td class="daily-report-resource-sheet__include-cell">
                        <label class="daily-report-resource-sheet__include-toggle">
                          <input
                            v-model="
                              dailyReportResourceEditState.draft.includedInDocument
                            "
                            type="checkbox"
                            aria-label="수정할 인력 문서 포함"
                          />
                          <span aria-hidden="true"></span>
                        </label>
                      </td>
                      <td class="daily-report-resource-sheet__add-input-cell">
                        <WorkTypeTypeaheadInput
                          :model-value="dailyReportResourceEditState.draft.workType"
                          variant="sheet"
                          placeholder="공종"
                          aria-label="수정할 인력 공종"
                          :selected-id="dailyReportResourceEditState.draft.workTypeId"
                          :load-suggestions="loadWorkTypeSuggestions"
                          :option-id-prefix="`daily-report-labor-edit-work-type-${row.id}`"
                          @update:model-value="updateDailyReportResourceEditWorkType"
                          @select="selectDailyReportResourceEditWorkType"
                        />
                      </td>
                      <td class="daily-report-resource-sheet__add-input-cell">
                        <input
                          v-model="dailyReportResourceEditState.draft.subWorkType"
                          class="daily-report-resource-sheet__add-text-input"
                          type="text"
                          aria-label="수정할 인력 직종"
                          placeholder="직종"
                        />
                      </td>
                      <td class="daily-report-resource-sheet__today-cell">
                        <input
                          v-model="dailyReportResourceEditState.draft.todayQuantity"
                          class="daily-report-resource-sheet__today-input"
                          inputmode="decimal"
                          type="text"
                          aria-label="수정할 인력 금일 수량"
                          placeholder="0"
                          @input="updateDailyReportResourceEditQuantity"
                        />
                      </td>
                      <td class="daily-report-resource-sheet__add-actions-cell">
                        <div class="daily-report-resource-sheet__add-actions">
                          <button
                            type="button"
                            class="daily-report-resource-sheet__add-action-button"
                            @click="cancelDailyReportResourceRowEdit"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                            :disabled="
                              isDailyReportSaving ||
                              !canSaveDailyReportResourceEdit(
                                dailyReportResourceEditState,
                              )
                            "
                            @click="saveDailyReportResourceRowEdit"
                          >
                            저장
                          </button>
                        </div>
                      </td>
                      <td
                        class="daily-report-resource-sheet__filler-cell"
                        aria-hidden="true"
                      ></td>
                    </template>
                    <template v-else>
                      <td class="daily-report-resource-sheet__include-cell">
                        <label class="daily-report-resource-sheet__include-toggle">
	                          <input
	                            v-model="row.includedInDocument"
	                            type="checkbox"
	                            :aria-label="`${row.workType} ${row.subWorkType} 문서 포함`"
	                            @change="
	                              handleDailyReportResourceInclusionChange(
	                                'labor',
	                                $event,
	                                'existing_row',
	                              )
	                            "
	                          />
                          <span aria-hidden="true"></span>
                        </label>
                      </td>
                      <td
                        v-if="
                          isDailyReportLaborGroupInInlineEdit(group) ||
                          rowIndex === 0
                        "
                        class="daily-report-resource-sheet__group-cell"
                        :rowspan="
                          isDailyReportLaborGroupInInlineEdit(group)
                            ? 1
                            : group.rows.length
                        "
                      >
                        {{ row.workType }}
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
	                          @change="
	                            trackDailyReportResourceQuantityCommit(
	                              'labor',
	                              row,
	                              'existing_row',
	                            )
	                          "
	                        />
                      </td>
                      <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                        {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                      </td>
                      <td
                        class="daily-report-resource-sheet__filler-cell"
                        aria-hidden="true"
                      ></td>
                    </template>
                  </tr>
                </template>
                <tr
                  v-if="resourceAddFormsOpen.labor"
                  class="daily-report-resource-sheet__add-input-row"
                >
                  <td class="daily-report-resource-sheet__include-cell">
                    <label class="daily-report-resource-sheet__include-toggle">
                      <input
	                        v-model="laborAddDraft.includedInDocument"
	                        type="checkbox"
	                        aria-label="추가할 인력 문서 포함"
	                        @change="
	                          handleDailyReportResourceInclusionChange(
	                            'labor',
	                            $event,
	                            'add_form',
	                          )
	                        "
	                      />
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <WorkTypeTypeaheadInput
                      :model-value="laborAddDraft.workType"
                      variant="sheet"
                      placeholder="공종"
                      aria-label="추가할 인력 공종"
                      :load-suggestions="loadWorkTypeSuggestions"
                      option-id-prefix="daily-report-labor-add-work-type"
                      @update:model-value="
                        laborAddDraft.workType = $event;
                        laborAddDraft.workTypeId = null;
                      "
                      @select="
                        laborAddDraft.workType = $event.name;
                        laborAddDraft.workTypeId = $event.id;
                      "
                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
	                      v-model="laborAddDraft.subWorkType"
	                      class="daily-report-resource-sheet__add-text-input"
	                      type="text"
		                      aria-label="추가할 인력 직종"
		                      placeholder="직종"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'labor',
	                          'sub_work_type',
	                          laborAddDraft.subWorkType,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__today-cell">
                    <input
                      v-model="laborAddDraft.todayQuantity"
                      class="daily-report-resource-sheet__today-input"
                      inputmode="decimal"
                      type="text"
                      aria-label="추가할 인력 금일 수량"
	                      placeholder="0"
	                      @input="updateDailyReportAddTodayQuantity(laborAddDraft, $event)"
	                      @change="
	                        trackDailyReportResourceQuantityCommit(
	                          'labor',
	                          laborAddDraft,
	                          'add_form',
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-actions-cell">
                    <div class="daily-report-resource-sheet__add-actions">
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button"
                        @click="cancelDailyReportResourceAdd('labor')"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                        :disabled="!canAddDailyReportResource('labor')"
                        @click="addDailyReportLaborResource"
                      >
                        추가
                      </button>
                    </div>
                  </td>
                  <td
                    class="daily-report-resource-sheet__filler-cell"
                    aria-hidden="true"
                  ></td>
                </tr>
                <tr
                  v-else
                  class="daily-report-resource-sheet__add-button-row"
                >
                  <td
                    class="daily-report-resource-sheet__add-button-cell"
                    :colspan="DAILY_REPORT_RESOURCE_COLUMNS.labor.length + 1"
                  >
                    <button
                      type="button"
                      class="daily-report-resource-sheet__add-button"
                      @click="toggleDailyReportResourceAddForm('labor')"
                    >
                      + 추가하기
                    </button>
                  </td>
                </tr>
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
          </div>

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
                <col class="daily-report-resource-sheet__filler-col" />
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
                  <th
                    class="daily-report-resource-sheet__filler-header"
                    aria-hidden="true"
                  ></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in materialRows"
                  :key="row.id"
                  :class="{
                    'daily-report-resource-sheet__row--excluded':
                      !row.includedInDocument,
                    'daily-report-resource-sheet__row--menu-open':
                      isDailyReportResourceContextRow('material', row.id),
                    'daily-report-resource-sheet__row--editing':
                      isDailyReportResourceEditingRow('material', row.id),
                  }"
                  @contextmenu="
                    openDailyReportResourceRowMenu('material', row, $event)
                  "
                >
                  <template
                    v-if="
                      isDailyReportResourceEditingRow('material', row.id) &&
                      dailyReportResourceEditState
                    "
                  >
                    <td class="daily-report-resource-sheet__include-cell">
                      <label class="daily-report-resource-sheet__include-toggle">
                        <input
                          v-model="
                            dailyReportResourceEditState.draft.includedInDocument
                          "
                          type="checkbox"
                          aria-label="수정할 자재 문서 포함"
                        />
                        <span aria-hidden="true"></span>
                      </label>
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <WorkTypeTypeaheadInput
                        :model-value="dailyReportResourceEditState.draft.workType"
                        variant="sheet"
                        placeholder="공종"
                        aria-label="수정할 자재 공종"
                        :selected-id="dailyReportResourceEditState.draft.workTypeId"
                        :load-suggestions="loadWorkTypeSuggestions"
                        :option-id-prefix="`daily-report-material-edit-work-type-${row.id}`"
                        @update:model-value="updateDailyReportResourceEditWorkType"
                        @select="selectDailyReportResourceEditWorkType"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.type"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 자재 타입"
                        placeholder="타입"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.specification"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 자재 규격"
                        placeholder="규격"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.unit"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 자재 단위"
                        placeholder="단위"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__today-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.todayQuantity"
                        class="daily-report-resource-sheet__today-input"
                        inputmode="decimal"
                        type="text"
                        aria-label="수정할 자재 금일 수량"
                        placeholder="0"
                        @input="updateDailyReportResourceEditQuantity"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-actions-cell">
                      <div class="daily-report-resource-sheet__add-actions">
                        <button
                          type="button"
                          class="daily-report-resource-sheet__add-action-button"
                          @click="cancelDailyReportResourceRowEdit"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                          :disabled="
                            isDailyReportSaving ||
                            !canSaveDailyReportResourceEdit(
                              dailyReportResourceEditState,
                            )
                          "
                          @click="saveDailyReportResourceRowEdit"
                        >
                          저장
                        </button>
                      </div>
                    </td>
                    <td
                      class="daily-report-resource-sheet__filler-cell"
                      aria-hidden="true"
                    ></td>
                  </template>
                  <template v-else>
                    <td class="daily-report-resource-sheet__include-cell">
                      <label class="daily-report-resource-sheet__include-toggle">
	                        <input
	                          v-model="row.includedInDocument"
	                          type="checkbox"
	                          :aria-label="`${row.workType} ${row.type} ${row.specification} 문서 포함`"
	                          @change="
	                            handleDailyReportResourceInclusionChange(
	                              'material',
	                              $event,
	                              'existing_row',
	                            )
	                          "
	                        />
                        <span aria-hidden="true"></span>
                      </label>
                    </td>
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
	                      @change="
	                        trackDailyReportResourceQuantityCommit(
	                          'material',
	                          row,
	                          'existing_row',
	                        )
	                      "
	                    />
                    </td>
                    <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                      {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                    </td>
                    <td
                      class="daily-report-resource-sheet__filler-cell"
                      aria-hidden="true"
                    ></td>
                  </template>
                </tr>
                <tr
                  v-if="resourceAddFormsOpen.material"
                  class="daily-report-resource-sheet__add-input-row"
                >
                  <td class="daily-report-resource-sheet__include-cell">
                    <label class="daily-report-resource-sheet__include-toggle">
                      <input
	                        v-model="materialAddDraft.includedInDocument"
	                        type="checkbox"
	                        aria-label="추가할 자재 문서 포함"
	                        @change="
	                          handleDailyReportResourceInclusionChange(
	                            'material',
	                            $event,
	                            'add_form',
	                          )
	                        "
	                      />
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <WorkTypeTypeaheadInput
                      :model-value="materialAddDraft.workType"
                      variant="sheet"
                      placeholder="공종"
                      aria-label="추가할 자재 공종"
                      :load-suggestions="loadWorkTypeSuggestions"
                      option-id-prefix="daily-report-material-add-work-type"
                      @update:model-value="
                        materialAddDraft.workType = $event;
                        materialAddDraft.workTypeId = null;
                      "
                      @select="
                        materialAddDraft.workType = $event.name;
                        materialAddDraft.workTypeId = $event.id;
                      "
                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="materialAddDraft.type"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 자재 타입"
	                      placeholder="타입"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'material',
	                          'material_type',
	                          materialAddDraft.type,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="materialAddDraft.specification"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 자재 규격"
	                      placeholder="규격"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'material',
	                          'material_spec',
	                          materialAddDraft.specification,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="materialAddDraft.unit"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 자재 단위"
	                      placeholder="단위"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'material',
	                          'unit',
	                          materialAddDraft.unit,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__today-cell">
                    <input
                      v-model="materialAddDraft.todayQuantity"
                      class="daily-report-resource-sheet__today-input"
                      inputmode="decimal"
                      type="text"
                      aria-label="추가할 자재 금일 수량"
                      placeholder="0"
	                      @input="
	                        updateDailyReportAddTodayQuantity(materialAddDraft, $event)
	                      "
	                      @change="
	                        trackDailyReportResourceQuantityCommit(
	                          'material',
	                          materialAddDraft,
	                          'add_form',
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-actions-cell">
                    <div class="daily-report-resource-sheet__add-actions">
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button"
                        @click="cancelDailyReportResourceAdd('material')"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                        :disabled="!canAddDailyReportResource('material')"
                        @click="addDailyReportMaterialResource"
                      >
                        추가
                      </button>
                    </div>
                  </td>
                  <td
                    class="daily-report-resource-sheet__filler-cell"
                    aria-hidden="true"
                  ></td>
                </tr>
                <tr
                  v-else
                  class="daily-report-resource-sheet__add-button-row"
                >
                  <td
                    class="daily-report-resource-sheet__add-button-cell"
                    :colspan="DAILY_REPORT_RESOURCE_COLUMNS.material.length + 1"
                  >
                    <button
                      type="button"
                      class="daily-report-resource-sheet__add-button"
                      @click="toggleDailyReportResourceAddForm('material')"
                    >
                      + 추가하기
                    </button>
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
          </div>

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
                <col class="daily-report-resource-sheet__filler-col" />
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
                  <th
                    class="daily-report-resource-sheet__filler-header"
                    aria-hidden="true"
                  ></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in equipmentRows"
                  :key="row.id"
                  :class="{
                    'daily-report-resource-sheet__row--excluded':
                      !row.includedInDocument,
                    'daily-report-resource-sheet__row--menu-open':
                      isDailyReportResourceContextRow('equipment', row.id),
                    'daily-report-resource-sheet__row--editing':
                      isDailyReportResourceEditingRow('equipment', row.id),
                  }"
                  @contextmenu="
                    openDailyReportResourceRowMenu('equipment', row, $event)
                  "
                >
                  <template
                    v-if="
                      isDailyReportResourceEditingRow('equipment', row.id) &&
                      dailyReportResourceEditState
                    "
                  >
                    <td class="daily-report-resource-sheet__include-cell">
                      <label class="daily-report-resource-sheet__include-toggle">
                        <input
                          v-model="
                            dailyReportResourceEditState.draft.includedInDocument
                          "
                          type="checkbox"
                          aria-label="수정할 장비 문서 포함"
                        />
                        <span aria-hidden="true"></span>
                      </label>
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <WorkTypeTypeaheadInput
                        :model-value="dailyReportResourceEditState.draft.workType"
                        variant="sheet"
                        placeholder="공종"
                        aria-label="수정할 장비 공종"
                        :selected-id="dailyReportResourceEditState.draft.workTypeId"
                        :load-suggestions="loadWorkTypeSuggestions"
                        :option-id-prefix="`daily-report-equipment-edit-work-type-${row.id}`"
                        @update:model-value="updateDailyReportResourceEditWorkType"
                        @select="selectDailyReportResourceEditWorkType"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.type"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 장비 타입"
                        placeholder="타입"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.specification"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 장비 규격"
                        placeholder="규격"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-input-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.unit"
                        class="daily-report-resource-sheet__add-text-input"
                        type="text"
                        aria-label="수정할 장비 단위"
                        placeholder="단위"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__today-cell">
                      <input
                        v-model="dailyReportResourceEditState.draft.todayQuantity"
                        class="daily-report-resource-sheet__today-input"
                        inputmode="decimal"
                        type="text"
                        aria-label="수정할 장비 금일 수량"
                        placeholder="0"
                        @input="updateDailyReportResourceEditQuantity"
                      />
                    </td>
                    <td class="daily-report-resource-sheet__add-actions-cell">
                      <div class="daily-report-resource-sheet__add-actions">
                        <button
                          type="button"
                          class="daily-report-resource-sheet__add-action-button"
                          @click="cancelDailyReportResourceRowEdit"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                          :disabled="
                            isDailyReportSaving ||
                            !canSaveDailyReportResourceEdit(
                              dailyReportResourceEditState,
                            )
                          "
                          @click="saveDailyReportResourceRowEdit"
                        >
                          저장
                        </button>
                      </div>
                    </td>
                    <td
                      class="daily-report-resource-sheet__filler-cell"
                      aria-hidden="true"
                    ></td>
                  </template>
                  <template v-else>
                    <td class="daily-report-resource-sheet__include-cell">
                      <label class="daily-report-resource-sheet__include-toggle">
	                        <input
	                          v-model="row.includedInDocument"
	                          type="checkbox"
	                          :aria-label="`${row.process} ${row.type} ${row.specification} 문서 포함`"
	                          @change="
	                            handleDailyReportResourceInclusionChange(
	                              'equipment',
	                              $event,
	                              'existing_row',
	                            )
	                          "
	                        />
                        <span aria-hidden="true"></span>
                      </label>
                    </td>
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
	                      @change="
	                        trackDailyReportResourceQuantityCommit(
	                          'equipment',
	                          row,
	                          'existing_row',
	                        )
	                      "
	                    />
                    </td>
                    <td class="daily-report-resource-sheet__number daily-report-resource-sheet__number--total">
                      {{ formatDailyReportQuantity(getDailyReportCumulativeQuantity(row)) }}
                    </td>
                    <td
                      class="daily-report-resource-sheet__filler-cell"
                      aria-hidden="true"
                    ></td>
                  </template>
                </tr>
                <tr
                  v-if="resourceAddFormsOpen.equipment"
                  class="daily-report-resource-sheet__add-input-row"
                >
                  <td class="daily-report-resource-sheet__include-cell">
                    <label class="daily-report-resource-sheet__include-toggle">
                      <input
	                        v-model="equipmentAddDraft.includedInDocument"
	                        type="checkbox"
	                        aria-label="추가할 장비 문서 포함"
	                        @change="
	                          handleDailyReportResourceInclusionChange(
	                            'equipment',
	                            $event,
	                            'add_form',
	                          )
	                        "
	                      />
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <WorkTypeTypeaheadInput
                      :model-value="equipmentAddDraft.process"
                      variant="sheet"
                      placeholder="공종"
                      aria-label="추가할 장비 공종"
                      :load-suggestions="loadWorkTypeSuggestions"
                      option-id-prefix="daily-report-equipment-add-work-type"
                      @update:model-value="
                        equipmentAddDraft.process = $event;
                        equipmentAddDraft.workTypeId = null;
                      "
                      @select="
                        equipmentAddDraft.process = $event.name;
                        equipmentAddDraft.workTypeId = $event.id;
                      "
                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="equipmentAddDraft.type"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 장비 타입"
	                      placeholder="타입"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'equipment',
	                          'equipment_type',
	                          equipmentAddDraft.type,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="equipmentAddDraft.specification"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 장비 규격"
	                      placeholder="규격"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'equipment',
	                          'equipment_spec',
	                          equipmentAddDraft.specification,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-input-cell">
                    <input
                      v-model="equipmentAddDraft.unit"
                      class="daily-report-resource-sheet__add-text-input"
                      type="text"
	                      aria-label="추가할 장비 단위"
	                      placeholder="단위"
	                      @blur="
	                        trackDailyReportResourceFieldCommit(
	                          'equipment',
	                          'unit',
	                          equipmentAddDraft.unit,
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__today-cell">
                    <input
                      v-model="equipmentAddDraft.todayQuantity"
                      class="daily-report-resource-sheet__today-input"
                      inputmode="decimal"
                      type="text"
                      aria-label="추가할 장비 금일 수량"
                      placeholder="0"
	                      @input="
	                        updateDailyReportAddTodayQuantity(equipmentAddDraft, $event)
	                      "
	                      @change="
	                        trackDailyReportResourceQuantityCommit(
	                          'equipment',
	                          equipmentAddDraft,
	                          'add_form',
	                        )
	                      "
	                    />
                  </td>
                  <td class="daily-report-resource-sheet__add-actions-cell">
                    <div class="daily-report-resource-sheet__add-actions">
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button"
                        @click="cancelDailyReportResourceAdd('equipment')"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        class="daily-report-resource-sheet__add-action-button daily-report-resource-sheet__add-action-button--primary"
                        :disabled="!canAddDailyReportResource('equipment')"
                        @click="addDailyReportEquipmentResource"
                      >
                        추가
                      </button>
                    </div>
                  </td>
                  <td
                    class="daily-report-resource-sheet__filler-cell"
                    aria-hidden="true"
                  ></td>
                </tr>
                <tr
                  v-else
                  class="daily-report-resource-sheet__add-button-row"
                >
                  <td
                    class="daily-report-resource-sheet__add-button-cell"
                    :colspan="DAILY_REPORT_RESOURCE_COLUMNS.equipment.length + 1"
                  >
                    <button
                      type="button"
                      class="daily-report-resource-sheet__add-button"
                      @click="toggleDailyReportResourceAddForm('equipment')"
                    >
                      + 추가하기
                    </button>
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
        :disabled="isDailyReportSaving"
        @click="handleDailyReportSave"
      >
        {{ isDailyReportSaving ? "저장 중" : "생성하기" }}
      </button>
      <p
        v-if="dailyReportSaveMessage"
        class="daily-report-write-save-message"
        role="status"
      >
        {{ dailyReportSaveMessage }}
      </p>
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

  <Transition name="daily-report-resource-floating">
    <div
      v-if="dailyReportResourceContextMenu"
      class="daily-report-resource-context-menu"
      role="menu"
      :style="
        getDailyReportResourceFloatingPositionStyle(dailyReportResourceContextMenu)
      "
      @click.stop
      @mousedown.stop
      @contextmenu.prevent
    >
      <button
        type="button"
        role="menuitem"
        class="daily-report-resource-context-menu__item"
        @click="startDailyReportResourceContextRowEdit"
      >
        수정
      </button>
      <button
        type="button"
        role="menuitem"
        class="daily-report-resource-context-menu__item daily-report-resource-context-menu__item--danger"
        :disabled="isDailyReportSaving"
        @click="deleteDailyReportResourceContextRow"
      >
        삭제
      </button>
    </div>
  </Transition>

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

.daily-report-editor-panel :deep(input)::placeholder,
.daily-report-editor-panel :deep(textarea)::placeholder {
  font-style: italic;
}

.daily-report-resource-floating-enter-active,
.daily-report-resource-floating-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.daily-report-resource-floating-enter-from,
.daily-report-resource-floating-leave-to {
  opacity: 0;
  transform: translateY(-0.18rem);
}

.daily-report-resource-context-menu {
  position: fixed;
  z-index: 120;
  box-sizing: border-box;
  border: 1px solid rgba(20, 24, 33, 0.12);
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16);
}

.daily-report-resource-context-menu {
  display: grid;
  width: 9.25rem;
  gap: 0.16rem;
  padding: 0.28rem;
  border-radius: 0.5rem;
}

.daily-report-resource-context-menu__item {
  display: flex;
  min-width: 0;
  height: 2rem;
  align-items: center;
  padding: 0 0.62rem;
  border: 0;
  border-radius: 0.36rem;
  background: transparent;
  color: #334155;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  text-align: left;
}

.daily-report-resource-context-menu__item:not(:disabled):hover,
.daily-report-resource-context-menu__item:not(:disabled):focus-visible {
  background: #f1f5f9;
  color: #111827;
}

.daily-report-resource-context-menu__item--danger {
  color: #b42318;
}

.daily-report-resource-context-menu__item--danger:not(:disabled):hover,
.daily-report-resource-context-menu__item--danger:not(:disabled):focus-visible {
  background: #fef2f2;
  color: #991b1b;
}

.daily-report-resource-context-menu__item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.daily-report-resource-context-menu__item:focus-visible {
  outline: 2px solid rgba(100, 116, 139, 0.22);
  outline-offset: 1px;
}
</style>

<style scoped src="../styles/DailyReportWritePage.css"></style>
