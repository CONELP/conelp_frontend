import { computed, ref } from "vue";

import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import { createDesktopScheduleSnapshotFromApiData } from "@/features/desktop-schedule/api/desktop-schedule.mapper";
import type {
  DesktopScheduleApiLoadState,
  DesktopScheduleBootstrapData,
  DesktopScheduleMilestoneResponse,
  DesktopScheduleMutationResponse,
  DesktopScheduleReferenceHierarchyItem,
  DesktopScheduleWorkDepResponse,
  DesktopScheduleWorkResponse,
  DesktopScheduleWorkUpdateItem,
  DesktopScheduleWorkUpdateRequest,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
  DesktopScheduleItem,
  DesktopScheduleMilestone,
  DesktopScheduleRow,
  DesktopScheduleSnapshot,
  DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
  DESKTOP_SCHEDULE_MILESTONE_ROW_ID,
  DESKTOP_SCHEDULE_SHELL_DEFAULTS,
  DESKTOP_SCHEDULE_TIMELINE_DEFAULTS,
  DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS,
  desktopScheduleService,
} from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
  createClosedDesktopScheduleContextMenuState,
  createEmptyDesktopScheduleSelectionState,
  type DesktopScheduleContextMenuCommand,
  type DesktopScheduleContextMenuItem,
  type DesktopScheduleContextMenuTarget,
} from "@/features/desktop-schedule/state/desktop-schedule-interaction-state";

type ItemMoveSession = {
  type: "move";
  anchor: "item" | "summary";
  itemIds: string[];
  rowIds: string[];
  baseItems: DesktopScheduleItem[];
  baseRows: DesktopScheduleRow[];
  baseWorkConnections: DesktopScheduleWorkConnection[];
  baseLaneByItemId: Record<string, number>;
  maxLaneIndexByRowId: Record<string, number>;
  pinnedLaneByItemId: Record<string, number>;
  blockedAlertShown: boolean;
};

type MilestoneMoveSession = {
  type: "move";
  anchor: "milestone";
  milestoneIds: string[];
  baseMilestones: DesktopScheduleMilestone[];
};

type MoveSession = ItemMoveSession | MilestoneMoveSession;

type ResizeSession = {
  type: "resize";
  target: "item";
  itemId: string;
  edge: "left" | "right";
  baseItems: DesktopScheduleItem[];
  baseWorkConnections: DesktopScheduleWorkConnection[];
  blockedAlertShown: boolean;
};

type SummaryResizeSession = {
  type: "resize";
  target: "summary";
  rowId: string;
  edge: "left" | "right";
  baseRows: DesktopScheduleRow[];
};

type ConnectionCreationState = {
  kind: "work-connection";
  sourceItemId: string;
};

type ColorPaletteTarget = Extract<DesktopScheduleContextMenuTarget, { kind: "row" | "item" }>;

type ColorPaletteState = {
  open: boolean;
  x: number;
  y: number;
  target: ColorPaletteTarget | null;
  selectedColor: string | null;
};

type TimelineCalendarState = {
  startDate: string | null;
  endDate: string | null;
  dates: Record<string, { isHoliday: boolean; isActivated: boolean }>;
};

type ScheduleToastState = {
  visible: boolean;
  message: string;
  tone: "error";
};

type ScheduleMutationOptions = {
  reloadOnSuccess?: boolean;
  reloadOnError?: boolean;
  rollback?: () => void;
};

type DesktopScheduleLocalSnapshot = {
  rows: DesktopScheduleRow[];
  items: DesktopScheduleItem[];
  workConnections: DesktopScheduleWorkConnection[];
  milestones: DesktopScheduleMilestone[];
  loadedData: DesktopScheduleBootstrapData | null;
  selection: ReturnType<typeof createEmptyDesktopScheduleSelectionState>;
};

type DesktopScheduleHistoryEntityChange<TEntity, TKey extends string | number> = {
  key: TKey;
  before: TEntity | null;
  after: TEntity | null;
};

type DesktopScheduleHistoryCollectionPatch<TEntity, TKey extends string | number> = {
  changes: Array<DesktopScheduleHistoryEntityChange<TEntity, TKey>>;
  beforeOrder: TKey[];
  afterOrder: TKey[];
};

type DesktopScheduleLoadedDataHistoryPatch = {
  workHierarchy: DesktopScheduleHistoryCollectionPatch<
    DesktopScheduleReferenceHierarchyItem,
    number
  >;
  works: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkResponse, number>;
  workDeps: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkDepResponse, number>;
  milestones: DesktopScheduleHistoryCollectionPatch<DesktopScheduleMilestoneResponse, number>;
};

type DesktopScheduleLocalHistoryEntry = {
  rows: DesktopScheduleHistoryCollectionPatch<DesktopScheduleRow, string>;
  items: DesktopScheduleHistoryCollectionPatch<DesktopScheduleItem, string>;
  workConnections: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkConnection, string>;
  milestones: DesktopScheduleHistoryCollectionPatch<DesktopScheduleMilestone, string>;
  loadedData: DesktopScheduleLoadedDataHistoryPatch | null;
};

const DEFAULT_DIVISION_NAME = "분류 (건축공사)";
const DEFAULT_WORK_TYPE_NAME = "상위 공사명 (철콘공사)";
const DEFAULT_SUB_WORK_TYPE_NAME = "하위 공사명 (타설)";
const DEFAULT_ROW_PANEL_WIDTH = 220;
const DEFAULT_WORK_TYPE_COLUMN_WIDTH = 110;
const ROW_PANEL_MIN_WIDTH = 180;
const ROW_PANEL_MAX_WIDTH = 520;
const WORK_TYPE_COLUMN_MIN_WIDTH = 72;
const WORK_TYPE_COLUMN_MAX_WIDTH = 240;
const LOCAL_HISTORY_MAX_ENTRIES = 200;
let optimisticReferenceIdSeed = -1;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createHiddenScheduleToast(): ScheduleToastState {
  return {
    visible: false,
    message: "",
    tone: "error",
  };
}

function createOptimisticReferenceId() {
  const nextId = optimisticReferenceIdSeed;
  optimisticReferenceIdSeed -= 1;
  return nextId;
}

function createClosedColorPaletteState(): ColorPaletteState {
  return {
    open: false,
    x: 0,
    y: 0,
    target: null,
    selectedColor: null,
  };
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function promptForName(label: string, currentName: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextName = window.prompt(label, currentName);

  if (nextName === null) {
    return null;
  }

  const trimmedName = nextName.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

function shouldSwapConnectionDirection(
  sourceItem: DesktopScheduleItem,
  targetItem: DesktopScheduleItem,
) {
  if (sourceItem.startDate !== targetItem.startDate) {
    return sourceItem.startDate > targetItem.startDate;
  }

  if (sourceItem.endDate !== targetItem.endDate) {
    return sourceItem.endDate > targetItem.endDate;
  }

  return false;
}

function isSameConnectionItemPair(
  workConnection: DesktopScheduleWorkConnection,
  sourceItemId: string,
  targetItemId: string,
) {
  return (
    (workConnection.sourceItemId === sourceItemId &&
      workConnection.targetItemId === targetItemId) ||
    (workConnection.sourceItemId === targetItemId &&
      workConnection.targetItemId === sourceItemId)
  );
}

function createEmptyScheduleSnapshot() {
  return desktopScheduleService.buildSnapshot(
    {
      source: "work-api",
      tasks: [],
    },
    [],
  );
}

function createIdleScheduleLoadState(): DesktopScheduleApiLoadState<DesktopScheduleBootstrapData> {
  return {
    status: "idle",
    data: null,
    error: null,
  };
}

function createEmptyTimelineCalendarState(): TimelineCalendarState {
  return {
    startDate: null,
    endDate: null,
    dates: {},
  };
}

function createTimelineCalendarState(data: DesktopScheduleBootstrapData): TimelineCalendarState {
  return {
    startDate: data.calendar.projectStartDate,
    endDate: data.calendar.projectEndDate,
    dates: Object.fromEntries(
      data.calendar.dates.map((date) => [
        date.date,
        {
          isHoliday: date.isHoliday,
          isActivated: date.isActivated,
        },
      ]),
    ),
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error("공정표 데이터를 불러오지 못했습니다.");
}

function isNetworkMutationError(error: Error) {
  return /failed to fetch|networkerror|load failed/i.test(error.message);
}

function getHttpStatusFromErrorMessage(message: string) {
  const statusMatch = message.match(/\((\d{3})\)/);
  return statusMatch ? Number(statusMatch[1]) : null;
}

function getMutationErrorToastMessage(error: Error, fallbackMessage: string) {
  if (isNetworkMutationError(error)) {
    return "네트워크 오류로 저장하지 못했어요. 연결을 확인해 주세요. 변경사항을 되돌렸습니다.";
  }

  const status = getHttpStatusFromErrorMessage(error.message);

  if (status !== null && status >= 500) {
    return `서버 오류(${status})로 저장하지 못했어요. 잠시 후 다시 시도해 주세요. 변경사항을 되돌렸습니다.`;
  }

  if (status !== null && status >= 400) {
    return `요청 오류(${status})로 저장하지 못했어요. 입력값을 확인해 주세요. 변경사항을 되돌렸습니다.`;
  }

  if (/로그인|인증|token|unauthorized/i.test(error.message)) {
    return "인증 오류로 저장하지 못했어요. 다시 로그인해 주세요. 변경사항을 되돌렸습니다.";
  }

  if (error.message) {
    return `${error.message} 변경사항을 되돌렸습니다.`;
  }

  return fallbackMessage;
}

function createUniqueReferenceName(baseName: string, existingNames: string[]) {
  const existingNameSet = new Set(existingNames);

  if (!existingNameSet.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let nextName = `${baseName} ${suffix}`;

  while (existingNameSet.has(nextName)) {
    suffix += 1;
    nextName = `${baseName} ${suffix}`;
  }

  return nextName;
}

function cloneWorkHierarchyItem(
  item: DesktopScheduleReferenceHierarchyItem,
): DesktopScheduleReferenceHierarchyItem {
  return { ...item };
}

function cloneWorkResponse(work: DesktopScheduleWorkResponse): DesktopScheduleWorkResponse {
  return {
    ...work,
    zoneIds: [...(work.zoneIds ?? [])],
    zoneNames: [...(work.zoneNames ?? [])],
    floorIds: [...(work.floorIds ?? [])],
    floorNames: [...(work.floorNames ?? [])],
    componentTypes: (work.componentTypes ?? []).map((componentTypeGroup) => ({
      ...componentTypeGroup,
      componentTypeIds: [...(componentTypeGroup.componentTypeIds ?? [])],
    })),
    photos: work.photos?.map((photo) => ({ ...photo })),
  };
}

function cloneWorkDepResponse(workDep: DesktopScheduleWorkDepResponse): DesktopScheduleWorkDepResponse {
  return { ...workDep };
}

function cloneMilestoneResponse(
  milestone: DesktopScheduleMilestoneResponse,
): DesktopScheduleMilestoneResponse {
  return { ...milestone };
}

function cloneScheduleData(data: DesktopScheduleBootstrapData): DesktopScheduleBootstrapData {
  return {
    ...data,
    projects: data.projects.map((project) => ({ ...project })),
    selectedProject: { ...data.selectedProject },
    scheduleVersions: data.scheduleVersions.map((version) => ({ ...version })),
    selectedScheduleVersion: { ...data.selectedScheduleVersion },
    calendar: {
      ...data.calendar,
      dates: data.calendar.dates.map((date) => ({ ...date })),
    },
    workHierarchy: data.workHierarchy.map(cloneWorkHierarchyItem),
    works: data.works.map(cloneWorkResponse),
    workDeps: data.workDeps.map(cloneWorkDepResponse),
    milestones: (data.milestones ?? []).map(cloneMilestoneResponse),
  };
}

function cloneRow(row: DesktopScheduleRow): DesktopScheduleRow {
  return {
    ...row,
    source: { ...row.source },
  };
}

function cloneRows(rows: DesktopScheduleRow[]) {
  return rows.map(cloneRow);
}

function cloneItem(item: DesktopScheduleItem): DesktopScheduleItem {
  return {
    ...item,
    zoneIds: [...(item.zoneIds ?? [])],
    floorIds: [...(item.floorIds ?? [])],
    componentTypeIds: [...(item.componentTypeIds ?? [])],
  };
}

function cloneItems(items: DesktopScheduleItem[]) {
  return items.map(cloneItem);
}

function cloneWorkConnection(workConnection: DesktopScheduleWorkConnection): DesktopScheduleWorkConnection {
  return { ...workConnection };
}

function cloneWorkConnections(workConnections: DesktopScheduleWorkConnection[]) {
  return workConnections.map(cloneWorkConnection);
}

function cloneMilestone(milestone: DesktopScheduleMilestone): DesktopScheduleMilestone {
  return { ...milestone };
}

function cloneMilestones(milestones: DesktopScheduleMilestone[]) {
  return milestones.map(cloneMilestone);
}

function createMilestoneModelFromApi(
  milestone: DesktopScheduleMilestoneResponse,
): DesktopScheduleMilestone {
  return {
    id: `milestone:${milestone.id}`,
    apiId: milestone.id,
    date: milestone.date,
    label: milestone.name,
    rowId: null,
  };
}

function getMilestoneApiId(milestone: DesktopScheduleMilestone | null | undefined) {
  if (!milestone) {
    return null;
  }

  if (typeof milestone.apiId === "number") {
    return milestone.apiId;
  }

  const idMatch = milestone.id.match(/^milestone:(\d+)$/);
  const apiId = idMatch ? Number(idMatch[1]) : Number.NaN;

  return Number.isFinite(apiId) ? apiId : null;
}

function cloneSelectionState(selection: ReturnType<typeof createEmptyDesktopScheduleSelectionState>) {
  return {
    rowIds: [...selection.rowIds],
    itemIds: [...selection.itemIds],
    workConnectionIds: [...selection.workConnectionIds],
    criticalPathIds: [...selection.criticalPathIds],
    groupIds: [...selection.groupIds],
    milestoneIds: [...selection.milestoneIds],
  };
}

function hasDateOrLayoutChange(baseItem: DesktopScheduleItem, nextItem: DesktopScheduleItem) {
  return (
    baseItem.startDate !== nextItem.startDate ||
    baseItem.durationDays !== nextItem.durationDays ||
    baseItem.positionY !== nextItem.positionY
  );
}

function hasWorkConnectionGapChange(
  baseWorkConnection: DesktopScheduleWorkConnection,
  nextWorkConnection: DesktopScheduleWorkConnection,
) {
  return baseWorkConnection.gapDays !== nextWorkConnection.gapDays;
}

function createDesktopScheduleViewModel() {
  const initialSnapshot = createEmptyScheduleSnapshot();
  const scheduleMetadata = ref(initialSnapshot.metadata);
  const scheduleLoadState =
    ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>(createIdleScheduleLoadState());
  const timelineCalendarState = ref<TimelineCalendarState>(createEmptyTimelineCalendarState());
  const workingRows = ref<DesktopScheduleRow[]>(initialSnapshot.rows.map((row) => ({ ...row })));
  const workingItems = ref<DesktopScheduleItem[]>(initialSnapshot.items.map((item) => ({ ...item })));
  const workingWorkConnections = ref<DesktopScheduleWorkConnection[]>(
    initialSnapshot.workConnections.map((workConnection) => ({ ...workConnection })),
  );
  const workingMilestones = ref<DesktopScheduleMilestone[]>(
    initialSnapshot.milestones.map((milestone) => ({ ...milestone })),
  );
  const selectionState = ref(createEmptyDesktopScheduleSelectionState());
  const contextMenuState = ref(createClosedDesktopScheduleContextMenuState());
  const colorPaletteState = ref(createClosedColorPaletteState());
  const dayWidth = ref<number>(DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth);
  const rowPanelWidth = ref(DEFAULT_ROW_PANEL_WIDTH);
  const workTypeColumnWidth = ref(DEFAULT_WORK_TYPE_COLUMN_WIDTH);
  const chartScrollTop = ref(0);
  const chartScrollLeft = ref(0);
  const localHistoryUndoStack = ref<DesktopScheduleLocalHistoryEntry[]>([]);
  const localHistoryRedoStack = ref<DesktopScheduleLocalHistoryEntry[]>([]);
  const lanePreferenceByItemId = ref<Record<string, number>>({});
  const interactionSession = ref<MoveSession | ResizeSession | SummaryResizeSession | null>(null);
  const interactionCancelVersion = ref(0);
  const connectionCreationState = ref<ConnectionCreationState | null>(null);
  const renamingDivisionId = ref<number | null>(null);
  const renamingWorkTypeId = ref<number | null>(null);
  const renamingSubWorkTypeId = ref<number | null>(null);
  const renamingItemId = ref<string | null>(null);
  const renamingMilestoneId = ref<string | null>(null);
  const scheduleToast = ref<ScheduleToastState>(createHiddenScheduleToast());
  let scheduleToastTimer: number | null = null;

  const rowById = computed(() => new Map(workingRows.value.map((row) => [row.id, row])));
  const currentZoomIndex = computed(() => {
    const exactIndex = DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.findIndex(
      (level) => level === dayWidth.value,
    );

    if (exactIndex >= 0) {
      return exactIndex;
    }

    return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.reduce((closestIndex, level, index, levels) => {
      return Math.abs(level - dayWidth.value) < Math.abs(levels[closestIndex]! - dayWidth.value)
        ? index
        : closestIndex;
    }, 0);
  });
  const canZoomOut = computed(() => currentZoomIndex.value > 0);
  const canZoomIn = computed(
    () => currentZoomIndex.value < DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1,
  );
  const maxZoomIndex = computed(() => DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1);
  const zoomScale = computed(() => {
    const rawScale = Math.sqrt(dayWidth.value / DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth);
    return Math.min(Math.max(rawScale, 0.68), 1.46);
  });
  const rowHeight = computed(() =>
    Math.round(DESKTOP_SCHEDULE_SHELL_DEFAULTS.rowHeight * zoomScale.value),
  );
  const barHeight = computed(() =>
    Math.round(DESKTOP_SCHEDULE_SHELL_DEFAULTS.barHeight * zoomScale.value),
  );
  const timeline = computed(() =>
    desktopScheduleService.buildTimeline(workingItems.value, {
      dayWidth: dayWidth.value,
      startDate: timelineCalendarState.value.startDate ?? undefined,
      endDate: timelineCalendarState.value.endDate ?? undefined,
      calendarDates: timelineCalendarState.value.dates,
    }),
  );
  const shellLayout = computed(() =>
    desktopScheduleService.buildShellLayout(workingRows.value, workingItems.value, timeline.value, {
      rowHeight: rowHeight.value,
      barHeight: barHeight.value,
      preferredLaneByItemId: lanePreferenceByItemId.value,
      pinnedLaneByItemId:
        interactionSession.value?.type === "move" &&
        interactionSession.value.anchor !== "milestone" &&
        interactionSession.value.itemIds.length > 0
          ? interactionSession.value.pinnedLaneByItemId
          : undefined,
      workConnections: workingWorkConnections.value,
      milestones: workingMilestones.value,
    }),
  );

  const scheduleMeta = computed(() => ({
    windowLabel: `${formatShortDate(timeline.value.startDate)} - ${formatShortDate(
      timeline.value.endDate,
    )}`,
    generatedLabel: formatDateTime(scheduleMetadata.value.generatedAt),
    sourceLabel: "실데이터",
    projectLabel: scheduleLoadState.value.data?.selectedProject.projectName ?? "",
    versionLabel: scheduleLoadState.value.data?.selectedScheduleVersion.versionName ?? "",
  }));
  const scheduleLoadStatus = computed(() => scheduleLoadState.value.status);
  const scheduleLoadErrorMessage = computed(
    () => scheduleLoadState.value.error?.message ?? "공정표 데이터를 불러오지 못했습니다.",
  );
  const canUndoLocalHistory = computed(() => localHistoryUndoStack.value.length > 0);
  const canRedoLocalHistory = computed(() => localHistoryRedoStack.value.length > 0);

  function closeContextMenu() {
    contextMenuState.value = createClosedDesktopScheduleContextMenuState();
  }

  function closeColorPalette() {
    colorPaletteState.value = createClosedColorPaletteState();
  }

  function showScheduleToast(message: string) {
    scheduleToast.value = {
      visible: true,
      message,
      tone: "error",
    };

    if (typeof window === "undefined") {
      return;
    }

    if (scheduleToastTimer !== null) {
      window.clearTimeout(scheduleToastTimer);
    }

    scheduleToastTimer = window.setTimeout(() => {
      scheduleToast.value = {
        ...scheduleToast.value,
        visible: false,
      };
      scheduleToastTimer = null;
    }, 2800);
  }

  function syncChartScroll(position: { left: number; top: number }) {
    chartScrollLeft.value = position.left;
    chartScrollTop.value = position.top;
    closeContextMenu();
    closeColorPalette();
  }

  function setRowPanelWidth(nextWidth: number) {
    rowPanelWidth.value = clampNumber(
      Math.round(nextWidth),
      ROW_PANEL_MIN_WIDTH,
      ROW_PANEL_MAX_WIDTH,
    );
    closeContextMenu();
    closeColorPalette();
  }

  function setWorkTypeColumnWidth(nextWidth: number) {
    workTypeColumnWidth.value = clampNumber(
      Math.round(nextWidth),
      WORK_TYPE_COLUMN_MIN_WIDTH,
      WORK_TYPE_COLUMN_MAX_WIDTH,
    );
    closeContextMenu();
    closeColorPalette();
  }

  function clearSelection() {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    connectionCreationState.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
    closeColorPalette();
  }

  function applyScheduleSnapshot(nextSnapshot: DesktopScheduleSnapshot) {
    scheduleMetadata.value = nextSnapshot.metadata;
    workingRows.value = cloneRows(nextSnapshot.rows);
    workingItems.value = cloneItems(nextSnapshot.items);
    workingWorkConnections.value = cloneWorkConnections(nextSnapshot.workConnections);
    workingMilestones.value = cloneMilestones(nextSnapshot.milestones);
    lanePreferenceByItemId.value = {};
    interactionSession.value = null;
    connectionCreationState.value = null;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    closeContextMenu();
    closeColorPalette();
  }

  function captureWorkingSnapshot(): DesktopScheduleLocalSnapshot {
    return {
      rows: cloneRows(workingRows.value),
      items: cloneItems(workingItems.value),
      workConnections: cloneWorkConnections(workingWorkConnections.value),
      milestones: cloneMilestones(workingMilestones.value),
      loadedData: scheduleLoadState.value.data
        ? cloneScheduleData(scheduleLoadState.value.data)
        : null,
      selection: cloneSelectionState(selectionState.value),
    };
  }

  function restoreWorkingSnapshot(snapshot: DesktopScheduleLocalSnapshot) {
    workingRows.value = cloneRows(snapshot.rows);
    workingItems.value = cloneItems(snapshot.items);
    workingWorkConnections.value = cloneWorkConnections(snapshot.workConnections);
    workingMilestones.value = cloneMilestones(snapshot.milestones);
    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      data: snapshot.loadedData ? cloneScheduleData(snapshot.loadedData) : null,
    };
    selectionState.value = cloneSelectionState(snapshot.selection);
    interactionSession.value = null;
    connectionCreationState.value = null;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
    closeColorPalette();
  }

  function areHistoryEntitiesEqual<TEntity>(before: TEntity | null, after: TEntity | null) {
    return JSON.stringify(before) === JSON.stringify(after);
  }

  function createHistoryCollectionPatch<TEntity, TKey extends string | number>(
    before: TEntity[],
    after: TEntity[],
    getKey: (entity: TEntity) => TKey,
    cloneEntity: (entity: TEntity) => TEntity,
  ): DesktopScheduleHistoryCollectionPatch<TEntity, TKey> {
    const beforeByKey = new Map(before.map((entity) => [getKey(entity), entity] as const));
    const afterByKey = new Map(after.map((entity) => [getKey(entity), entity] as const));
    const keys = [
      ...before.map(getKey),
      ...after.map(getKey).filter((key) => !beforeByKey.has(key)),
    ];

    return {
      beforeOrder: before.map(getKey),
      afterOrder: after.map(getKey),
      changes: keys
        .map((key) => {
          const beforeEntity = beforeByKey.get(key) ?? null;
          const afterEntity = afterByKey.get(key) ?? null;

          if (areHistoryEntitiesEqual(beforeEntity, afterEntity)) {
            return null;
          }

          return {
            key,
            before: beforeEntity ? cloneEntity(beforeEntity) : null,
            after: afterEntity ? cloneEntity(afterEntity) : null,
          };
        })
        .filter(
          (
            change,
          ): change is DesktopScheduleHistoryEntityChange<TEntity, TKey> => change !== null,
        ),
    };
  }

  function hasHistoryCollectionPatchChange<TEntity, TKey extends string | number>(
    patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
  ) {
    return (
      patch.changes.length > 0 ||
      JSON.stringify(patch.beforeOrder) !== JSON.stringify(patch.afterOrder)
    );
  }

  function createLoadedDataHistoryPatch(
    beforeData: DesktopScheduleBootstrapData | null,
    afterData: DesktopScheduleBootstrapData | null,
  ): DesktopScheduleLoadedDataHistoryPatch | null {
    if (!beforeData || !afterData) {
      return null;
    }

    const patch: DesktopScheduleLoadedDataHistoryPatch = {
      workHierarchy: createHistoryCollectionPatch(
        beforeData.workHierarchy,
        afterData.workHierarchy,
        (item) => item.subWorkTypeId,
        cloneWorkHierarchyItem,
      ),
      works: createHistoryCollectionPatch(
        beforeData.works,
        afterData.works,
        (work) => work.workId,
        cloneWorkResponse,
      ),
      workDeps: createHistoryCollectionPatch(
        beforeData.workDeps,
        afterData.workDeps,
        (workDep) => workDep.id,
        cloneWorkDepResponse,
      ),
      milestones: createHistoryCollectionPatch(
        beforeData.milestones ?? [],
        afterData.milestones ?? [],
        (milestone) => milestone.id,
        cloneMilestoneResponse,
      ),
    };

    return hasHistoryCollectionPatchChange(patch.workHierarchy) ||
      hasHistoryCollectionPatchChange(patch.works) ||
      hasHistoryCollectionPatchChange(patch.workDeps) ||
      hasHistoryCollectionPatchChange(patch.milestones)
      ? patch
      : null;
  }

  function createLocalHistoryEntry(
    previousSnapshot: DesktopScheduleLocalSnapshot,
    nextSnapshot: DesktopScheduleLocalSnapshot,
  ): DesktopScheduleLocalHistoryEntry | null {
    const entry: DesktopScheduleLocalHistoryEntry = {
      rows: createHistoryCollectionPatch(
        previousSnapshot.rows,
        nextSnapshot.rows,
        (row) => row.id,
        cloneRow,
      ),
      items: createHistoryCollectionPatch(
        previousSnapshot.items,
        nextSnapshot.items,
        (item) => item.id,
        cloneItem,
      ),
      workConnections: createHistoryCollectionPatch(
        previousSnapshot.workConnections,
        nextSnapshot.workConnections,
        (workConnection) => workConnection.id,
        cloneWorkConnection,
      ),
      milestones: createHistoryCollectionPatch(
        previousSnapshot.milestones,
        nextSnapshot.milestones,
        (milestone) => milestone.id,
        cloneMilestone,
      ),
      loadedData: createLoadedDataHistoryPatch(previousSnapshot.loadedData, nextSnapshot.loadedData),
    };
    const didChange =
      hasHistoryCollectionPatchChange(entry.rows) ||
      hasHistoryCollectionPatchChange(entry.items) ||
      hasHistoryCollectionPatchChange(entry.workConnections) ||
      hasHistoryCollectionPatchChange(entry.milestones) ||
      entry.loadedData !== null;

    return didChange ? entry : null;
  }

  function applyHistoryCollectionPatch<TEntity, TKey extends string | number>(
    current: TEntity[],
    patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
    direction: "undo" | "redo",
    getKey: (entity: TEntity) => TKey,
    cloneEntity: (entity: TEntity) => TEntity,
  ) {
    const entityByKey = new Map(current.map((entity) => [getKey(entity), cloneEntity(entity)] as const));

    patch.changes.forEach((change) => {
      const nextEntity = direction === "undo" ? change.before : change.after;

      if (!nextEntity) {
        entityByKey.delete(change.key);
        return;
      }

      entityByKey.set(change.key, cloneEntity(nextEntity));
    });

    const targetOrder = direction === "undo" ? patch.beforeOrder : patch.afterOrder;
    const orderedEntities: TEntity[] = [];
    const usedKeys = new Set<TKey>();

    targetOrder.forEach((key) => {
      const entity = entityByKey.get(key);

      if (!entity) {
        return;
      }

      orderedEntities.push(entity);
      usedKeys.add(key);
    });

    current.forEach((entity) => {
      const key = getKey(entity);
      const nextEntity = entityByKey.get(key);

      if (usedKeys.has(key) || !nextEntity) {
        return;
      }

      orderedEntities.push(nextEntity);
      usedKeys.add(key);
    });

    return orderedEntities;
  }

  function applyLoadedDataHistoryPatch(
    currentData: DesktopScheduleBootstrapData | null,
    patch: DesktopScheduleLoadedDataHistoryPatch | null,
    direction: "undo" | "redo",
  ) {
    if (!currentData || !patch) {
      return currentData;
    }

    return {
      ...currentData,
      workHierarchy: applyHistoryCollectionPatch(
        currentData.workHierarchy,
        patch.workHierarchy,
        direction,
        (item) => item.subWorkTypeId,
        cloneWorkHierarchyItem,
      ),
      works: applyHistoryCollectionPatch(
        currentData.works,
        patch.works,
        direction,
        (work) => work.workId,
        cloneWorkResponse,
      ),
      workDeps: applyHistoryCollectionPatch(
        currentData.workDeps,
        patch.workDeps,
        direction,
        (workDep) => workDep.id,
        cloneWorkDepResponse,
      ),
      milestones: applyHistoryCollectionPatch(
        currentData.milestones ?? [],
        patch.milestones,
        direction,
        (milestone) => milestone.id,
        cloneMilestoneResponse,
      ),
    };
  }

  function applyLocalHistoryEntry(
    entry: DesktopScheduleLocalHistoryEntry,
    direction: "undo" | "redo",
  ) {
    workingRows.value = applyHistoryCollectionPatch(
      workingRows.value,
      entry.rows,
      direction,
      (row) => row.id,
      cloneRow,
    );
    workingItems.value = applyHistoryCollectionPatch(
      workingItems.value,
      entry.items,
      direction,
      (item) => item.id,
      cloneItem,
    );
    workingWorkConnections.value = applyHistoryCollectionPatch(
      workingWorkConnections.value,
      entry.workConnections,
      direction,
      (workConnection) => workConnection.id,
      cloneWorkConnection,
    );
    workingMilestones.value = applyHistoryCollectionPatch(
      workingMilestones.value,
      entry.milestones,
      direction,
      (milestone) => milestone.id,
      cloneMilestone,
    );
    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      data: applyLoadedDataHistoryPatch(scheduleLoadState.value.data, entry.loadedData, direction),
    };
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    interactionSession.value = null;
    connectionCreationState.value = null;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
    closeColorPalette();
  }

  function pushLocalHistoryEntry(previousSnapshot: DesktopScheduleLocalSnapshot) {
    const entry = createLocalHistoryEntry(previousSnapshot, captureWorkingSnapshot());

    if (!entry) {
      return;
    }

    localHistoryUndoStack.value = [
      ...localHistoryUndoStack.value.slice(-(LOCAL_HISTORY_MAX_ENTRIES - 1)),
      entry,
    ];
    localHistoryRedoStack.value = [];
  }

  function clearLocalHistory() {
    localHistoryUndoStack.value = [];
    localHistoryRedoStack.value = [];
  }

  function undoLocalHistory() {
    const entry = localHistoryUndoStack.value[localHistoryUndoStack.value.length - 1];

    if (!entry || interactionSession.value) {
      return;
    }

    localHistoryUndoStack.value = localHistoryUndoStack.value.slice(0, -1);
    localHistoryRedoStack.value = [
      ...localHistoryRedoStack.value.slice(-(LOCAL_HISTORY_MAX_ENTRIES - 1)),
      entry,
    ];
    applyLocalHistoryEntry(entry, "undo");
  }

  function redoLocalHistory() {
    const entry = localHistoryRedoStack.value[localHistoryRedoStack.value.length - 1];

    if (!entry || interactionSession.value) {
      return;
    }

    localHistoryRedoStack.value = localHistoryRedoStack.value.slice(0, -1);
    localHistoryUndoStack.value = [
      ...localHistoryUndoStack.value.slice(-(LOCAL_HISTORY_MAX_ENTRIES - 1)),
      entry,
    ];
    applyLocalHistoryEntry(entry, "redo");
  }

  function updateLoadedScheduleData(
    updater: (data: DesktopScheduleBootstrapData) => DesktopScheduleBootstrapData,
  ) {
    const currentData = scheduleLoadState.value.data;

    if (!currentData) {
      return null;
    }

    const nextData = updater(currentData);
    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      status: scheduleLoadState.value.status === "error" ? "success" : scheduleLoadState.value.status,
      data: nextData,
      error: null,
    };

    return nextData;
  }

  function mergeWorksIntoData(
    data: DesktopScheduleBootstrapData,
    updatedWorks: DesktopScheduleWorkResponse[],
  ) {
    if (updatedWorks.length === 0) {
      return data;
    }

    const workById = new Map(data.works.map((work) => [work.workId, work] as const));
    updatedWorks.forEach((work) => {
      workById.set(work.workId, work);
    });

    return {
      ...data,
      works: Array.from(workById.values()),
    };
  }

  function mergeWorkDepsIntoData(
    data: DesktopScheduleBootstrapData,
    updatedWorkDeps: DesktopScheduleWorkDepResponse[],
  ) {
    if (updatedWorkDeps.length === 0) {
      return data;
    }

    const workDepById = new Map(data.workDeps.map((workDep) => [workDep.id, workDep] as const));
    updatedWorkDeps.forEach((workDep) => {
      workDepById.set(workDep.id, workDep);
    });

    return {
      ...data,
      workDeps: Array.from(workDepById.values()),
    };
  }

  function applyServerMutationPatch(
    response: DesktopScheduleMutationResponse,
    options: {
      rebuildSnapshot?: boolean;
      replacementWorkDeps?: DesktopScheduleWorkDepResponse[];
    } = {},
  ) {
    const nextData = updateLoadedScheduleData((currentData) => {
      const mergedWorksData = mergeWorksIntoData(currentData, response.updatedWorks ?? []);
      const mergedData = options.replacementWorkDeps
        ? {
            ...mergedWorksData,
            workDeps: options.replacementWorkDeps.map((workDep) => ({ ...workDep })),
          }
        : mergeWorkDepsIntoData(mergedWorksData, response.updatedWorkDeps ?? []);

      return mergedData;
    });

    if (options.rebuildSnapshot && nextData) {
      applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(nextData));
    }
  }

  function removeLoadedWorksAndWorkDeps(workIds: number[], workDepIds: number[] = []) {
    const workIdSet = new Set(workIds);
    const workDepIdSet = new Set(workDepIds);

    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.filter((work) => !workIdSet.has(work.workId)),
      workDeps: currentData.workDeps.filter(
        (workDep) =>
          !workDepIdSet.has(workDep.id) &&
          !workIdSet.has(workDep.sourceWorkId) &&
          !workIdSet.has(workDep.targetWorkId),
      ),
    }));
  }

  function removeLoadedWorkDeps(workDepIds: number[]) {
    const workDepIdSet = new Set(workDepIds);

    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workDeps: currentData.workDeps.filter((workDep) => !workDepIdSet.has(workDep.id)),
    }));
  }

  function syncLoadedDataFromWorkingItemsAndConnections(
    items: DesktopScheduleItem[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    const itemByWorkId = new Map(items.map((item) => [item.workId, item] as const));
    const workConnectionByPathId = new Map(
      workConnections.map((workConnection) => [workConnection.pathId, workConnection] as const),
    );

    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.map((work) => {
        const item = itemByWorkId.get(work.workId);

        if (!item) {
          return work;
        }

        return {
          ...work,
          startDate: item.startDate,
          completionDate: item.endDate,
          workLeadTime: item.durationDays,
          positionY: item.positionY,
        };
      }),
      workDeps: currentData.workDeps.map((workDep) => {
        const workConnection = workConnectionByPathId.get(workDep.id);

        if (!workConnection) {
          return workDep;
        }

        return {
          ...workDep,
          lagDays: workConnection.gapDays,
        };
      }),
    }));
  }

  function syncLoadedWorkName(workId: number, workName: string) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.map((work) =>
        work.workId === workId
          ? {
              ...work,
              workName,
            }
          : work,
      ),
    }));
  }

  function syncLoadedSubWorkTypeColor(subWorkTypeId: number, colorHex: string | null) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.subWorkTypeId === subWorkTypeId
          ? {
              ...item,
              subWorkTypeColor: colorHex,
            }
          : item,
      ),
    }));
  }

  function upsertLoadedMilestone(milestone: DesktopScheduleMilestoneResponse) {
    updateLoadedScheduleData((currentData) => {
      const milestoneById = new Map(
        (currentData.milestones ?? []).map((currentMilestone) => [
          currentMilestone.id,
          cloneMilestoneResponse(currentMilestone),
        ] as const),
      );
      milestoneById.set(milestone.id, cloneMilestoneResponse(milestone));

      return {
        ...currentData,
        milestones: Array.from(milestoneById.values()).sort((a, b) =>
          a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date),
        ),
      };
    });
  }

  function syncLoadedMilestoneFromModel(milestone: DesktopScheduleMilestone) {
    const apiId = getMilestoneApiId(milestone);

    if (apiId === null) {
      return;
    }

    upsertLoadedMilestone({
      id: apiId,
      date: milestone.date,
      name: milestone.label,
    });
  }

  function removeLoadedMilestones(milestoneApiIds: number[]) {
    if (milestoneApiIds.length === 0) {
      return;
    }

    const milestoneApiIdSet = new Set(milestoneApiIds);
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      milestones: (currentData.milestones ?? []).filter(
        (milestone) => !milestoneApiIdSet.has(milestone.id),
      ),
    }));
  }

  function replaceWorkingMilestoneWithApiMilestone(
    localMilestoneId: string,
    apiMilestone: DesktopScheduleMilestoneResponse,
  ) {
    const milestone = createMilestoneModelFromApi(apiMilestone);
    workingMilestones.value = workingMilestones.value.map((currentMilestone) =>
      currentMilestone.id === localMilestoneId ? milestone : currentMilestone,
    );
    selectionState.value = {
      ...selectionState.value,
      milestoneIds: selectionState.value.milestoneIds.map((milestoneId) =>
        milestoneId === localMilestoneId ? milestone.id : milestoneId,
      ),
    };
    if (renamingMilestoneId.value === localMilestoneId) {
      renamingMilestoneId.value = milestone.id;
    }
    upsertLoadedMilestone(apiMilestone);
  }

  function rebuildScheduleFromLoadedData() {
    const currentData = scheduleLoadState.value.data;

    if (!currentData) {
      return;
    }

    applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(currentData));
  }

  function insertReferenceHierarchyItem(
    items: DesktopScheduleReferenceHierarchyItem[],
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    const lastSameDivisionIndex = items.reduce(
      (lastIndex, currentItem, index) =>
        currentItem.divisionId === item.divisionId ? index : lastIndex,
      -1,
    );

    if (lastSameDivisionIndex < 0) {
      return [...items, item];
    }

    return [
      ...items.slice(0, lastSameDivisionIndex + 1),
      item,
      ...items.slice(lastSameDivisionIndex + 1),
    ];
  }

  function insertReferenceSubWorkTypeItem(
    items: DesktopScheduleReferenceHierarchyItem[],
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    const lastSameWorkTypeIndex = items.reduce(
      (lastIndex, currentItem, index) =>
        currentItem.workTypeId === item.workTypeId ? index : lastIndex,
      -1,
    );

    if (lastSameWorkTypeIndex < 0) {
      return insertReferenceHierarchyItem(items, item);
    }

    return [
      ...items.slice(0, lastSameWorkTypeIndex + 1),
      item,
      ...items.slice(lastSameWorkTypeIndex + 1),
    ];
  }

  function sortHierarchyByDivisionIds(
    items: DesktopScheduleReferenceHierarchyItem[],
    divisionIds: number[],
  ) {
    const divisionOrder = new Map(divisionIds.map((divisionId, index) => [divisionId, index]));

    return [...items].sort((a, b) => {
      const aOrder = divisionOrder.get(a.divisionId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = divisionOrder.get(b.divisionId) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }

  function sortHierarchyByWorkTypeIds(
    items: DesktopScheduleReferenceHierarchyItem[],
    divisionId: number,
    workTypeIds: number[],
  ) {
    const workTypeOrder = new Map(workTypeIds.map((workTypeId, index) => [workTypeId, index]));

    return [...items].sort((a, b) => {
      if (a.divisionId !== divisionId || b.divisionId !== divisionId) {
        return 0;
      }

      const aOrder = workTypeOrder.get(a.workTypeId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = workTypeOrder.get(b.workTypeId) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }

  function addReferenceHierarchyItem(item: DesktopScheduleReferenceHierarchyItem) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: insertReferenceHierarchyItem(currentData.workHierarchy, item),
    }));
    rebuildScheduleFromLoadedData();
  }

  function addReferenceSubWorkTypeItem(item: DesktopScheduleReferenceHierarchyItem) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: insertReferenceSubWorkTypeItem(currentData.workHierarchy, item),
    }));
    rebuildScheduleFromLoadedData();
  }

  function replaceReferenceHierarchyItem(
    tempSubWorkTypeId: number,
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((hierarchyItem) =>
        hierarchyItem.subWorkTypeId === tempSubWorkTypeId ? item : hierarchyItem,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }

  function replaceReferenceDivisionId(
    tempDivisionId: number,
    division: { id: number; name: string },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.divisionId === tempDivisionId
          ? {
              ...item,
              divisionId: division.id,
              divisionName: division.name,
            }
          : item,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }

  function replaceReferenceWorkTypeId(
    tempWorkTypeId: number,
    workType: { id: number; name: string; isStructure?: boolean | null },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.workTypeId === tempWorkTypeId
          ? {
              ...item,
              workTypeId: workType.id,
              workTypeName: workType.name,
              isStructure: workType.isStructure ?? item.isStructure,
            }
          : item,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }

  function replaceReferenceSubWorkTypeId(
    tempSubWorkTypeId: number,
    subWorkType: { id: number; name: string; color?: string | null },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.subWorkTypeId === tempSubWorkTypeId
          ? {
              ...item,
              subWorkTypeId: subWorkType.id,
              subWorkTypeName: subWorkType.name,
              subWorkTypeColor: subWorkType.color ?? item.subWorkTypeColor ?? null,
            }
          : item,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }

  function getHierarchyForDivision(divisionId: number) {
    return scheduleLoadState.value.data?.workHierarchy.filter(
      (item) => item.divisionId === divisionId,
    ) ?? [];
  }

  function getHierarchyForWorkType(workTypeId: number) {
    return scheduleLoadState.value.data?.workHierarchy.filter(
      (item) => item.workTypeId === workTypeId,
    ) ?? [];
  }

  function updateReferenceNameLocally(
    target: Extract<
      DesktopScheduleContextMenuTarget,
      { kind: "division-header" | "work-type-header" | "sub-work-type-header" }
    >,
    name: string,
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) => {
        if (target.kind === "division-header" && item.divisionId === target.divisionId) {
          return { ...item, divisionName: name };
        }

        if (target.kind === "work-type-header" && item.workTypeId === target.workTypeId) {
          return { ...item, workTypeName: name };
        }

        if (
          target.kind === "sub-work-type-header" &&
          item.subWorkTypeId === target.subWorkTypeId
        ) {
          return { ...item, subWorkTypeName: name };
        }

        return item;
      }),
      works: currentData.works.map((work) => {
        if (target.kind === "sub-work-type-header" && work.subWorkTypeId === target.subWorkTypeId) {
          return { ...work, subWorkType: name };
        }

        const hierarchyItem = currentData.workHierarchy.find(
          (item) => item.subWorkTypeId === work.subWorkTypeId,
        );

        if (!hierarchyItem) {
          return work;
        }

        if (target.kind === "division-header" && hierarchyItem.divisionId === target.divisionId) {
          return { ...work, division: name };
        }

        if (target.kind === "work-type-header" && hierarchyItem.workTypeId === target.workTypeId) {
          return { ...work, workType: name };
        }

        return work;
      }),
    }));
    rebuildScheduleFromLoadedData();
  }

  function removeReferenceLocally(
    target: Extract<
      DesktopScheduleContextMenuTarget,
      { kind: "division-header" | "work-type-header" | "sub-work-type-header" }
    >,
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.filter((item) => {
        if (target.kind === "division-header") {
          return item.divisionId !== target.divisionId;
        }

        if (target.kind === "work-type-header") {
          return item.workTypeId !== target.workTypeId;
        }

        return item.subWorkTypeId !== target.subWorkTypeId;
      }),
    }));
    rebuildScheduleFromLoadedData();
  }

  async function loadSchedule() {
    scheduleLoadState.value = {
      status: "loading",
      data: scheduleLoadState.value.data,
      error: null,
    };

    try {
      const scheduleData = await desktopScheduleApi.loadCurrentProjectSchedule();
      timelineCalendarState.value = createTimelineCalendarState(scheduleData);
      applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(scheduleData));
      clearLocalHistory();
      scheduleLoadState.value = {
        status: "success",
        data: scheduleData,
        error: null,
      };
    } catch (error) {
      timelineCalendarState.value = createEmptyTimelineCalendarState();
      applyScheduleSnapshot(createEmptyScheduleSnapshot());
      clearLocalHistory();
      scheduleLoadState.value = {
        status: "error",
        data: null,
        error: normalizeError(error),
      };
    }
  }

  function getSelectedScheduleVersionId() {
    return scheduleLoadState.value.data?.selectedScheduleVersion.id ?? null;
  }

  function getWorkConnectionById(workConnectionId: string) {
    return (
      workingWorkConnections.value.find(
        (workConnection) => workConnection.id === workConnectionId,
      ) ?? null
    );
  }

  function handleMutationError(error: unknown, fallbackMessage: string) {
    const normalizedError = normalizeError(error);
    console.error("[DesktopSchedule API] mutation failed", normalizedError);

    showScheduleToast(getMutationErrorToastMessage(normalizedError, fallbackMessage));
  }

  async function reloadAfterMutation() {
    await loadSchedule();
  }

  async function runScheduleMutation(
    mutation: () => Promise<unknown>,
    fallbackMessage: string,
    options: ScheduleMutationOptions = {},
  ) {
    const { reloadOnSuccess = false, reloadOnError = false, rollback } = options;

    try {
      await mutation();
      if (reloadOnSuccess) {
        await reloadAfterMutation();
      }
      return true;
    } catch (error) {
      rollback?.();
      handleMutationError(error, fallbackMessage);
      if (reloadOnError) {
        await reloadAfterMutation();
      }
      return false;
    }
  }

  function createWorkUpdateRequest(
    baseItem: DesktopScheduleItem,
    nextItem: DesktopScheduleItem,
    options: { omitStartDate?: boolean } = {},
  ): DesktopScheduleWorkUpdateItem {
    const request: DesktopScheduleWorkUpdateItem = {
      workId: nextItem.workId,
    };

    if (!options.omitStartDate && baseItem.startDate !== nextItem.startDate) {
      request.startDate = nextItem.startDate;
    }

    if (baseItem.durationDays !== nextItem.durationDays) {
      request.workLeadTime = nextItem.durationDays;
    }

    if (baseItem.positionY !== nextItem.positionY) {
      request.positionY = nextItem.positionY;
    }

    return request;
  }

  function orderWorkUpdateItemsByDependency(
    updateItems: DesktopScheduleWorkUpdateItem[],
    nextItems: DesktopScheduleItem[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    if (updateItems.length <= 1 || workConnections.length === 0) {
      return updateItems;
    }

    const itemById = new Map(nextItems.map((item) => [item.id, item] as const));
    const updateItemByWorkId = new Map(updateItems.map((item) => [item.workId, item] as const));
    const originalIndexByWorkId = new Map(
      updateItems.map((item, index) => [item.workId, index] as const),
    );
    const outgoingWorkIdsByWorkId = new Map<number, Set<number>>();
    const incomingCountByWorkId = new Map<number, number>(
      updateItems.map((item) => [item.workId, 0] as const),
    );

    workConnections.forEach((workConnection) => {
      const sourceItem = itemById.get(workConnection.sourceItemId);
      const targetItem = itemById.get(workConnection.targetItemId);

      if (
        !sourceItem ||
        !targetItem ||
        !updateItemByWorkId.has(sourceItem.workId) ||
        !updateItemByWorkId.has(targetItem.workId) ||
        sourceItem.workId === targetItem.workId
      ) {
        return;
      }

      const outgoingWorkIds = outgoingWorkIdsByWorkId.get(sourceItem.workId) ?? new Set<number>();

      if (outgoingWorkIds.has(targetItem.workId)) {
        return;
      }

      outgoingWorkIds.add(targetItem.workId);
      outgoingWorkIdsByWorkId.set(sourceItem.workId, outgoingWorkIds);
      incomingCountByWorkId.set(targetItem.workId, (incomingCountByWorkId.get(targetItem.workId) ?? 0) + 1);
    });

    const orderedWorkIds: number[] = [];
    let availableWorkIds = updateItems
      .map((item) => item.workId)
      .filter((workId) => (incomingCountByWorkId.get(workId) ?? 0) === 0);

    while (availableWorkIds.length > 0) {
      availableWorkIds = availableWorkIds.sort(
        (a, b) => (originalIndexByWorkId.get(a) ?? 0) - (originalIndexByWorkId.get(b) ?? 0),
      );

      const workId = availableWorkIds.shift();

      if (workId === undefined) {
        continue;
      }

      orderedWorkIds.push(workId);

      (outgoingWorkIdsByWorkId.get(workId) ?? new Set<number>()).forEach((targetWorkId) => {
        const nextIncomingCount = (incomingCountByWorkId.get(targetWorkId) ?? 0) - 1;
        incomingCountByWorkId.set(targetWorkId, nextIncomingCount);

        if (nextIncomingCount === 0) {
          availableWorkIds.push(targetWorkId);
        }
      });
    }

    updateItems
      .map((item) => item.workId)
      .filter((workId) => !orderedWorkIds.includes(workId))
      .forEach((workId) => {
        orderedWorkIds.push(workId);
      });

    return orderedWorkIds
      .map((workId) => updateItemByWorkId.get(workId))
      .filter((item): item is DesktopScheduleWorkUpdateItem => !!item);
  }

  async function persistWorkConnectionGapChanges(
    baseWorkConnections: DesktopScheduleWorkConnection[],
    nextWorkConnections: DesktopScheduleWorkConnection[],
  ) {
    const nextWorkConnectionById = new Map(
      nextWorkConnections.map((workConnection) => [workConnection.id, workConnection] as const),
    );
    const changedWorkConnections = baseWorkConnections
      .map((baseWorkConnection) => {
        const nextWorkConnection = nextWorkConnectionById.get(baseWorkConnection.id);
        return nextWorkConnection &&
          hasWorkConnectionGapChange(baseWorkConnection, nextWorkConnection)
          ? nextWorkConnection
          : null;
      })
      .filter((workConnection): workConnection is DesktopScheduleWorkConnection => !!workConnection);

    await Promise.all(
      changedWorkConnections.map((workConnection) =>
        desktopScheduleApi.updateWorkDep(workConnection.pathId, {
          lagDays: workConnection.gapDays,
        }),
      ),
    );

    return changedWorkConnections;
  }

  async function persistItemDateAndLayoutChanges(
    baseItems: DesktopScheduleItem[],
    nextItems: DesktopScheduleItem[],
    itemIds: string[],
    changedWorkConnections: DesktopScheduleWorkConnection[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    const nextItemById = new Map(nextItems.map((item) => [item.id, item] as const));
    const changedWorkConnectionTargetIds = new Set(
      changedWorkConnections.map((workConnection) => workConnection.targetItemId),
    );

    const updateItems: DesktopScheduleWorkUpdateItem[] = [];

    baseItems
      .filter((baseItem) => itemIds.includes(baseItem.id))
      .forEach((baseItem) => {
        const nextItem = nextItemById.get(baseItem.id);

        if (!nextItem || !hasDateOrLayoutChange(baseItem, nextItem)) {
          return;
        }

        const request = createWorkUpdateRequest(baseItem, nextItem, {
          omitStartDate: changedWorkConnectionTargetIds.has(nextItem.id),
        });

        if (Object.keys(request).length <= 1) {
          return;
        }

        updateItems.push(request);
      });

    if (updateItems.length === 0) {
      return;
    }

    await desktopScheduleApi.updateWork({
      items: orderWorkUpdateItemsByDependency(updateItems, nextItems, workConnections),
    });
  }

  function addParentRow() {
    const snapshot = captureWorkingSnapshot();
    workingRows.value = desktopScheduleService.addParentRow(workingRows.value);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function addChildRow(parentRowId: string) {
    const snapshot = captureWorkingSnapshot();
    workingRows.value = desktopScheduleService.addChildRow(workingRows.value, parentRowId);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function toggleRowCollapse(rowId: string) {
    const snapshot = captureWorkingSnapshot();
    workingRows.value = desktopScheduleService.toggleRowCollapse(workingRows.value, rowId);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function createReferenceDivisionSet() {
    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: createOptimisticReferenceId(),
      divisionName: DEFAULT_DIVISION_NAME,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      isStructure: true,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function startDivisionRename(divisionId: number) {
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.divisionId === divisionId,
    );

    if (!targetHierarchyItem) {
      renamingDivisionId.value = null;
      return;
    }

    renamingDivisionId.value = divisionId;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  async function commitDivisionRename(payload: { divisionId: number; name: string }) {
    const nextName = payload.name.trim();
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.divisionId === payload.divisionId,
    );

    renamingDivisionId.value = null;

    if (!targetHierarchyItem || !nextName || targetHierarchyItem.divisionName === nextName) {
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "division-header" as const,
      divisionId: payload.divisionId,
      name: targetHierarchyItem.divisionName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();

    if (payload.divisionId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const division = await desktopScheduleApi.createDivision({
            name: nextName,
          });
          replaceReferenceDivisionId(payload.divisionId, division);
        },
        "분류를 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateDivision({ id: payload.divisionId, name: nextName });
      },
      "분류 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function cancelDivisionRename() {
    renamingDivisionId.value = null;
    closeContextMenu();
  }

  function createReferenceWorkTypeSet(payload: { divisionId: number; divisionName: string }) {
    if (payload.divisionId < 0) {
      showScheduleToast("분류 저장이 끝난 뒤 상위공정을 추가할 수 있어요.");
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: payload.divisionId,
      divisionName: payload.divisionName,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      isStructure: true,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function createReferenceSubWorkTypeSet(payload: { workTypeId: number }) {
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === payload.workTypeId,
    );

    if (!targetHierarchyItem) {
      closeContextMenu();
      return;
    }

    if (targetHierarchyItem.workTypeId < 0) {
      showScheduleToast("상위 공정명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: targetHierarchyItem.divisionId,
      divisionName: targetHierarchyItem.divisionName,
      workTypeId: targetHierarchyItem.workTypeId,
      workTypeName: targetHierarchyItem.workTypeName,
      isStructure: targetHierarchyItem.isStructure,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceSubWorkTypeItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function startWorkTypeRename(workTypeId: number) {
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === workTypeId,
    );

    if (!targetHierarchyItem) {
      renamingWorkTypeId.value = null;
      return;
    }

    renamingWorkTypeId.value = workTypeId;
    renamingDivisionId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  async function commitWorkTypeRename(payload: { workTypeId: number; name: string }) {
    const nextName = payload.name.trim();
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === payload.workTypeId,
    );

    renamingWorkTypeId.value = null;

    if (!targetHierarchyItem || !nextName || targetHierarchyItem.workTypeName === nextName) {
      closeContextMenu();
      return;
    }

    if (targetHierarchyItem.divisionId < 0) {
      showScheduleToast("분류명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "work-type-header" as const,
      divisionId: targetHierarchyItem.divisionId,
      workTypeId: payload.workTypeId,
      name: targetHierarchyItem.workTypeName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();

    if (payload.workTypeId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const workType = await desktopScheduleApi.createWorkType({
            divisionId: targetHierarchyItem.divisionId,
            name: nextName,
            isStructure: targetHierarchyItem.isStructure,
          });
          replaceReferenceWorkTypeId(payload.workTypeId, workType);
        },
        "상위 공정을 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateWorkType({
          id: payload.workTypeId,
          name: nextName,
          isStructure: targetHierarchyItem.isStructure,
        });
      },
      "상위 공정 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function cancelWorkTypeRename() {
    renamingWorkTypeId.value = null;
    closeContextMenu();
  }

  function startSubWorkTypeRename(subWorkTypeId: number) {
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.subWorkTypeId === subWorkTypeId,
    );

    if (!targetHierarchyItem) {
      renamingSubWorkTypeId.value = null;
      return;
    }

    renamingSubWorkTypeId.value = subWorkTypeId;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  async function commitSubWorkTypeRename(payload: { subWorkTypeId: number; name: string }) {
    const nextName = payload.name.trim();
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.subWorkTypeId === payload.subWorkTypeId,
    );

    renamingSubWorkTypeId.value = null;

    if (!targetHierarchyItem || !nextName || targetHierarchyItem.subWorkTypeName === nextName) {
      closeContextMenu();
      return;
    }

    if (targetHierarchyItem.workTypeId < 0) {
      showScheduleToast("상위 공정명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "sub-work-type-header" as const,
      workTypeId: targetHierarchyItem.workTypeId,
      subWorkTypeId: payload.subWorkTypeId,
      rowId: `row:${payload.subWorkTypeId}`,
      name: targetHierarchyItem.subWorkTypeName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();

    if (payload.subWorkTypeId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const subWorkType = await desktopScheduleApi.createSubWorkType({
            workTypeId: targetHierarchyItem.workTypeId,
            name: nextName,
            color: targetHierarchyItem.subWorkTypeColor ?? null,
          });
          replaceReferenceSubWorkTypeId(payload.subWorkTypeId, subWorkType);
        },
        "하위 공정을 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateSubWorkType({
          id: payload.subWorkTypeId,
          name: nextName,
        });
      },
      "하위 공정 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function cancelSubWorkTypeRename() {
    renamingSubWorkTypeId.value = null;
    closeContextMenu();
  }

  async function reorderReferenceDivisions(payload: { divisionIds: number[] }) {
    if (payload.divisionIds.length < 2) {
      return;
    }

    const snapshot = captureWorkingSnapshot();
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: sortHierarchyByDivisionIds(currentData.workHierarchy, payload.divisionIds),
    }));
    rebuildScheduleFromLoadedData();
    closeContextMenu();

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateDivision({ ids: payload.divisionIds });
      },
      "분류 순서를 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  async function reorderReferenceWorkTypes(payload: { divisionId: number; workTypeIds: number[] }) {
    if (payload.workTypeIds.length < 2) {
      return;
    }

    const snapshot = captureWorkingSnapshot();
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: sortHierarchyByWorkTypeIds(
        currentData.workHierarchy,
        payload.divisionId,
        payload.workTypeIds,
      ),
    }));
    rebuildScheduleFromLoadedData();
    closeContextMenu();

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateWorkType({
          parentId: payload.divisionId,
          ids: payload.workTypeIds,
        });
      },
      "상위 공정 순서를 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function selectBars(payload: { itemIds: string[]; rowIds: string[]; milestoneIds?: string[] }) {
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: payload.rowIds,
      itemIds: payload.itemIds,
      milestoneIds: payload.milestoneIds ?? [],
    };
    closeContextMenu();
  }

  function selectRows(payload: { rowIds: string[] }) {
    const selectableRowIds = payload.rowIds.filter((rowId) => {
      const row = rowById.value.get(rowId);
      return row?.kind === "child-process" || row?.kind === "parent-process";
    });

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: selectableRowIds,
    };
    closeContextMenu();
  }

  async function deleteSelection() {
    const selectedRowIds = selectionState.value.rowIds.filter((rowId) => rowById.value.has(rowId));
    const selectedRowIdSet = new Set(selectedRowIds);
    const rowItemIds = workingItems.value
      .filter((item) => selectedRowIdSet.has(item.rowId))
      .map((item) => item.id);
    const itemIdsToDelete = Array.from(new Set([...selectionState.value.itemIds, ...rowItemIds]));
    const workIdsToDelete = workingItems.value
      .filter((item) => itemIdsToDelete.includes(item.id))
      .map((item) => item.workId);
    const workDepIdsToDelete = workingWorkConnections.value
      .filter((workConnection) =>
        selectionState.value.workConnectionIds.includes(workConnection.id),
      )
      .map((workConnection) => workConnection.pathId);
    const milestoneIdsToDelete = [...selectionState.value.milestoneIds];
    const milestoneApiIdsToDelete = workingMilestones.value
      .filter((milestone) => milestoneIdsToDelete.includes(milestone.id))
      .map(getMilestoneApiId)
      .filter((milestoneApiId): milestoneApiId is number => milestoneApiId !== null);
    const snapshot = captureWorkingSnapshot();

    if (workIdsToDelete.length > 0 || workDepIdsToDelete.length > 0) {
      if (itemIdsToDelete.length > 0) {
        workingItems.value = desktopScheduleService.deleteItems(workingItems.value, itemIdsToDelete);
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
          workingWorkConnections.value,
          itemIdsToDelete,
        );
      }

      if (workDepIdsToDelete.length > 0) {
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
          workingWorkConnections.value,
          selectionState.value.workConnectionIds,
        );
      }

      if (milestoneIdsToDelete.length > 0) {
        workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
          workingMilestones.value,
          milestoneIdsToDelete,
        );
      }

      removeLoadedWorksAndWorkDeps(workIdsToDelete, workDepIdsToDelete);
      removeLoadedMilestones(milestoneApiIdsToDelete);

      selectionState.value = createEmptyDesktopScheduleSelectionState();
      connectionCreationState.value = null;
      closeContextMenu();

      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all([
            ...workDepIdsToDelete.map((workDepId) => desktopScheduleApi.deleteWorkDep(workDepId)),
            ...workIdsToDelete.map((workId) => desktopScheduleApi.deleteWork(workId)),
            ...milestoneApiIdsToDelete.map((milestoneApiId) =>
              desktopScheduleApi.deleteMilestone(milestoneApiId),
            ),
          ]);
        },
        "공정표 항목을 삭제하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    if (selectedRowIds.length > 0) {
      workingRows.value = desktopScheduleService.deleteRows(workingRows.value, selectedRowIds);
    }

    if (itemIdsToDelete.length > 0) {
      workingItems.value = desktopScheduleService.deleteItems(workingItems.value, itemIdsToDelete);
      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
        workingWorkConnections.value,
        itemIdsToDelete,
      );
    }

    if (selectionState.value.workConnectionIds.length > 0) {
      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
        workingWorkConnections.value,
        selectionState.value.workConnectionIds,
      );
    }

    if (selectionState.value.milestoneIds.length > 0) {
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        selectionState.value.milestoneIds,
      );
      removeLoadedMilestones(milestoneApiIdsToDelete);
    }

    if (renamingItemId.value && itemIdsToDelete.includes(renamingItemId.value)) {
      renamingItemId.value = null;
    }

    if (
      renamingMilestoneId.value &&
      selectionState.value.milestoneIds.includes(renamingMilestoneId.value)
    ) {
      renamingMilestoneId.value = null;
    }

    selectionState.value = createEmptyDesktopScheduleSelectionState();
    connectionCreationState.value = null;
    closeContextMenu();

    if (milestoneApiIdsToDelete.length > 0) {
      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all(
            milestoneApiIdsToDelete.map((milestoneApiId) =>
              desktopScheduleApi.deleteMilestone(milestoneApiId),
            ),
          );
        },
        "마일스톤을 삭제하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    pushLocalHistoryEntry(snapshot);
  }

  function canCreateItemOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    if (!target.rowId || !target.date) {
      return false;
    }

    return rowById.value.get(target.rowId)?.kind === "child-process";
  }

  function canCreateMilestoneOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    return target.rowId === DESKTOP_SCHEDULE_MILESTONE_ROW_ID && !!target.date;
  }

  function openItemContextMenu(payload: { itemId: string; x: number; y: number }) {
    const nextSelectedItemIds = selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : [payload.itemId];

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: nextSelectedItemIds,
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "item",
        itemId: payload.itemId,
      },
    };
  }

  function openWorkConnectionContextMenu(payload: { workConnectionId: string; x: number; y: number }) {
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      workConnectionIds: [payload.workConnectionId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "work-connection",
        workConnectionId: payload.workConnectionId,
      },
    };
  }

  function openMilestoneContextMenu(payload: { milestoneId: string; x: number; y: number }) {
    if (!workingMilestones.value.some((milestone) => milestone.id === payload.milestoneId)) {
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "milestone",
        milestoneId: payload.milestoneId,
      },
    };
  }

  function openRowContextMenu(payload: { rowId: string; x: number; y: number }) {
    if (!rowById.value.has(payload.rowId)) {
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: [payload.rowId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "row",
        rowId: payload.rowId,
      },
    };
  }

  function openScheduleHeaderContextMenu(payload: {
    target:
      | { kind: "division-header"; divisionId: number; name: string }
      | { kind: "work-type-header"; divisionId: number; workTypeId: number; name: string }
      | {
          kind: "sub-work-type-header";
          workTypeId: number;
          subWorkTypeId: number;
          rowId: string;
          name: string;
        };
    x: number;
    y: number;
  }) {
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: payload.target,
    };
  }

  function openCanvasContextMenu(payload: {
    x: number;
    y: number;
    rowId: string | null;
    date: string | null;
  }) {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "canvas",
        rowId: payload.rowId,
        date: payload.date,
      },
    };
  }

  function getScopedItemIds(targetItemId: string) {
    return selectionState.value.itemIds.includes(targetItemId)
      ? selectionState.value.itemIds
      : [targetItemId];
  }

  function openColorPalette(target: ColorPaletteTarget, selectedColor: string | null | undefined) {
    colorPaletteState.value = {
      open: true,
      x: contextMenuState.value.x,
      y: contextMenuState.value.y,
      target,
      selectedColor: selectedColor ?? null,
    };
    closeContextMenu();
  }

  async function applyColorSelection(colorHex: string | null) {
    const target = colorPaletteState.value.target;

    if (!target) {
      closeColorPalette();
      return;
    }

    const snapshot = captureWorkingSnapshot();

    if (target.kind === "row") {
      const targetRow = rowById.value.get(target.rowId);
      const subWorkTypeId = targetRow?.source.subWorkTypeId ?? null;

      workingRows.value = desktopScheduleService.updateRowColor(
        workingRows.value,
        target.rowId,
        colorHex,
      );
      if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
        syncLoadedSubWorkTypeColor(subWorkTypeId, colorHex);
      }
      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        rowIds: [target.rowId],
      };
      closeColorPalette();
      if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
        const didSave = await runScheduleMutation(
          async () => {
            await desktopScheduleApi.updateSubWorkType({
              id: subWorkTypeId,
              color: colorHex,
            });
          },
          "하위 공정 색상을 저장하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        return;
      }

      pushLocalHistoryEntry(snapshot);
      return;
    }

    const scopedItemIds = getScopedItemIds(target.itemId);
    workingItems.value = desktopScheduleService.updateItemColor(
      workingItems.value,
      scopedItemIds,
      colorHex,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: scopedItemIds,
    };
    pushLocalHistoryEntry(snapshot);
    closeColorPalette();
  }

  async function createItemOnCanvasTarget(payload: { rowId: string; startDate: string }) {
    const targetRow = rowById.value.get(payload.rowId);
    const scheduleVersionId = getSelectedScheduleVersionId();
    const subWorkTypeId = targetRow?.source.subWorkTypeId;

    if (!scheduleVersionId || !subWorkTypeId) {
      handleMutationError(
        new Error("작업을 생성할 공정표 버전 또는 하위 공정 정보가 없습니다."),
        "작업을 생성하지 못했습니다.",
      );
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const previousItemIds = new Set(workingItems.value.map((item) => item.id));
    workingItems.value = desktopScheduleService.createItem(workingRows.value, workingItems.value, {
      rowId: payload.rowId,
      startDate: payload.startDate,
      workType: targetRow.source.workType,
      subWorkType: targetRow.source.subWorkType,
      division: targetRow.source.division,
      annotation: "",
    });
    const createdItem = workingItems.value.find((item) => !previousItemIds.has(item.id));
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: createdItem ? [createdItem.id] : [],
    };
    closeContextMenu();

    const didSave = await runScheduleMutation(
      async () => {
        const response = await desktopScheduleApi.createWork({
          startDate: payload.startDate,
          workLeadTime: 3,
          subWorkTypeId,
          scheduleVersionId,
          annotation: "",
        });
        applyServerMutationPatch(response, { rebuildSnapshot: true });
      },
      "작업을 생성하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function startItemRename(itemId: string) {
    const targetItem = workingItems.value.find((item) => item.id === itemId);

    if (!targetItem) {
      renamingItemId.value = null;
      closeContextMenu();
      return;
    }
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [itemId],
    };
    renamingItemId.value = itemId;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  async function commitItemRename(payload: { itemId: string; name: string }) {
    const nextName = payload.name;
    const targetItem = workingItems.value.find((item) => item.id === payload.itemId);

    renamingItemId.value = null;

    if (!targetItem) {
      closeContextMenu();
      return;
    }

    if (targetItem.name === nextName) {
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    workingItems.value = desktopScheduleService.updateItemName(
      workingItems.value,
      payload.itemId,
      nextName,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [payload.itemId],
    };
    closeContextMenu();

    const didSave = await runScheduleMutation(
      async () => {
        const response = await desktopScheduleApi.updateWork({
          items: [
            {
              workId: targetItem.workId,
              workName: nextName,
            },
          ],
        });
        applyServerMutationPatch(response);
      },
      "작업명을 저장하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );

    if (didSave) {
      syncLoadedWorkName(targetItem.workId, nextName);
      pushLocalHistoryEntry(snapshot);
    }
  }

  function cancelItemRename() {
    renamingItemId.value = null;
    closeContextMenu();
  }

  function startMilestoneRename(milestoneId: string) {
    const targetMilestone = workingMilestones.value.find((milestone) => milestone.id === milestoneId);

    if (!targetMilestone) {
      renamingMilestoneId.value = null;
      closeContextMenu();
      return;
    }

    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [milestoneId],
    };
    renamingItemId.value = null;
    renamingMilestoneId.value = milestoneId;
    closeContextMenu();
  }

  async function commitMilestoneRename(payload: { milestoneId: string; label: string }) {
    const trimmedLabel = payload.label.trim();
    const targetMilestone = workingMilestones.value.find(
      (milestone) => milestone.id === payload.milestoneId,
    );

    renamingMilestoneId.value = null;

    if (!targetMilestone || !trimmedLabel || targetMilestone.label === trimmedLabel) {
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    workingMilestones.value = desktopScheduleService.updateMilestoneLabel(
      workingMilestones.value,
      payload.milestoneId,
      trimmedLabel,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    syncLoadedMilestoneFromModel({
      ...targetMilestone,
      label: trimmedLabel,
    });
    closeContextMenu();

    const apiId = getMilestoneApiId(targetMilestone);
    if (apiId === null) {
      pushLocalHistoryEntry(snapshot);
      return;
    }

    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateMilestone({
          id: apiId,
          date: targetMilestone.date,
          name: trimmedLabel,
        });
      },
      "마일스톤 이름을 저장하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function cancelMilestoneRename() {
    renamingMilestoneId.value = null;
    closeContextMenu();
  }

  function alertWorkConnectionPredecessorLimitOnce(session: {
    blockedAlertShown: boolean;
  }) {
    if (session.blockedAlertShown) {
      return;
    }

    session.blockedAlertShown = true;
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    interactionSession.value = null;
    interactionCancelVersion.value += 1;
    showScheduleToast("작업 연결 상태에서 후행작업은 선행작업보다 빠를 수 없어요.");
  }

  const contextMenuItems = computed<DesktopScheduleContextMenuItem[]>(() => {
    const target = contextMenuState.value.target;
    if (!contextMenuState.value.open || !target) {
      return [];
    }

    if (
      target.kind === "division-header" ||
      target.kind === "work-type-header" ||
      target.kind === "sub-work-type-header"
    ) {
      const createItem =
        target.kind === "division-header"
          ? {
              id: "create-division-reference",
              label: "새 분류 생성",
              command: "create-division-reference" as const,
              icon: "plus" as const,
            }
          : target.kind === "work-type-header"
            ? {
                id: "create-work-type-reference",
                label: "상위공정 생성",
                command: "create-work-type-reference" as const,
                icon: "plus" as const,
              }
            : {
                id: "create-sub-work-type-reference",
                label: "하위공정 생성",
                command: "create-sub-work-type-reference" as const,
                icon: "plus" as const,
              };

      const colorItem =
        target.kind === "sub-work-type-header"
          ? [
              {
                id: "change-sub-work-type-color",
                label: "색상 설정",
                command: "change-color" as const,
                icon: "palette" as const,
              },
            ]
          : [];

      return [
        createItem,
        ...colorItem,
        {
          id: "rename-reference",
          label: "이름 변경",
          command: "rename-reference",
          icon: "pencil",
        },
        {
          id: "delete-reference",
          label: "삭제",
          command: "delete-reference",
          icon: "trash",
          danger: true,
        },
      ];
    }

    if (target.kind === "item") {
      return [
        {
          id: "toggle-work-connection",
          label: "작업 연결 생성",
          command: "toggle-work-connection",
          icon: "connection",
        },
        { id: "change-item-color", label: "색상 변경", command: "change-color", icon: "palette" },
        {
          id: "change-item-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "delete-item",
          label: "삭제",
          command: "delete-item",
          icon: "trash",
          danger: true,
        },
      ];
    }

    if (target.kind === "work-connection") {
      return [
        {
          id: "remove-work-connection",
          label: "작업 연결 제거",
          command: "remove-work-connection",
          icon: "disconnect",
          danger: true,
        },
      ];
    }

    if (target.kind === "milestone") {
      return [
        {
          id: "change-milestone-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "remove-milestone",
          label: "마일스톤 제거",
          command: "remove-milestone",
          icon: "trash",
          danger: true,
        },
      ];
    }

    if (target.kind === "row") {
      const row = rowById.value.get(target.rowId);

      if (!row) {
        return [];
      }

      if (row.kind === "child-process") {
        return [
          {
            id: "change-child-color",
            label: "색상 설정",
            command: "change-color",
            icon: "palette",
          },
        ];
      }

      return [
        {
          id: "change-parent-properties",
          label: "속성 변경",
          command: "change-properties",
          icon: "pencil",
        },
      ];
    }

    if (target.kind === "canvas") {
      if (canCreateMilestoneOnCanvasTarget(target)) {
        return [
          {
            id: "create-milestone",
            label: "마일스톤 생성",
            command: "create-milestone",
            icon: "plus",
          },
        ];
      }

      return [
        {
          id: "create-item",
          label: "작업 생성",
          command: "create-item",
          icon: "plus",
          disabled: !canCreateItemOnCanvasTarget(target),
        },
      ];
    }

    return [];
  });

  async function executeContextMenuCommand(command: DesktopScheduleContextMenuCommand) {
    const target = contextMenuState.value.target;

    if (!target) {
      return;
    }

    if (
      target.kind === "division-header" ||
      target.kind === "work-type-header" ||
      target.kind === "sub-work-type-header"
    ) {
      if (command === "change-color" && target.kind === "sub-work-type-header") {
        const targetRow = rowById.value.get(target.rowId);
        openColorPalette(
          {
            kind: "row",
            rowId: target.rowId,
          },
          targetRow?.colorHex,
        );
        return;
      }

      if (command === "create-division-reference" && target.kind === "division-header") {
        createReferenceDivisionSet();
        return;
      }

      if (command === "create-work-type-reference" && target.kind === "work-type-header") {
        const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
          (item) => item.divisionId === target.divisionId,
        );

        createReferenceWorkTypeSet({
          divisionId: target.divisionId,
          divisionName: targetHierarchyItem?.divisionName ?? "",
        });
        return;
      }

      if (command === "create-sub-work-type-reference" && target.kind === "sub-work-type-header") {
        createReferenceSubWorkTypeSet({
          workTypeId: target.workTypeId,
        });
        return;
      }

      if (command === "rename-reference") {
        if (target.kind === "division-header") {
          startDivisionRename(target.divisionId);
          return;
        }

        if (target.kind === "work-type-header") {
          startWorkTypeRename(target.workTypeId);
          return;
        }

        startSubWorkTypeRename(target.subWorkTypeId);
        return;
      }

      if (command === "delete-reference") {
        if (typeof window !== "undefined") {
          const confirmed = window.confirm(
            `${target.name}을(를) 삭제할까요?\n하위 항목이 있으면 함께 삭제를 시도합니다.`,
          );

          if (!confirmed) {
            closeContextMenu();
            return;
          }
        }

        const snapshot = captureWorkingSnapshot();
        const divisionHierarchy =
          target.kind === "division-header" ? getHierarchyForDivision(target.divisionId) : [];
        const workTypeHierarchy =
          target.kind === "work-type-header" ? getHierarchyForWorkType(target.workTypeId) : [];
        removeReferenceLocally(target);
        closeContextMenu();

        const didSave = await runScheduleMutation(
          async () => {
            if (target.kind === "division-header") {
              const subWorkTypeIds = Array.from(
                new Set(divisionHierarchy.map((item) => item.subWorkTypeId)),
              );
              const workTypeIds = Array.from(
                new Set(divisionHierarchy.map((item) => item.workTypeId)),
              );

              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId),
                ),
              );
              await Promise.all(
                workTypeIds.map((workTypeId) => desktopScheduleApi.deleteWorkType(workTypeId)),
              );
              await desktopScheduleApi.deleteDivision(target.divisionId);
              return;
            }

            if (target.kind === "work-type-header") {
              const subWorkTypeIds = Array.from(
                new Set(workTypeHierarchy.map((item) => item.subWorkTypeId)),
              );

              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId),
                ),
              );
              await desktopScheduleApi.deleteWorkType(target.workTypeId);
              return;
            }

            await desktopScheduleApi.deleteSubWorkType(target.subWorkTypeId);
          },
          "공정 항목을 삭제하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        return;
      }
    }

    if (
      command === "create-milestone" &&
      target.kind === "canvas" &&
      canCreateMilestoneOnCanvasTarget(target) &&
      target.date
    ) {
      await activateMilestone({ date: target.date });
      return;
    }

    if (
      command === "create-item" &&
      target.kind === "canvas" &&
      canCreateItemOnCanvasTarget(target) &&
      target.rowId &&
      target.date
    ) {
      await createItemOnCanvasTarget({
        rowId: target.rowId,
        startDate: target.date,
      });
      return;
    }

    if (target.kind === "row") {
      const targetRow = rowById.value.get(target.rowId);

      if (!targetRow) {
        closeContextMenu();
        return;
      }

      if (command === "change-color") {
        openColorPalette(target, targetRow.colorHex);
        return;
      }

      if (targetRow.kind === "parent-process" && command === "change-properties") {
        const nextName = promptForName("상위 공정명을 입력하세요.", targetRow.name);
        if (nextName) {
          const snapshot = captureWorkingSnapshot();
          workingRows.value = desktopScheduleService.updateRowName(
            workingRows.value,
            target.rowId,
            nextName,
          );
          pushLocalHistoryEntry(snapshot);
        }
        closeContextMenu();
        return;
      }
    }

    if (target.kind === "item") {
      const scopedItemIds = getScopedItemIds(target.itemId);

      if (command === "toggle-work-connection") {
        connectionCreationState.value = {
          kind: "work-connection",
          sourceItemId: target.itemId,
        };
        selectionState.value = {
          ...createEmptyDesktopScheduleSelectionState(),
          itemIds: [target.itemId],
        };
        closeContextMenu();
        return;
      }

      if (command === "delete-item") {
        const snapshot = captureWorkingSnapshot();
        const workIdsToDelete = workingItems.value
          .filter((item) => scopedItemIds.includes(item.id))
          .map((item) => item.workId);
        workingItems.value = desktopScheduleService.deleteItems(workingItems.value, scopedItemIds);
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
          workingWorkConnections.value,
          scopedItemIds,
        );
        if (renamingItemId.value && scopedItemIds.includes(renamingItemId.value)) {
          renamingItemId.value = null;
        }
        selectionState.value = createEmptyDesktopScheduleSelectionState();
        removeLoadedWorksAndWorkDeps(workIdsToDelete);
        closeContextMenu();
        const didSave = await runScheduleMutation(
          async () => {
            await Promise.all(
              workIdsToDelete.map((workId) => desktopScheduleApi.deleteWork(workId)),
            );
          },
          "작업을 삭제하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        return;
      }

      if (command === "change-color") {
        const targetItem = workingItems.value.find((item) => item.id === target.itemId);
        openColorPalette(target, targetItem?.colorHex);
        return;
      }

      if (command === "change-properties") {
        startItemRename(target.itemId);
        return;
      }
    }

    if (target.kind === "work-connection" && command === "remove-work-connection") {
      const targetWorkConnection = getWorkConnectionById(target.workConnectionId);
      const snapshot = captureWorkingSnapshot();
      closeContextMenu();
      if (!targetWorkConnection) {
        return;
      }

      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
        workingWorkConnections.value,
        [target.workConnectionId],
      );
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      removeLoadedWorkDeps([targetWorkConnection.pathId]);

      const didSave = await runScheduleMutation(
        async () => {
          await desktopScheduleApi.deleteWorkDep(targetWorkConnection.pathId);
        },
        "작업 연결을 제거하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    if (target.kind === "milestone" && command === "remove-milestone") {
      const snapshot = captureWorkingSnapshot();
      const targetMilestone = workingMilestones.value.find(
        (milestone) => milestone.id === target.milestoneId,
      );
      const milestoneApiId = getMilestoneApiId(targetMilestone);
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        [target.milestoneId],
      );
      removeLoadedMilestones(milestoneApiId === null ? [] : [milestoneApiId]);
      if (renamingMilestoneId.value === target.milestoneId) {
        renamingMilestoneId.value = null;
      }
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      closeContextMenu();
      if (milestoneApiId === null) {
        pushLocalHistoryEntry(snapshot);
        return;
      }

      const didSave = await runScheduleMutation(
        async () => {
          await desktopScheduleApi.deleteMilestone(milestoneApiId);
        },
        "마일스톤을 삭제하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    if (target.kind === "milestone" && command === "change-properties") {
      startMilestoneRename(target.milestoneId);
      return;
    }

  }

  function cancelConnectionCreation() {
    connectionCreationState.value = null;
  }

  async function completeConnectionCreation(targetItemId: string) {
    const connectionCreation = connectionCreationState.value;
    const scheduleVersionId = getSelectedScheduleVersionId();

    if (!connectionCreation) {
      return;
    }

    if (!scheduleVersionId) {
      handleMutationError(
        new Error("작업 연결을 생성할 공정표 버전이 없습니다."),
        "작업 연결을 생성하지 못했습니다.",
      );
      connectionCreationState.value = null;
      closeContextMenu();
      return;
    }

    if (connectionCreation.sourceItemId !== targetItemId) {
      let sourceItemId = connectionCreation.sourceItemId;
      let nextTargetItemId = targetItemId;

      const sourceItem = workingItems.value.find((item) => item.id === connectionCreation.sourceItemId);
      const targetItem = workingItems.value.find((item) => item.id === targetItemId);

      if (sourceItem && targetItem && shouldSwapConnectionDirection(sourceItem, targetItem)) {
        sourceItemId = targetItem.id;
        nextTargetItemId = sourceItem.id;
      }

      const nextSourceItem = workingItems.value.find((item) => item.id === sourceItemId);
      const nextTargetItem = workingItems.value.find((item) => item.id === nextTargetItemId);

      if (!nextSourceItem || !nextTargetItem) {
        return;
      }

      const snapshot = captureWorkingSnapshot();
      const gapDays = desktopScheduleService.getGapDaysBetweenItems(
        nextSourceItem,
        nextTargetItem,
      );
      const overridingWorkConnections = workingWorkConnections.value.filter(
        (workConnection) =>
          isSameConnectionItemPair(workConnection, nextSourceItem.id, nextTargetItem.id),
      );
      const overridingWorkDepIds = overridingWorkConnections.map(
        (workConnection) => workConnection.pathId,
      );
      const nextWorkConnections = desktopScheduleService.createWorkConnection(
        workingWorkConnections.value,
        {
          sourceItemId: nextSourceItem.id,
          targetItemId: nextTargetItem.id,
          gapDays,
        },
      );
      const didCreateLocalConnection = nextWorkConnections !== workingWorkConnections.value;
      workingWorkConnections.value = nextWorkConnections;
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      connectionCreationState.value = null;
      closeContextMenu();

      if (!didCreateLocalConnection) {
        return;
      }

      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all(
            overridingWorkDepIds.map((workDepId) => desktopScheduleApi.deleteWorkDep(workDepId)),
          );
          const response = await desktopScheduleApi.createWorkDep({
            sourceWorkId: nextSourceItem.workId,
            targetWorkId: nextTargetItem.workId,
            lagDays: gapDays,
            scheduleVersionId,
          });
          const replacementWorkDeps =
            overridingWorkDepIds.length > 0 || (response.updatedWorkDeps?.length ?? 0) === 0
              ? await desktopScheduleApi.getWorkDepListByVersion(scheduleVersionId)
              : undefined;
          applyServerMutationPatch(response, {
            rebuildSnapshot: true,
            replacementWorkDeps,
          });
        },
        "작업 연결을 생성하지 못했습니다.",
        {
          reloadOnError: overridingWorkDepIds.length > 0,
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    connectionCreationState.value = null;
    closeContextMenu();
  }

  async function activateMilestone(payload: { date: string; milestoneId?: string }) {
    closeContextMenu();
    const snapshot = captureWorkingSnapshot();

    if (payload.milestoneId) {
      const existingMilestone = workingMilestones.value.find(
        (milestone) => milestone.id === payload.milestoneId,
      );

      if (!existingMilestone) {
        return;
      }

      workingMilestones.value = desktopScheduleService.upsertMilestone(workingMilestones.value, {
        date: existingMilestone.date,
        label: existingMilestone.label,
        rowId: null,
      });
      pushLocalHistoryEntry(snapshot);
      return;
    }

    const previousMilestoneIds = new Set(workingMilestones.value.map((milestone) => milestone.id));
    const defaultMilestoneLabel = createUniqueReferenceName(
      "마일스톤",
      workingMilestones.value.map((milestone) => milestone.label),
    );
    workingMilestones.value = desktopScheduleService.createMilestone(workingMilestones.value, {
      date: payload.date,
      label: defaultMilestoneLabel,
      rowId: null,
    });
    const createdMilestone = workingMilestones.value.find(
      (milestone) => !previousMilestoneIds.has(milestone.id),
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: createdMilestone ? [createdMilestone.id] : [],
    };

    if (!createdMilestone) {
      closeContextMenu();
      return;
    }

    const didSave = await runScheduleMutation(
      async () => {
        const apiMilestone = await desktopScheduleApi.createMilestone({
          date: createdMilestone.date,
          name: createdMilestone.label,
        });
        replaceWorkingMilestoneWithApiMilestone(createdMilestone.id, apiMilestone);
      },
      "마일스톤을 생성하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
  }

  function startMoveSession(
    payload:
      | { kind: "item"; itemId: string }
      | { kind: "summary"; rowId: string }
      | { kind: "milestone"; milestoneId: string },
  ) {
    if (payload.kind === "milestone") {
      const selectedMilestoneIds = selectionState.value.milestoneIds.includes(payload.milestoneId)
        ? selectionState.value.milestoneIds
        : [payload.milestoneId];

      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        milestoneIds: selectedMilestoneIds,
      };
      interactionSession.value = {
        type: "move",
        anchor: "milestone",
        milestoneIds: selectedMilestoneIds,
        baseMilestones: workingMilestones.value.map((milestone) => ({ ...milestone })),
      };
      closeContextMenu();
      return;
    }

    const selectedItemIds =
      payload.kind === "item" && selectionState.value.itemIds.includes(payload.itemId)
        ? selectionState.value.itemIds
        : payload.kind === "item"
          ? [payload.itemId]
          : selectionState.value.itemIds;
    const selectedRowIds =
      payload.kind === "summary" && selectionState.value.rowIds.includes(payload.rowId)
        ? selectionState.value.rowIds
        : payload.kind === "summary"
          ? [payload.rowId]
          : selectionState.value.rowIds;
    const baseLaneByItemId = Object.fromEntries(
      (shellLayout.value?.bars ?? [])
        .filter((bar) => bar.kind === "item" && selectedItemIds.includes(bar.itemId))
        .map((bar) => [bar.itemId, bar.laneIndex]),
    );
    const maxLaneIndexByRowId = Object.fromEntries(
      Object.entries(
        (shellLayout.value?.bars ?? []).reduce<Record<string, number>>((acc, bar) => {
          acc[bar.rowId] = Math.max(acc[bar.rowId] ?? 0, bar.laneIndex);
          return acc;
        }, {}),
      ),
    );

    selectBars({
      itemIds: selectedItemIds,
      rowIds: selectedRowIds,
    });
    interactionSession.value = {
      type: "move",
      anchor: payload.kind,
      itemIds: selectedItemIds,
      rowIds: selectedRowIds,
      baseItems: workingItems.value.map((item) => ({ ...item })),
      baseRows: workingRows.value.map((row) => ({ ...row })),
      baseWorkConnections: workingWorkConnections.value.map((workConnection) => ({
        ...workConnection,
      })),
      baseLaneByItemId,
      maxLaneIndexByRowId,
      pinnedLaneByItemId: baseLaneByItemId,
      blockedAlertShown: false,
    };
  }

  function previewMoveSession(payload: { deltaDays: number; deltaLanes: number }) {
    const session = interactionSession.value;

    if (!session || session.type !== "move") {
      return;
    }

    if (session.anchor === "milestone") {
      workingMilestones.value = desktopScheduleService.moveMilestones(
        session.baseMilestones,
        session.milestoneIds,
        payload.deltaDays,
      );
      return;
    }

    if (session.rowIds.length > 0) {
      workingRows.value = desktopScheduleService.moveSummaryRows(
        session.baseRows,
        session.rowIds,
        payload.deltaDays,
      );
    }

    if (session.itemIds.length === 0) {
      return;
    }

    const rowIdByItemId = new Map(
      session.baseItems
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => [item.id, item.rowId] as const),
    );
    const laneBoundsByRowId = Object.entries(session.baseLaneByItemId).reduce<
      Record<string, { minLane: number; maxLane: number }>
    >((acc, [itemId, laneIndex]) => {
      const rowId = rowIdByItemId.get(itemId);
      if (!rowId) {
        return acc;
      }

      const existing = acc[rowId];
      if (!existing) {
        acc[rowId] = { minLane: laneIndex, maxLane: laneIndex };
        return acc;
      }

      existing.minLane = Math.min(existing.minLane, laneIndex);
      existing.maxLane = Math.max(existing.maxLane, laneIndex);
      return acc;
    }, {});

    interactionSession.value = {
      ...session,
      pinnedLaneByItemId: Object.fromEntries(
        Object.entries(session.baseLaneByItemId).map(([itemId, laneIndex]) => {
          const rowId = rowIdByItemId.get(itemId);
          if (!rowId) {
            return [itemId, laneIndex] as const;
          }

          const rowBounds = laneBoundsByRowId[rowId];
          const maxLaneIndex = session.maxLaneIndexByRowId[rowId] ?? rowBounds?.maxLane ?? laneIndex;
          const deltaLanes = session.anchor === "item" ? payload.deltaLanes : 0;
          const clampedDeltaLanes = Math.min(
            Math.max(deltaLanes, -(rowBounds?.minLane ?? laneIndex)),
            maxLaneIndex - (rowBounds?.maxLane ?? laneIndex),
          );

          return [itemId, laneIndex + clampedDeltaLanes] as const;
        }),
      ),
    };

    const moveResult = desktopScheduleService.moveItemsWithWorkConnections(
      session.baseItems,
      session.itemIds,
      payload.deltaDays,
      session.baseWorkConnections,
    );
    workingItems.value = moveResult.items;
    workingWorkConnections.value = moveResult.workConnections;

    if (moveResult.blockedByPredecessorStart) {
      alertWorkConnectionPredecessorLimitOnce(session);
    }
  }

  async function endMoveSession() {
    const session = interactionSession.value;
    if (!session || session.type !== "move") {
      return;
    }

    if (session.anchor === "milestone") {
      const snapshot = {
        ...captureWorkingSnapshot(),
        milestones: cloneMilestones(session.baseMilestones),
      };
      const baseMilestoneById = new Map(
        session.baseMilestones.map((milestone) => [milestone.id, milestone] as const),
      );
      const movedMilestones = workingMilestones.value.filter((milestone) => {
        if (!session.milestoneIds.includes(milestone.id)) {
          return false;
        }

        const baseMilestone = baseMilestoneById.get(milestone.id);
        return !!baseMilestone && baseMilestone.date !== milestone.date;
      });

      movedMilestones.forEach(syncLoadedMilestoneFromModel);
      interactionSession.value = null;
      if (movedMilestones.length === 0) {
        pushLocalHistoryEntry(snapshot);
        return;
      }

      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all(
            movedMilestones.map((milestone) => {
              const apiId = getMilestoneApiId(milestone);

              if (apiId === null) {
                return Promise.resolve();
              }

              return desktopScheduleApi.updateMilestone({
                id: apiId,
                date: milestone.date,
                name: milestone.label,
              });
            }),
          );
        },
        "마일스톤 위치를 저장하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    if (session.itemIds.length === 0) {
      const snapshot = session.anchor === "summary"
        ? {
            ...captureWorkingSnapshot(),
            rows: cloneRows(session.baseRows),
          }
        : null;
      interactionSession.value = null;
      if (snapshot) {
        pushLocalHistoryEntry(snapshot);
      }
      return;
    }

    const affectedRowIds = new Set(
      workingItems.value
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => item.rowId),
    );
    lanePreferenceByItemId.value = {
      ...lanePreferenceByItemId.value,
      ...Object.fromEntries(
        (shellLayout.value?.bars ?? [])
          .filter((bar) => affectedRowIds.has(bar.rowId))
          .map((bar) => [bar.itemId, bar.laneIndex]),
      ),
    };

    interactionSession.value = null;

    const baseItems = session.baseItems;
    const nextItems = workingItems.value.map((item) => ({ ...item }));
    const baseWorkConnections = session.baseWorkConnections;
    const nextWorkConnections = workingWorkConnections.value.map((workConnection) => ({
      ...workConnection,
    }));
    const snapshot = {
      ...captureWorkingSnapshot(),
      rows: cloneRows(session.baseRows),
      items: cloneItems(baseItems),
      workConnections: cloneWorkConnections(baseWorkConnections),
    };

    const didSave = await runScheduleMutation(
      async () => {
        const changedWorkConnections = await persistWorkConnectionGapChanges(
          baseWorkConnections,
          nextWorkConnections,
        );
        await persistItemDateAndLayoutChanges(
          baseItems,
          nextItems,
          session.itemIds,
          changedWorkConnections,
          nextWorkConnections,
        );
      },
      "작업 변경사항을 저장하지 못했습니다.",
      {
        rollback: () => {
          workingRows.value = cloneRows(session.baseRows);
          workingItems.value = cloneItems(baseItems);
          workingWorkConnections.value = cloneWorkConnections(baseWorkConnections);
        },
      },
    );

    if (didSave) {
      syncLoadedDataFromWorkingItemsAndConnections(nextItems, nextWorkConnections);
      pushLocalHistoryEntry(snapshot);
    }
  }

  function startResizeSession(
    payload:
      | { kind: "item"; itemId: string; edge: "left" | "right" }
      | { kind: "summary"; rowId: string; edge: "left" | "right" },
  ) {
    if (payload.kind === "summary") {
      clearSelection();
      interactionSession.value = {
        type: "resize",
        target: "summary",
        rowId: payload.rowId,
        edge: payload.edge,
        baseRows: workingRows.value.map((row) => ({ ...row })),
      };
      return;
    }

    selectBars({
      itemIds: [payload.itemId],
      rowIds: [],
    });
    interactionSession.value = {
      type: "resize",
      target: "item",
      itemId: payload.itemId,
      edge: payload.edge,
      baseItems: workingItems.value.map((item) => ({ ...item })),
      baseWorkConnections: workingWorkConnections.value.map((workConnection) => ({
        ...workConnection,
      })),
      blockedAlertShown: false,
    };
  }

  function previewResizeSession(payload: { deltaDays: number }) {
    const session = interactionSession.value;
    if (!session || session.type !== "resize") {
      return;
    }

    if (session.target === "summary") {
      workingRows.value = desktopScheduleService.resizeSummaryRow(
        session.baseRows,
        session.rowId,
        session.edge,
        payload.deltaDays,
      );
      return;
    }

    const resizeResult = desktopScheduleService.resizeItemWithWorkConnections(
      session.baseItems,
      session.itemId,
      session.edge,
      payload.deltaDays,
      session.baseWorkConnections,
    );
    workingItems.value = resizeResult.items;
    workingWorkConnections.value = resizeResult.workConnections;

    if (resizeResult.blockedByPredecessorStart) {
      alertWorkConnectionPredecessorLimitOnce(session);
    }
  }

  async function endResizeSession() {
    const session = interactionSession.value;

    if (!session || session.type !== "resize") {
      return;
    }

    interactionSession.value = null;

    if (session.target !== "item") {
      const snapshot = {
        ...captureWorkingSnapshot(),
        rows: cloneRows(session.baseRows),
      };
      pushLocalHistoryEntry(snapshot);
      return;
    }

    const baseItems = session.baseItems;
    const nextItems = workingItems.value.map((item) => ({ ...item }));
    const baseWorkConnections = session.baseWorkConnections;
    const nextWorkConnections = workingWorkConnections.value.map((workConnection) => ({
      ...workConnection,
    }));
    const snapshot = {
      ...captureWorkingSnapshot(),
      items: cloneItems(baseItems),
      workConnections: cloneWorkConnections(baseWorkConnections),
    };

    const didSave = await runScheduleMutation(
      async () => {
        const changedWorkConnections = await persistWorkConnectionGapChanges(
          baseWorkConnections,
          nextWorkConnections,
        );
        await persistItemDateAndLayoutChanges(
          baseItems,
          nextItems,
          [session.itemId],
          changedWorkConnections,
          nextWorkConnections,
        );
      },
      "작업 기간 변경사항을 저장하지 못했습니다.",
      {
        rollback: () => {
          workingItems.value = cloneItems(baseItems);
          workingWorkConnections.value = cloneWorkConnections(baseWorkConnections);
        },
      },
    );

    if (didSave) {
      syncLoadedDataFromWorkingItemsAndConnections(nextItems, nextWorkConnections);
      pushLocalHistoryEntry(snapshot);
    }
  }

  function setDayWidth(nextDayWidth: number, viewportWidth: number) {
    if (nextDayWidth === dayWidth.value) {
      return;
    }

    chartScrollLeft.value = desktopScheduleService.getScrollLeftForZoom(
      timeline.value,
      nextDayWidth,
      chartScrollLeft.value,
      viewportWidth,
    );
    dayWidth.value = nextDayWidth;
    closeContextMenu();
  }

  function zoomIn(viewportWidth: number) {
    if (!canZoomIn.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value + 1]!, viewportWidth);
  }

  function setZoomIndex(nextZoomIndex: number, viewportWidth: number) {
    const clampedZoomIndex = Math.min(Math.max(Math.round(nextZoomIndex), 0), maxZoomIndex.value);
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[clampedZoomIndex]!, viewportWidth);
  }

  function zoomOut(viewportWidth: number) {
    if (!canZoomOut.value) {
      return;
    }
    setDayWidth(DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value - 1]!, viewportWidth);
  }

  return {
    scheduleMeta,
    scheduleLoadStatus,
    scheduleLoadErrorMessage,
    scheduleToast,
    selectionState,
    contextMenuState,
    contextMenuItems,
    colorPaletteState,
    connectionCreationState,
    renamingDivisionId,
    renamingWorkTypeId,
    renamingSubWorkTypeId,
    renamingItemId,
    renamingMilestoneId,
    timeline,
    shellLayout,
    rowPanelWidth,
    workTypeColumnWidth,
    chartScrollTop,
    chartScrollLeft,
    interactionCancelVersion,
    zoomScale,
    currentZoomIndex,
    maxZoomIndex,
    canZoomIn,
    canZoomOut,
    canUndoLocalHistory,
    canRedoLocalHistory,
    loadSchedule,
    clearSelection,
    syncChartScroll,
    setRowPanelWidth,
    setWorkTypeColumnWidth,
    undoLocalHistory,
    redoLocalHistory,
    addParentRow,
    addChildRow,
    toggleRowCollapse,
    createReferenceDivisionSet,
    startDivisionRename,
    commitDivisionRename,
    cancelDivisionRename,
    createReferenceWorkTypeSet,
    startWorkTypeRename,
    commitWorkTypeRename,
    cancelWorkTypeRename,
    startSubWorkTypeRename,
    commitSubWorkTypeRename,
    cancelSubWorkTypeRename,
    reorderReferenceDivisions,
    reorderReferenceWorkTypes,
    selectBars,
    selectRows,
    deleteSelection,
    createItemOnCanvasTarget,
    openItemContextMenu,
    openWorkConnectionContextMenu,
    openMilestoneContextMenu,
    openRowContextMenu,
    openScheduleHeaderContextMenu,
    openCanvasContextMenu,
    executeContextMenuCommand,
    closeContextMenu,
    closeColorPalette,
    applyColorSelection,
    startItemRename,
    commitItemRename,
    cancelItemRename,
    startMilestoneRename,
    commitMilestoneRename,
    cancelMilestoneRename,
    cancelConnectionCreation,
    completeConnectionCreation,
    activateMilestone,
    startMoveSession,
    previewMoveSession,
    endMoveSession,
    startResizeSession,
    previewResizeSession,
    endResizeSession,
    setZoomIndex,
    zoomIn,
    zoomOut,
  };
}

type DesktopScheduleViewModel = ReturnType<typeof createDesktopScheduleViewModel>;

let desktopScheduleViewModel: DesktopScheduleViewModel | null = null;

export function useDesktopScheduleViewModel() {
  desktopScheduleViewModel ??= createDesktopScheduleViewModel();
  return desktopScheduleViewModel;
}
