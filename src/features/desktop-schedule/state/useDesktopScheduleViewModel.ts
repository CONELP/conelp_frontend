import { computed, ref } from "vue";

import {
  desktopScheduleApi,
  findMainScheduleVersion,
  getPastMainScheduleVersions,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import { createDesktopScheduleSnapshotFromApiData } from "@/features/desktop-schedule/api/desktop-schedule.mapper";
import type {
  DesktopScheduleApiLoadState,
  DesktopScheduleBootstrapData,
  DesktopScheduleMilestoneResponse,
  DesktopScheduleMutationResponse,
  DesktopScheduleReferenceHierarchyItem,
  DesktopScheduleVersionId,
  DesktopScheduleVersionResponse,
  DesktopScheduleWorkDepResponse,
  DesktopScheduleWorkResponse,
  DesktopScheduleWorkUpdateItem,
  DesktopScheduleWorkUpdateRequest,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
  DesktopScheduleItem,
  DesktopScheduleMilestone,
  DesktopScheduleRow,
  DesktopScheduleShellLayout,
  DesktopScheduleSnapshot,
  DesktopScheduleTimelineLayout,
  DesktopScheduleVersionPromotionState,
  DesktopScheduleVersionReviewCategory,
  DesktopScheduleVersionReviewCount,
  DesktopScheduleVersionReviewDetail,
  DesktopScheduleVersionReviewState,
  DesktopScheduleVersionReviewSummary,
  DesktopScheduleVersionReviewVisualSummary,
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
  dates: Record<
    string,
    { isHoliday: boolean; isActivated: boolean; holidayName: string | null }
  >;
};

type ScheduleToastState = {
  visible: boolean;
  message: string;
  tone: "neutral" | "warning";
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
    string
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

type DesktopScheduleHistoryDirection = "undo" | "redo";

type DesktopScheduleHistorySyncResult = {
  workIdMap?: Map<number, number>;
  workDepIdMap?: Map<number, number>;
  milestoneIdMap?: Map<number, number>;
};

type DesktopScheduleHistoryIdMap = {
  workIds: Map<number, number>;
  workDepIds: Map<number, number>;
  milestoneIds: Map<number, number>;
};

type ScheduleVersionReviewBaselineCache = {
  versionId: DesktopScheduleVersionId;
  versionName: string;
  snapshot: DesktopScheduleSnapshot;
};

type ScheduleVersionReviewSummaryCache = {
  baselineVersionId: DesktopScheduleVersionId;
  baselineVersionName: string;
  draftVersionId: DesktopScheduleVersionId;
  draftVersionName: string;
  draftFingerprint: string;
  layoutFingerprint: string;
  summary: DesktopScheduleVersionReviewSummary;
};

const DEFAULT_DIVISION_NAME = "분류 (건축공사)";
const DEFAULT_WORK_TYPE_NAME = "공종명 (철콘공사)";
const DEFAULT_SUB_WORK_TYPE_NAME = "세부공종명 (타설)";
const DEFAULT_ROW_PANEL_WIDTH = 220;
const DEFAULT_WORK_TYPE_COLUMN_WIDTH = 110;
const ROW_PANEL_MIN_WIDTH = 180;
const ROW_PANEL_MAX_WIDTH = 520;
const WORK_TYPE_COLUMN_MIN_WIDTH = 72;
const WORK_TYPE_COLUMN_MAX_WIDTH = 240;
const LOCAL_HISTORY_MAX_ENTRIES = 200;
const MAX_DRAFT_SCHEDULE_VERSION_COUNT = 5;
const SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS: Record<
  DesktopScheduleVersionReviewCategory,
  string
> = {
  workAdded: "작업 추가",
  workChanged: "작업 변경",
  workDeleted: "작업 삭제",
  connectionChanged: "작업 연결 변경",
  milestoneChanged: "마일스톤 변경",
};
const DESKTOP_SCHEDULE_UI_PREFERENCES_STORAGE_KEY =
  "conelp.desktopSchedule.uiPreferences.v1";
const LEGACY_DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS = [24, 32, 40, 48, 60, 76, 96] as const;
const DEFAULT_ZOOM_INDEX = Math.max(
  DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.findIndex(
    (level) => level === DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth,
  ),
  0,
);
let optimisticReferenceIdSeed = -1;

type DesktopScheduleUiPreferences = {
  zoomIndex?: number;
  zoomDayWidth?: number;
  rowPanelWidth?: number;
  workTypeColumnWidth?: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampZoomIndex(value: number) {
  return clampNumber(
    Math.round(value),
    0,
    DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1,
  );
}

function getDayWidthForZoomIndex(zoomIndex: number) {
  return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[clampZoomIndex(zoomIndex)]!;
}

function getClosestZoomIndexForDayWidth(dayWidth: number) {
  return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.reduce((closestIndex, level, index, levels) => {
    return Math.abs(level - dayWidth) < Math.abs(levels[closestIndex]! - dayWidth)
      ? index
      : closestIndex;
  }, 0);
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function loadDesktopScheduleUiPreferences(): DesktopScheduleUiPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawPreferences = window.localStorage.getItem(
      DESKTOP_SCHEDULE_UI_PREFERENCES_STORAGE_KEY,
    );

    if (!rawPreferences) {
      return {};
    }

    const parsedPreferences = JSON.parse(rawPreferences) as Record<string, unknown>;
    const zoomIndex = readFiniteNumber(parsedPreferences.zoomIndex);
    const zoomDayWidth = readFiniteNumber(parsedPreferences.zoomDayWidth);
    const rowPanelWidth = readFiniteNumber(parsedPreferences.rowPanelWidth);
    const workTypeColumnWidth = readFiniteNumber(parsedPreferences.workTypeColumnWidth);
    const legacyZoomIndex =
      zoomIndex === null
        ? null
        : clampNumber(
            Math.round(zoomIndex),
            0,
            LEGACY_DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1,
          );
    const resolvedZoomIndex =
      zoomDayWidth === null
        ? legacyZoomIndex === null
          ? undefined
          : getClosestZoomIndexForDayWidth(
              LEGACY_DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[legacyZoomIndex]!,
            )
        : getClosestZoomIndexForDayWidth(zoomDayWidth);
    const resolvedZoomDayWidth =
      resolvedZoomIndex === undefined ? undefined : getDayWidthForZoomIndex(resolvedZoomIndex);

    return {
      zoomIndex: resolvedZoomIndex,
      zoomDayWidth: resolvedZoomDayWidth,
      rowPanelWidth:
        rowPanelWidth === null
          ? undefined
          : clampNumber(Math.round(rowPanelWidth), ROW_PANEL_MIN_WIDTH, ROW_PANEL_MAX_WIDTH),
      workTypeColumnWidth:
        workTypeColumnWidth === null
          ? undefined
          : clampNumber(
              Math.round(workTypeColumnWidth),
              WORK_TYPE_COLUMN_MIN_WIDTH,
              WORK_TYPE_COLUMN_MAX_WIDTH,
            ),
    };
  } catch {
    return {};
  }
}

function createHiddenScheduleToast(): ScheduleToastState {
  return {
    visible: false,
    message: "",
    tone: "neutral",
  };
}

function createClosedScheduleVersionReviewState(): DesktopScheduleVersionReviewState {
  return {
    open: false,
    status: "idle",
    summary: null,
    errorMessage: null,
  };
}

function createClosedScheduleVersionPromotionState(): DesktopScheduleVersionPromotionState {
  return {
    open: false,
    status: "idle",
    baselineVersionName: null,
    draftVersionName: null,
    summary: null,
    errorMessage: null,
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
          holidayName: date.holidayName,
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

function sortScheduleVersionsForWorkflow(
  versions: DesktopScheduleVersionResponse[],
): DesktopScheduleVersionResponse[] {
  const currentMain = findMainScheduleVersion(versions);
  return [...versions].sort((a, b) => {
    const aIsCurrent = currentMain ? a.id === currentMain.id : false;
    const bIsCurrent = currentMain ? b.id === currentMain.id : false;
    if (aIsCurrent !== bIsCurrent) {
      return aIsCurrent ? -1 : 1;
    }

    if (a.isMain !== b.isMain) {
      return a.isMain ? -1 : 1;
    }

    return a.id - b.id;
  });
}

function formatDraftVersionDatePrefix(date = new Date()) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "00";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}${month}${day}`;
}

function createSuggestedDraftVersionName(versions: DesktopScheduleVersionResponse[]) {
  const prefix = `${formatDraftVersionDatePrefix()}_작업본`;
  const versionNameSet = new Set(versions.map((version) => version.versionName));
  let draftNumber = 1;

  while (versionNameSet.has(`${prefix}${draftNumber}`)) {
    draftNumber += 1;
  }

  return `${prefix}${draftNumber}`;
}

function cloneWorkHierarchyItem(
  item: DesktopScheduleReferenceHierarchyItem,
): DesktopScheduleReferenceHierarchyItem {
  return { ...item };
}

function getWorkHierarchyItemHistoryKey(item: DesktopScheduleReferenceHierarchyItem) {
  if (item.subWorkTypeId !== 0) {
    return `sub-work-type:${item.subWorkTypeId}`;
  }

  if (item.workTypeId !== 0) {
    return `work-type:${item.workTypeId}`;
  }

  return `division:${item.divisionId}`;
}

function cloneWorkResponse(work: DesktopScheduleWorkResponse): DesktopScheduleWorkResponse {
  return {
    ...work,
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

function createScheduleVersionReviewDraftFingerprint(
  draftSnapshot: Pick<DesktopScheduleSnapshot, "items" | "workConnections" | "milestones">,
) {
  return JSON.stringify({
    items: draftSnapshot.items
      .map((item) => ({
        id: item.id,
        workId: item.workId,
        rowId: item.rowId,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        durationDays: item.durationDays,
        positionY: item.positionY,
        colorHex: item.colorHex ?? null,
        appearance: item.appearance,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    workConnections: draftSnapshot.workConnections
      .map((connection) => ({
        id: connection.id,
        pathId: connection.pathId,
        sourceItemId: connection.sourceItemId,
        targetItemId: connection.targetItemId,
        gapDays: connection.gapDays,
        color: connection.color,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    milestones: draftSnapshot.milestones
      .map((milestone) => ({
        id: milestone.id,
        apiId: milestone.apiId ?? null,
        date: milestone.date,
        label: milestone.label,
        rowId: milestone.rowId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

function createScheduleVersionReviewLayoutFingerprint(
  rows: DesktopScheduleRow[],
  timeline: DesktopScheduleTimelineLayout,
  options: {
    rowHeight: number;
    barHeight: number;
    preferredLaneByItemId: Readonly<Record<string, number>>;
  },
) {
  return JSON.stringify({
    timeline: {
      startDate: timeline.startDate,
      endDate: timeline.endDate,
      dayWidth: timeline.dayWidth,
    },
    rowHeight: options.rowHeight,
    barHeight: options.barHeight,
    preferredLaneByItemId: Object.entries(options.preferredLaneByItemId).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    rows: rows
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        parentId: row.parentId,
        name: row.name,
        colorHex: row.colorHex ?? null,
        order: row.order,
        collapsed: row.collapsed,
        source: {
          divisionId: row.source.divisionId ?? null,
          workTypeId: row.source.workTypeId ?? null,
          subWorkTypeId: row.source.subWorkTypeId ?? null,
          division: row.source.division ?? null,
          workType: row.source.workType ?? null,
          subWorkType: row.source.subWorkType ?? null,
        },
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
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
    baseItem.durationDays !== nextItem.durationDays
  );
}

function hasWorkConnectionGapChange(
  baseWorkConnection: DesktopScheduleWorkConnection,
  nextWorkConnection: DesktopScheduleWorkConnection,
) {
  return baseWorkConnection.gapDays !== nextWorkConnection.gapDays;
}

type ScheduleVersionReviewWorkPair = {
  baseline: DesktopScheduleItem;
  draft: DesktopScheduleItem;
};

type ScheduleVersionReviewWorkMatch = {
  pairs: ScheduleVersionReviewWorkPair[];
  baselineByDraftWorkId: Map<number, DesktopScheduleItem>;
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>;
  unmatchedBaselineItems: DesktopScheduleItem[];
  unmatchedDraftItems: DesktopScheduleItem[];
};

type ScheduleVersionReviewConnectionEntity = {
  id: string;
  pathId: number;
  sourceWorkId: number;
  targetWorkId: number;
  gapDays: number;
  sourceName: string;
  targetName: string;
};

function createScheduleVersionReviewCounts(
  details: DesktopScheduleVersionReviewDetail[],
): DesktopScheduleVersionReviewCount[] {
  return (Object.keys(SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS) as DesktopScheduleVersionReviewCategory[])
    .map((category) => ({
      category,
      label: SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS[category],
      count: details.filter((detail) => detail.category === category).length,
    }));
}

function createScheduleVersionReviewDetail(
  category: DesktopScheduleVersionReviewCategory,
  id: string,
  kindLabel: string,
  title: string,
  description: string,
): DesktopScheduleVersionReviewDetail {
  return {
    id,
    category,
    kindLabel,
    title,
    description,
  };
}

function createEmptyScheduleVersionReviewVisualSummary(): DesktopScheduleVersionReviewVisualSummary {
  return {
    addedItemIds: [],
    changedItemIds: [],
    addedWorkConnectionIds: [],
    changedWorkConnectionIds: [],
    addedMilestoneIds: [],
    changedMilestoneIds: [],
    baselineBarOverlays: [],
    baselineMilestoneOverlays: [],
    baselineConnectionOverlays: [],
  };
}

function parseReviewWorkId(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function splitReviewEntityPair<TBaseline extends { id: string }, TDraft extends { id: string }>(
  payload: string,
  baselineEntities: TBaseline[],
  draftEntities: TDraft[],
) {
  const draftEntityById = new Map(draftEntities.map((entity) => [entity.id, entity] as const));
  const sortedBaselineEntities = [...baselineEntities].sort((a, b) => b.id.length - a.id.length);

  for (const baselineEntity of sortedBaselineEntities) {
    const prefix = `${baselineEntity.id}:`;

    if (!payload.startsWith(prefix)) {
      continue;
    }

    const draftEntity = draftEntityById.get(payload.slice(prefix.length));

    if (draftEntity) {
      return {
        baseline: baselineEntity,
        draft: draftEntity,
      };
    }
  }

  return null;
}

function createDesktopScheduleVersionReviewVisualSummary(
  details: DesktopScheduleVersionReviewDetail[],
  baselineSnapshot: DesktopScheduleSnapshot,
  draftSnapshot: Pick<DesktopScheduleSnapshot, "items" | "workConnections" | "milestones">,
  baselineLayout: DesktopScheduleShellLayout,
  draftLayout: DesktopScheduleShellLayout,
): DesktopScheduleVersionReviewVisualSummary {
  const visual = createEmptyScheduleVersionReviewVisualSummary();
  const baselineItemByWorkId = new Map(
    baselineSnapshot.items.map((item) => [item.workId, item] as const),
  );
  const draftItemByWorkId = new Map(draftSnapshot.items.map((item) => [item.workId, item] as const));
  const baselineBarByItemId = new Map(
    baselineLayout.bars
      .filter((bar) => bar.kind === "item")
      .map((bar) => [bar.itemId, bar] as const),
  );
  const baselineConnectionById = new Map(
    baselineLayout.connections
      .filter((connection) => connection.kind === "work-connection")
      .map((connection) => [connection.id, connection] as const),
  );
  const baselineMilestoneById = new Map(
    baselineLayout.milestones.map((milestone) => [milestone.id, milestone] as const),
  );
  const draftRowById = new Map(draftLayout.rows.map((row) => [row.id, row] as const));
  const draftTopBarTopByRowId = new Map<string, number>();

  draftLayout.bars.forEach((bar) => {
    if (bar.kind !== "item") {
      return;
    }

    const currentTop = draftTopBarTopByRowId.get(bar.rowId);
    draftTopBarTopByRowId.set(
      bar.rowId,
      currentTop === undefined ? bar.top : Math.min(currentTop, bar.top),
    );
  });

  const draftMilestoneById = new Map(
    draftLayout.milestones.map((milestone) => [milestone.id, milestone] as const),
  );
  const draftMilestoneRow = draftLayout.rows.find((row) => row.kind === "milestone") ?? null;
  const draftTopMilestoneTop = draftLayout.milestones.reduce<number | null>(
    (top, milestone) => (top === null ? milestone.top : Math.min(top, milestone.top)),
    null,
  );
  const pushedBaselineBarOverlayIds = new Set<string>();
  const pushedBaselineConnectionOverlayIds = new Set<string>();
  const pushedBaselineMilestoneOverlayIds = new Set<string>();

  function getTopLaneFallbackOffset(overlayHeight: number) {
    return Math.max((draftLayout.rowHeight - overlayHeight) / 2, 6);
  }

  function getTopAlignedBaselineBarOverlayTop(
    baselineItem: DesktopScheduleItem,
    baselineBar: DesktopScheduleShellLayout["bars"][number],
    draftWorkId?: number,
  ) {
    const draftItem = draftWorkId !== undefined ? draftItemByWorkId.get(draftWorkId) : null;
    const targetRowId = draftItem?.rowId ?? baselineItem.rowId;
    const draftTopBarTop = draftTopBarTopByRowId.get(targetRowId);

    if (draftTopBarTop !== undefined) {
      return draftTopBarTop;
    }

    const draftRow = draftRowById.get(targetRowId);
    if (draftRow) {
      return draftRow.top + getTopLaneFallbackOffset(baselineBar.height);
    }

    return baselineBar.top;
  }

  function getTopAlignedBaselineMilestoneOverlayTop(
    baselineMilestoneLayout: DesktopScheduleShellLayout["milestones"][number],
    draftMilestoneId?: string,
  ) {
    const draftMilestoneLayout =
      draftMilestoneId !== undefined ? draftMilestoneById.get(draftMilestoneId) : null;

    if (draftMilestoneLayout) {
      return draftMilestoneLayout.top;
    }

    if (draftTopMilestoneTop !== null) {
      return draftTopMilestoneTop;
    }

    if (draftMilestoneRow) {
      return draftMilestoneRow.top + getTopLaneFallbackOffset(baselineMilestoneLayout.height);
    }

    return baselineMilestoneLayout.top;
  }

  function pushCurrentItemId(kind: "added" | "changed", workId: number) {
    const draftItem = draftItemByWorkId.get(workId);

    if (!draftItem) {
      return;
    }

    const targetIds = kind === "added" ? visual.addedItemIds : visual.changedItemIds;

    if (!targetIds.includes(draftItem.id)) {
      targetIds.push(draftItem.id);
    }
  }

  function pushBaselineBarOverlay(kind: "changed" | "deleted", workId: number, draftWorkId?: number) {
    const baselineItem = baselineItemByWorkId.get(workId);
    const baselineBar = baselineItem ? baselineBarByItemId.get(baselineItem.id) : null;

    if (!baselineItem || !baselineBar) {
      return;
    }

    const overlayId = `review-bar:${kind}:${baselineItem.id}`;

    if (pushedBaselineBarOverlayIds.has(overlayId)) {
      return;
    }

    pushedBaselineBarOverlayIds.add(overlayId);
    visual.baselineBarOverlays.push({
      id: overlayId,
      changeKind: kind,
      itemId: baselineItem.id,
      name: baselineItem.name,
      colorHex: baselineBar.colorHex,
      left: baselineBar.left,
      top: getTopAlignedBaselineBarOverlayTop(baselineItem, baselineBar, draftWorkId),
      width: baselineBar.width,
      height: baselineBar.height,
    });
  }

  function pushCurrentWorkConnectionId(kind: "added" | "changed", connectionId: string) {
    const targetIds =
      kind === "added" ? visual.addedWorkConnectionIds : visual.changedWorkConnectionIds;

    if (!targetIds.includes(connectionId)) {
      targetIds.push(connectionId);
    }
  }

  function pushBaselineConnectionOverlay(kind: "changed" | "deleted", connectionId: string) {
    const baselineConnection = baselineConnectionById.get(connectionId);

    if (!baselineConnection) {
      return;
    }

    const overlayId = `review-connection:${kind}:${baselineConnection.id}`;

    if (pushedBaselineConnectionOverlayIds.has(overlayId)) {
      return;
    }

    pushedBaselineConnectionOverlayIds.add(overlayId);
    visual.baselineConnectionOverlays.push({
      id: overlayId,
      changeKind: kind,
      connectionId: baselineConnection.id,
      path: baselineConnection.path,
      label: baselineConnection.label,
      labelX: baselineConnection.labelX,
      labelY: baselineConnection.labelY,
    });
  }

  function pushCurrentMilestoneId(kind: "added" | "changed", milestoneId: string) {
    const targetIds = kind === "added" ? visual.addedMilestoneIds : visual.changedMilestoneIds;

    if (!targetIds.includes(milestoneId)) {
      targetIds.push(milestoneId);
    }
  }

  function pushBaselineMilestoneOverlay(
    kind: "changed" | "deleted",
    milestoneId: string,
    draftMilestoneId?: string,
  ) {
    const baselineMilestone = baselineSnapshot.milestones.find(
      (candidate) => candidate.id === milestoneId,
    );
    const baselineMilestoneLayout = baselineMilestoneById.get(milestoneId);

    if (!baselineMilestone || !baselineMilestoneLayout) {
      return;
    }

    const overlayId = `review-milestone:${kind}:${baselineMilestone.id}`;

    if (pushedBaselineMilestoneOverlayIds.has(overlayId)) {
      return;
    }

    pushedBaselineMilestoneOverlayIds.add(overlayId);
    visual.baselineMilestoneOverlays.push({
      id: overlayId,
      changeKind: kind,
      milestoneId: baselineMilestone.id,
      label: baselineMilestone.label,
      left: baselineMilestoneLayout.left,
      top: getTopAlignedBaselineMilestoneOverlayTop(baselineMilestoneLayout, draftMilestoneId),
      width: baselineMilestoneLayout.width,
      height: baselineMilestoneLayout.height,
      labelWidth: baselineMilestoneLayout.labelWidth,
    });
  }

  for (const detail of details) {
    if (detail.id.startsWith("work-added:")) {
      const workId = parseReviewWorkId(detail.id.slice("work-added:".length));
      if (workId !== null) {
        pushCurrentItemId("added", workId);
      }
      continue;
    }

    if (detail.id.startsWith("work-deleted:")) {
      const workId = parseReviewWorkId(detail.id.slice("work-deleted:".length));
      if (workId !== null) {
        pushBaselineBarOverlay("deleted", workId);
      }
      continue;
    }

    if (detail.id.startsWith("work-changed:")) {
      const [baselineWorkIdValue, draftWorkIdValue] = detail.id
        .slice("work-changed:".length)
        .split(":");
      const baselineWorkId = parseReviewWorkId(baselineWorkIdValue ?? "");
      const draftWorkId = parseReviewWorkId(draftWorkIdValue ?? "");

      if (baselineWorkId !== null) {
        pushBaselineBarOverlay(
          "changed",
          baselineWorkId,
          draftWorkId === null ? undefined : draftWorkId,
        );
      }

      if (draftWorkId !== null) {
        pushCurrentItemId("changed", draftWorkId);
      }
      continue;
    }

    if (detail.id.startsWith("connection-added:")) {
      pushCurrentWorkConnectionId("added", detail.id.slice("connection-added:".length));
      continue;
    }

    if (detail.id.startsWith("connection-deleted:")) {
      pushBaselineConnectionOverlay("deleted", detail.id.slice("connection-deleted:".length));
      continue;
    }

    if (detail.id.startsWith("connection-changed:")) {
      const pair = splitReviewEntityPair(
        detail.id.slice("connection-changed:".length),
        baselineSnapshot.workConnections,
        draftSnapshot.workConnections,
      );

      if (pair) {
        pushBaselineConnectionOverlay("changed", pair.baseline.id);
        pushCurrentWorkConnectionId("changed", pair.draft.id);
      }
      continue;
    }

    if (detail.id.startsWith("milestone-added:")) {
      pushCurrentMilestoneId("added", detail.id.slice("milestone-added:".length));
      continue;
    }

    if (detail.id.startsWith("milestone-deleted:")) {
      pushBaselineMilestoneOverlay("deleted", detail.id.slice("milestone-deleted:".length));
      continue;
    }

    if (detail.id.startsWith("milestone-changed:")) {
      const pair = splitReviewEntityPair(
        detail.id.slice("milestone-changed:".length),
        baselineSnapshot.milestones,
        draftSnapshot.milestones,
      );

      if (pair) {
        pushBaselineMilestoneOverlay("changed", pair.baseline.id, pair.draft.id);
        pushCurrentMilestoneId("changed", pair.draft.id);
      }
    }
  }

  return visual;
}

function formatReviewDate(date: string) {
  return date.replace(/-/g, ".");
}

function formatReviewDateRange(item: DesktopScheduleItem) {
  return `${formatReviewDate(item.startDate)} - ${formatReviewDate(item.endDate)}`;
}

function formatReviewGapDays(gapDays: number) {
  return `${gapDays > 0 ? "+" : ""}${gapDays}일`;
}

function getItemProcessLabel(item: DesktopScheduleItem) {
  return [item.workType, item.subWorkType].filter(Boolean).join(" / ") || "공종 미지정";
}

function getItemSignature(item: DesktopScheduleItem, mode: "exact" | "lane" | "nameRow") {
  if (mode === "exact") {
    return [
      item.name,
      item.rowId,
      item.startDate,
      item.endDate,
      item.durationDays,
      item.positionY,
    ].join("|");
  }

  if (mode === "lane") {
    return [item.rowId, item.positionY].join("|");
  }

  return [item.name, item.rowId].join("|");
}

function createUniqueItemSignatureMap(
  items: DesktopScheduleItem[],
  getSignature: (item: DesktopScheduleItem) => string,
) {
  const groupedItems = new Map<string, DesktopScheduleItem[]>();

  for (const item of items) {
    const signature = getSignature(item);
    groupedItems.set(signature, [...(groupedItems.get(signature) ?? []), item]);
  }

  const uniqueItems = new Map<string, DesktopScheduleItem>();

  for (const [signature, signatureItems] of groupedItems.entries()) {
    if (signatureItems.length === 1) {
      uniqueItems.set(signature, signatureItems[0]!);
    }
  }

  return uniqueItems;
}

function createScheduleVersionReviewWorkMatch(
  baselineItems: DesktopScheduleItem[],
  draftItems: DesktopScheduleItem[],
): ScheduleVersionReviewWorkMatch {
  const pairs: ScheduleVersionReviewWorkPair[] = [];
  const pairedBaselineWorkIds = new Set<number>();
  const pairedDraftWorkIds = new Set<number>();
  const baselineByDraftWorkId = new Map<number, DesktopScheduleItem>();
  const draftByBaselineWorkId = new Map<number, DesktopScheduleItem>();

  function pairItems(baseline: DesktopScheduleItem, draft: DesktopScheduleItem) {
    if (pairedBaselineWorkIds.has(baseline.workId) || pairedDraftWorkIds.has(draft.workId)) {
      return;
    }

    pairedBaselineWorkIds.add(baseline.workId);
    pairedDraftWorkIds.add(draft.workId);
    baselineByDraftWorkId.set(draft.workId, baseline);
    draftByBaselineWorkId.set(baseline.workId, draft);
    pairs.push({ baseline, draft });
  }

  const draftItemByWorkId = new Map(draftItems.map((item) => [item.workId, item] as const));

  for (const baselineItem of baselineItems) {
    const draftItem = draftItemByWorkId.get(baselineItem.workId);

    if (draftItem) {
      pairItems(baselineItem, draftItem);
    }
  }

  for (const mode of ["exact", "lane", "nameRow"] as const) {
    const unmatchedBaseline = baselineItems.filter(
      (item) => !pairedBaselineWorkIds.has(item.workId),
    );
    const unmatchedDraft = draftItems.filter((item) => !pairedDraftWorkIds.has(item.workId));
    const baselineBySignature = createUniqueItemSignatureMap(unmatchedBaseline, (item) =>
      getItemSignature(item, mode),
    );
    const draftBySignature = createUniqueItemSignatureMap(unmatchedDraft, (item) =>
      getItemSignature(item, mode),
    );

    for (const [signature, baselineItem] of baselineBySignature.entries()) {
      const draftItem = draftBySignature.get(signature);

      if (draftItem) {
        pairItems(baselineItem, draftItem);
      }
    }
  }

  return {
    pairs,
    baselineByDraftWorkId,
    draftByBaselineWorkId,
    unmatchedBaselineItems: baselineItems.filter(
      (item) => !pairedBaselineWorkIds.has(item.workId),
    ),
    unmatchedDraftItems: draftItems.filter((item) => !pairedDraftWorkIds.has(item.workId)),
  };
}

function createWorkChangeDescription(
  baseline: DesktopScheduleItem,
  draft: DesktopScheduleItem,
) {
  const changes: string[] = [];

  if (baseline.name !== draft.name) {
    changes.push(`이름: ${baseline.name} -> ${draft.name}`);
  }

  if (
    baseline.startDate !== draft.startDate ||
    baseline.endDate !== draft.endDate ||
    baseline.durationDays !== draft.durationDays
  ) {
    changes.push(`날짜/기간: ${formatReviewDateRange(baseline)} -> ${formatReviewDateRange(draft)}`);
  }

  if (baseline.rowId !== draft.rowId || baseline.subWorkType !== draft.subWorkType) {
    changes.push(`row 이동: ${getItemProcessLabel(baseline)} -> ${getItemProcessLabel(draft)}`);
  }

  if (baseline.positionY !== draft.positionY) {
    changes.push(`줄 위치: ${baseline.positionY + 1} -> ${draft.positionY + 1}`);
  }

  return changes;
}

function getWorkChangeKindLabel(baseline: DesktopScheduleItem, draft: DesktopScheduleItem) {
  if (baseline.rowId !== draft.rowId || baseline.subWorkType !== draft.subWorkType) {
    return "row 이동";
  }

  if (
    baseline.startDate !== draft.startDate ||
    baseline.endDate !== draft.endDate ||
    baseline.durationDays !== draft.durationDays
  ) {
    return "날짜/기간";
  }

  if (baseline.name !== draft.name) {
    return "이름 변경";
  }

  return "줄 변경";
}

function createConnectionEntity(
  connection: DesktopScheduleWorkConnection,
  itemById: Map<string, DesktopScheduleItem>,
): ScheduleVersionReviewConnectionEntity | null {
  const sourceItem = itemById.get(connection.sourceItemId);
  const targetItem = itemById.get(connection.targetItemId);

  if (!sourceItem || !targetItem) {
    return null;
  }

  return {
    id: connection.id,
    pathId: connection.pathId,
    sourceWorkId: sourceItem.workId,
    targetWorkId: targetItem.workId,
    gapDays: connection.gapDays,
    sourceName: sourceItem.name,
    targetName: targetItem.name,
  };
}

function createConnectionTitle(connection: ScheduleVersionReviewConnectionEntity) {
  return `${connection.sourceName} -> ${connection.targetName}`;
}

function createConnectionChangeDescription(
  baseline: ScheduleVersionReviewConnectionEntity,
  draft: ScheduleVersionReviewConnectionEntity,
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>,
) {
  const changes: string[] = [];
  const expectedDraftSourceWorkId =
    draftByBaselineWorkId.get(baseline.sourceWorkId)?.workId ?? baseline.sourceWorkId;
  const expectedDraftTargetWorkId =
    draftByBaselineWorkId.get(baseline.targetWorkId)?.workId ?? baseline.targetWorkId;

  if (expectedDraftSourceWorkId !== draft.sourceWorkId) {
    changes.push(`선행: ${baseline.sourceName} -> ${draft.sourceName}`);
  }

  if (expectedDraftTargetWorkId !== draft.targetWorkId) {
    changes.push(`후행: ${baseline.targetName} -> ${draft.targetName}`);
  }

  if (baseline.gapDays !== draft.gapDays) {
    changes.push(`간격: ${formatReviewGapDays(baseline.gapDays)} -> ${formatReviewGapDays(draft.gapDays)}`);
  }

  return changes;
}

function getConnectionChangeKindLabel(
  baseline: ScheduleVersionReviewConnectionEntity,
  draft: ScheduleVersionReviewConnectionEntity,
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>,
) {
  const expectedDraftSourceWorkId =
    draftByBaselineWorkId.get(baseline.sourceWorkId)?.workId ?? baseline.sourceWorkId;
  const expectedDraftTargetWorkId =
    draftByBaselineWorkId.get(baseline.targetWorkId)?.workId ?? baseline.targetWorkId;

  if (
    expectedDraftSourceWorkId !== draft.sourceWorkId ||
    expectedDraftTargetWorkId !== draft.targetWorkId
  ) {
    return "선후행 변경";
  }

  return "간격 변경";
}

function createConnectionComparisonKey(
  connection: ScheduleVersionReviewConnectionEntity,
  getWorkKey: (workId: number) => string,
) {
  return `${getWorkKey(connection.sourceWorkId)}->${getWorkKey(connection.targetWorkId)}`;
}

function createMilestoneChangeDescription(
  baseline: DesktopScheduleMilestone,
  draft: DesktopScheduleMilestone,
) {
  const changes: string[] = [];

  if (baseline.label !== draft.label) {
    changes.push(`이름: ${baseline.label} -> ${draft.label}`);
  }

  if (baseline.date !== draft.date) {
    changes.push(`날짜: ${formatReviewDate(baseline.date)} -> ${formatReviewDate(draft.date)}`);
  }

  return changes;
}

function getMilestoneChangeKindLabel(
  baseline: DesktopScheduleMilestone,
  draft: DesktopScheduleMilestone,
) {
  if (baseline.date !== draft.date && baseline.label === draft.label) {
    return "이동";
  }

  if (baseline.label !== draft.label && baseline.date === draft.date) {
    return "이름 변경";
  }

  return "변경";
}

function createDesktopScheduleVersionReviewSummary(
  baselineSnapshot: DesktopScheduleSnapshot,
  draftSnapshot: {
    items: DesktopScheduleItem[];
    workConnections: DesktopScheduleWorkConnection[];
    milestones: DesktopScheduleMilestone[];
  },
  baselineVersionName: string,
  draftVersionName: string,
): DesktopScheduleVersionReviewSummary {
  const details: DesktopScheduleVersionReviewDetail[] = [];
  const workMatch = createScheduleVersionReviewWorkMatch(
    baselineSnapshot.items,
    draftSnapshot.items,
  );

  for (const item of workMatch.unmatchedDraftItems) {
    details.push(
      createScheduleVersionReviewDetail(
        "workAdded",
        `work-added:${item.workId}`,
        "생성",
        item.name,
        `${getItemProcessLabel(item)} · ${formatReviewDateRange(item)}`,
      ),
    );
  }

  for (const item of workMatch.unmatchedBaselineItems) {
    details.push(
      createScheduleVersionReviewDetail(
        "workDeleted",
        `work-deleted:${item.workId}`,
        "삭제",
        item.name,
        `${getItemProcessLabel(item)} · ${formatReviewDateRange(item)}`,
      ),
    );
  }

  for (const { baseline, draft } of workMatch.pairs) {
    const changes = createWorkChangeDescription(baseline, draft);

    if (changes.length > 0) {
      details.push(
        createScheduleVersionReviewDetail(
          "workChanged",
          `work-changed:${baseline.workId}:${draft.workId}`,
          getWorkChangeKindLabel(baseline, draft),
          draft.name,
          changes.join(" · "),
        ),
      );
    }
  }

  const baselineItemById = new Map(baselineSnapshot.items.map((item) => [item.id, item] as const));
  const draftItemById = new Map(draftSnapshot.items.map((item) => [item.id, item] as const));
  const baselineConnections = baselineSnapshot.workConnections
    .map((connection) => createConnectionEntity(connection, baselineItemById))
    .filter(
      (connection): connection is ScheduleVersionReviewConnectionEntity => connection !== null,
    );
  const draftConnections = draftSnapshot.workConnections
    .map((connection) => createConnectionEntity(connection, draftItemById))
    .filter(
      (connection): connection is ScheduleVersionReviewConnectionEntity => connection !== null,
    );
  const pairedBaselineConnectionIds = new Set<string>();
  const pairedDraftConnectionIds = new Set<string>();
  const draftConnectionByPathId = new Map(
    draftConnections.map((connection) => [connection.pathId, connection] as const),
  );

  function addConnectionChangeDetail(
    baselineConnection: ScheduleVersionReviewConnectionEntity,
    draftConnection: ScheduleVersionReviewConnectionEntity,
  ) {
    const changes = createConnectionChangeDescription(
      baselineConnection,
      draftConnection,
      workMatch.draftByBaselineWorkId,
    );

    if (changes.length === 0) {
      return;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-changed:${baselineConnection.id}:${draftConnection.id}`,
        getConnectionChangeKindLabel(
          baselineConnection,
          draftConnection,
          workMatch.draftByBaselineWorkId,
        ),
        createConnectionTitle(draftConnection),
        changes.join(" · "),
      ),
    );
  }

  for (const baselineConnection of baselineConnections) {
    const draftConnection = draftConnectionByPathId.get(baselineConnection.pathId);

    if (!draftConnection) {
      continue;
    }

    pairedBaselineConnectionIds.add(baselineConnection.id);
    pairedDraftConnectionIds.add(draftConnection.id);
    addConnectionChangeDetail(baselineConnection, draftConnection);
  }

  const baselineConnectionByKey = new Map<string, ScheduleVersionReviewConnectionEntity>();
  const draftConnectionByKey = new Map<string, ScheduleVersionReviewConnectionEntity>();

  for (const baselineConnection of baselineConnections) {
    if (pairedBaselineConnectionIds.has(baselineConnection.id)) {
      continue;
    }

    baselineConnectionByKey.set(
      createConnectionComparisonKey(baselineConnection, (workId) => {
        const draftItem = workMatch.draftByBaselineWorkId.get(workId);
        return draftItem ? `draft:${draftItem.workId}` : `baseline:${workId}`;
      }),
      baselineConnection,
    );
  }

  for (const draftConnection of draftConnections) {
    if (pairedDraftConnectionIds.has(draftConnection.id)) {
      continue;
    }

    draftConnectionByKey.set(
      createConnectionComparisonKey(draftConnection, (workId) => `draft:${workId}`),
      draftConnection,
    );
  }

  for (const [key, baselineConnection] of baselineConnectionByKey.entries()) {
    const draftConnection = draftConnectionByKey.get(key);

    if (!draftConnection) {
      continue;
    }

    pairedBaselineConnectionIds.add(baselineConnection.id);
    pairedDraftConnectionIds.add(draftConnection.id);
    addConnectionChangeDetail(baselineConnection, draftConnection);
  }

  for (const draftConnection of draftConnections) {
    if (pairedDraftConnectionIds.has(draftConnection.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-added:${draftConnection.id}`,
        "생성",
        createConnectionTitle(draftConnection),
        `간격 ${formatReviewGapDays(draftConnection.gapDays)} 작업 연결이 추가됐어요.`,
      ),
    );
  }

  for (const baselineConnection of baselineConnections) {
    if (pairedBaselineConnectionIds.has(baselineConnection.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-deleted:${baselineConnection.id}`,
        "삭제",
        createConnectionTitle(baselineConnection),
        `간격 ${formatReviewGapDays(baselineConnection.gapDays)} 작업 연결이 삭제됐어요.`,
      ),
    );
  }

  const draftMilestoneByApiId = new Map(
    draftSnapshot.milestones
      .filter((milestone) => typeof milestone.apiId === "number")
      .map((milestone) => [milestone.apiId!, milestone] as const),
  );
  const pairedBaselineMilestoneIds = new Set<string>();
  const pairedDraftMilestoneIds = new Set<string>();

  for (const baselineMilestone of baselineSnapshot.milestones) {
    const draftMilestone =
      typeof baselineMilestone.apiId === "number"
        ? draftMilestoneByApiId.get(baselineMilestone.apiId)
        : undefined;

    if (!draftMilestone) {
      continue;
    }

    pairedBaselineMilestoneIds.add(baselineMilestone.id);
    pairedDraftMilestoneIds.add(draftMilestone.id);
    const changes = createMilestoneChangeDescription(baselineMilestone, draftMilestone);

    if (changes.length > 0) {
      details.push(
        createScheduleVersionReviewDetail(
          "milestoneChanged",
          `milestone-changed:${baselineMilestone.id}:${draftMilestone.id}`,
          getMilestoneChangeKindLabel(baselineMilestone, draftMilestone),
          draftMilestone.label,
          changes.join(" · "),
        ),
      );
    }
  }

  for (const draftMilestone of draftSnapshot.milestones) {
    if (pairedDraftMilestoneIds.has(draftMilestone.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "milestoneChanged",
        `milestone-added:${draftMilestone.id}`,
        "생성",
        draftMilestone.label,
        `${formatReviewDate(draftMilestone.date)} 마일스톤이 추가됐어요.`,
      ),
    );
  }

  for (const baselineMilestone of baselineSnapshot.milestones) {
    if (pairedBaselineMilestoneIds.has(baselineMilestone.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "milestoneChanged",
        `milestone-deleted:${baselineMilestone.id}`,
        "삭제",
        baselineMilestone.label,
        `${formatReviewDate(baselineMilestone.date)} 마일스톤이 삭제됐어요.`,
      ),
    );
  }

  const counts = createScheduleVersionReviewCounts(details);

  return {
    baselineVersionName,
    draftVersionName,
    generatedAt: new Date().toISOString(),
    totalCount: details.length,
    counts,
    details,
  };
}

function createDesktopScheduleViewModel() {
  const storedUiPreferences = loadDesktopScheduleUiPreferences();
  let currentUiPreferences: DesktopScheduleUiPreferences = { ...storedUiPreferences };
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
  const dayWidth = ref<number>(
    getDayWidthForZoomIndex(storedUiPreferences.zoomIndex ?? DEFAULT_ZOOM_INDEX),
  );
  const rowPanelWidth = ref(storedUiPreferences.rowPanelWidth ?? DEFAULT_ROW_PANEL_WIDTH);
  const workTypeColumnWidth = ref(
    storedUiPreferences.workTypeColumnWidth ?? DEFAULT_WORK_TYPE_COLUMN_WIDTH,
  );
  const chartScrollTop = ref(0);
  const chartScrollLeft = ref(0);
  const localHistoryUndoStack = ref<DesktopScheduleLocalHistoryEntry[]>([]);
  const localHistoryRedoStack = ref<DesktopScheduleLocalHistoryEntry[]>([]);
  const isLocalHistorySyncInFlight = ref(false);
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
  const scheduleVersionReviewState = ref<DesktopScheduleVersionReviewState>(
    createClosedScheduleVersionReviewState(),
  );
  const scheduleVersionPromotionState = ref<DesktopScheduleVersionPromotionState>(
    createClosedScheduleVersionPromotionState(),
  );
  const excludedScheduleVersionIds = ref<Set<DesktopScheduleVersionId>>(new Set());
  const scheduleVersionReviewBaselineCache = ref<ScheduleVersionReviewBaselineCache | null>(null);
  const scheduleVersionReviewSummaryCache = ref<ScheduleVersionReviewSummaryCache | null>(null);
  let scheduleToastTimer: number | null = null;
  let scheduleVersionPromotionRequestId = 0;

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
    return Math.min(Math.max(rawScale, 0.5), 1.46);
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
      includeProgressLines: selectedScheduleVersion.value?.isMain === true,
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
  const selectedScheduleVersion = computed(
    () => scheduleLoadState.value.data?.selectedScheduleVersion ?? null,
  );
  const selectedScheduleVersionId = computed(() => selectedScheduleVersion.value?.id ?? null);
  const scheduleVersions = computed(() =>
    sortScheduleVersionsForWorkflow(
      (scheduleLoadState.value.data?.scheduleVersions ?? []).filter(
        (version) => version.isMain || !excludedScheduleVersionIds.value.has(version.id),
      ),
    ),
  );
  const draftScheduleVersionCount = computed(
    () => scheduleVersions.value.filter((version) => !version.isMain).length,
  );
  const currentMainScheduleVersion = computed(
    () => findMainScheduleVersion(scheduleVersions.value),
  );
  const pastMainScheduleVersions = computed(() =>
    getPastMainScheduleVersions(scheduleVersions.value),
  );
  const isScheduleReadOnly = computed(() => selectedScheduleVersion.value?.isMain === true);
  const scheduleVersionDisplayName = computed(
    () => selectedScheduleVersion.value?.versionName ?? "공정표",
  );
  const scheduleVersionModeLabel = computed(() =>
    isScheduleReadOnly.value ? "기준 공정표" : "작업본",
  );
  const scheduleVersionAccessLabel = computed(() =>
    isScheduleReadOnly.value ? "읽기 전용" : "수정 가능",
  );
  const suggestedDraftVersionName = computed(() =>
    createSuggestedDraftVersionName(scheduleVersions.value),
  );
  const canCreateDraftVersion = computed(
    () =>
      selectedScheduleVersion.value !== null &&
      draftScheduleVersionCount.value < MAX_DRAFT_SCHEDULE_VERSION_COUNT,
  );
  const canCompareScheduleVersion = computed(
    () =>
      selectedScheduleVersion.value !== null &&
      selectedScheduleVersion.value.isMain === false &&
      scheduleVersions.value.some((version) => version.isMain),
  );
  const canPromoteScheduleVersion = computed(
    () =>
      selectedScheduleVersion.value !== null &&
      selectedScheduleVersion.value.isMain === false,
  );
  const scheduleLoadStatus = computed(() => scheduleLoadState.value.status);
  const scheduleLoadErrorMessage = computed(
    () => scheduleLoadState.value.error?.message ?? "공정표 데이터를 불러오지 못했습니다.",
  );
  const canUndoLocalHistory = computed(
    () => !isLocalHistorySyncInFlight.value && localHistoryUndoStack.value.length > 0,
  );
  const canRedoLocalHistory = computed(
    () => !isLocalHistorySyncInFlight.value && localHistoryRedoStack.value.length > 0,
  );

  function closeContextMenu() {
    contextMenuState.value = createClosedDesktopScheduleContextMenuState();
  }

  function closeColorPalette() {
    colorPaletteState.value = createClosedColorPaletteState();
  }

  function writeUiPreferencesToStorage() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        DESKTOP_SCHEDULE_UI_PREFERENCES_STORAGE_KEY,
        JSON.stringify(currentUiPreferences),
      );
    } catch {
      // Preferences are a convenience layer; storage failures should not block schedule editing.
    }
  }

  function persistUiPreferences(patch: DesktopScheduleUiPreferences) {
    currentUiPreferences = {
      ...currentUiPreferences,
      ...patch,
    };

    writeUiPreferencesToStorage();
  }

  function showScheduleToast(
    message: string,
    tone: ScheduleToastState["tone"] = "neutral",
  ) {
    scheduleToast.value = {
      visible: true,
      message,
      tone,
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

  function notifyReadOnlyScheduleAction() {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    interactionSession.value = null;
    interactionCancelVersion.value += 1;
    connectionCreationState.value = null;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
    closeColorPalette();
    showScheduleToast(
      "기준 공정표는 직접 수정할 수 없어요. 작업본을 만들어 수정해 주세요.",
      "warning",
    );
  }

  function ensureScheduleEditable() {
    if (!isScheduleReadOnly.value) {
      return true;
    }

    notifyReadOnlyScheduleAction();
    return false;
  }

  function syncChartScroll(position: { left: number; top: number }) {
    chartScrollLeft.value = position.left;
    chartScrollTop.value = position.top;
    closeContextMenu();
    closeColorPalette();
  }

  function setRowPanelWidth(nextWidth: number) {
    const clampedWidth = clampNumber(
      Math.round(nextWidth),
      ROW_PANEL_MIN_WIDTH,
      ROW_PANEL_MAX_WIDTH,
    );
    rowPanelWidth.value = clampedWidth;
    persistUiPreferences({ rowPanelWidth: clampedWidth });
    closeContextMenu();
    closeColorPalette();
  }

  function setWorkTypeColumnWidth(nextWidth: number) {
    const clampedWidth = clampNumber(
      Math.round(nextWidth),
      WORK_TYPE_COLUMN_MIN_WIDTH,
      WORK_TYPE_COLUMN_MAX_WIDTH,
    );
    workTypeColumnWidth.value = clampedWidth;
    persistUiPreferences({ workTypeColumnWidth: clampedWidth });
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
        getWorkHierarchyItemHistoryKey,
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
        getWorkHierarchyItemHistoryKey,
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
    direction: DesktopScheduleHistoryDirection,
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

  function getHistoryChangeTarget<TEntity, TKey extends string | number>(
    change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
    direction: DesktopScheduleHistoryDirection,
  ) {
    return direction === "undo" ? change.before : change.after;
  }

  function getHistoryChangeSource<TEntity, TKey extends string | number>(
    change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
    direction: DesktopScheduleHistoryDirection,
  ) {
    return direction === "undo" ? change.after : change.before;
  }

  function remapIdValue(value: number, idMap: Map<number, number>) {
    return idMap.get(value) ?? value;
  }

  function remapStringId(value: string, prefix: string, idMap: Map<number, number>) {
    const rawId = value.startsWith(prefix) ? value.slice(prefix.length) : "";
    const numericId = Number(rawId);

    if (!Number.isFinite(numericId)) {
      return value;
    }

    const nextId = idMap.get(numericId);
    return nextId === undefined ? value : `${prefix}${nextId}`;
  }

  function remapItemId(value: string, idMap: Map<number, number>) {
    return remapStringId(value, "item:", idMap);
  }

  function remapWorkConnectionId(value: string, idMap: Map<number, number>) {
    return remapStringId(value, "work-connection:", idMap);
  }

  function remapMilestoneModelId(value: string, idMap: Map<number, number>) {
    return remapStringId(value, "milestone:", idMap);
  }

  function remapHistoryEntityChange<TEntity, TKey extends string | number>(
    change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
    mapEntity: (entity: TEntity) => TEntity,
    mapKey: (key: TKey) => TKey,
  ): DesktopScheduleHistoryEntityChange<TEntity, TKey> {
    return {
      key: mapKey(change.key),
      before: change.before ? mapEntity(change.before) : null,
      after: change.after ? mapEntity(change.after) : null,
    };
  }

  function remapHistoryCollectionPatch<TEntity, TKey extends string | number>(
    patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
    mapEntity: (entity: TEntity) => TEntity,
    mapKey: (key: TKey) => TKey,
  ): DesktopScheduleHistoryCollectionPatch<TEntity, TKey> {
    return {
      changes: patch.changes.map((change) => remapHistoryEntityChange(change, mapEntity, mapKey)),
      beforeOrder: patch.beforeOrder.map(mapKey),
      afterOrder: patch.afterOrder.map(mapKey),
    };
  }

  function remapHistoryWorkResponse(
    work: DesktopScheduleWorkResponse,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleWorkResponse {
    return {
      ...work,
      workId: remapIdValue(work.workId, idMap.workIds),
    };
  }

  function remapHistoryWorkDepResponse(
    workDep: DesktopScheduleWorkDepResponse,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleWorkDepResponse {
    return {
      ...workDep,
      id: remapIdValue(workDep.id, idMap.workDepIds),
      sourceWorkId: remapIdValue(workDep.sourceWorkId, idMap.workIds),
      targetWorkId: remapIdValue(workDep.targetWorkId, idMap.workIds),
    };
  }

  function remapHistoryMilestoneResponse(
    milestone: DesktopScheduleMilestoneResponse,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleMilestoneResponse {
    return {
      ...milestone,
      id: remapIdValue(milestone.id, idMap.milestoneIds),
    };
  }

  function remapHistoryItem(
    item: DesktopScheduleItem,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleItem {
    return {
      ...item,
      id: remapItemId(item.id, idMap.workIds),
      workId: remapIdValue(item.workId, idMap.workIds),
    };
  }

  function remapHistoryWorkConnection(
    workConnection: DesktopScheduleWorkConnection,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleWorkConnection {
    return {
      ...workConnection,
      id: remapWorkConnectionId(workConnection.id, idMap.workDepIds),
      pathId: remapIdValue(workConnection.pathId, idMap.workDepIds),
      sourceItemId: remapItemId(workConnection.sourceItemId, idMap.workIds),
      targetItemId: remapItemId(workConnection.targetItemId, idMap.workIds),
    };
  }

  function remapHistoryMilestone(
    milestone: DesktopScheduleMilestone,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleMilestone {
    const apiId =
      typeof milestone.apiId === "number"
        ? remapIdValue(milestone.apiId, idMap.milestoneIds)
        : milestone.apiId;

    return {
      ...milestone,
      id: remapMilestoneModelId(milestone.id, idMap.milestoneIds),
      apiId,
    };
  }

  function remapLoadedDataHistoryPatch(
    patch: DesktopScheduleLoadedDataHistoryPatch | null,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleLoadedDataHistoryPatch | null {
    if (!patch) {
      return null;
    }

    return {
      ...patch,
      works: remapHistoryCollectionPatch(
        patch.works,
        (work) => remapHistoryWorkResponse(work, idMap),
        (workId) => remapIdValue(workId, idMap.workIds),
      ),
      workDeps: remapHistoryCollectionPatch(
        patch.workDeps,
        (workDep) => remapHistoryWorkDepResponse(workDep, idMap),
        (workDepId) => remapIdValue(workDepId, idMap.workDepIds),
      ),
      milestones: remapHistoryCollectionPatch(
        patch.milestones,
        (milestone) => remapHistoryMilestoneResponse(milestone, idMap),
        (milestoneId) => remapIdValue(milestoneId, idMap.milestoneIds),
      ),
    };
  }

  function remapLocalHistoryEntry(
    entry: DesktopScheduleLocalHistoryEntry,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleLocalHistoryEntry {
    return {
      ...entry,
      items: remapHistoryCollectionPatch(
        entry.items,
        (item) => remapHistoryItem(item, idMap),
        (itemId) => remapItemId(itemId, idMap.workIds),
      ),
      workConnections: remapHistoryCollectionPatch(
        entry.workConnections,
        (workConnection) => remapHistoryWorkConnection(workConnection, idMap),
        (workConnectionId) => remapWorkConnectionId(workConnectionId, idMap.workDepIds),
      ),
      milestones: remapHistoryCollectionPatch(
        entry.milestones,
        (milestone) => remapHistoryMilestone(milestone, idMap),
        (milestoneId) => remapMilestoneModelId(milestoneId, idMap.milestoneIds),
      ),
      loadedData: remapLoadedDataHistoryPatch(entry.loadedData, idMap),
    };
  }

  function remapLocalHistoryStacks(idMap: DesktopScheduleHistoryIdMap) {
    if (
      idMap.workIds.size === 0 &&
      idMap.workDepIds.size === 0 &&
      idMap.milestoneIds.size === 0
    ) {
      return;
    }

    localHistoryUndoStack.value = localHistoryUndoStack.value.map((entry) =>
      remapLocalHistoryEntry(entry, idMap),
    );
    localHistoryRedoStack.value = localHistoryRedoStack.value.map((entry) =>
      remapLocalHistoryEntry(entry, idMap),
    );
  }

  function remapCurrentSelectionState(idMap: DesktopScheduleHistoryIdMap) {
    selectionState.value = {
      ...selectionState.value,
      itemIds: selectionState.value.itemIds.map((itemId) => remapItemId(itemId, idMap.workIds)),
      workConnectionIds: selectionState.value.workConnectionIds.map((workConnectionId) =>
        remapWorkConnectionId(workConnectionId, idMap.workDepIds),
      ),
      milestoneIds: selectionState.value.milestoneIds.map((milestoneId) =>
        remapMilestoneModelId(milestoneId, idMap.milestoneIds),
      ),
    };
  }

  function remapLanePreference(idMap: DesktopScheduleHistoryIdMap) {
    const nextLanePreferenceByItemId: Record<string, number> = {};

    Object.entries(lanePreferenceByItemId.value).forEach(([itemId, laneIndex]) => {
      nextLanePreferenceByItemId[remapItemId(itemId, idMap.workIds)] = laneIndex;
    });

    lanePreferenceByItemId.value = nextLanePreferenceByItemId;
  }

  function remapCurrentLoadedData(idMap: DesktopScheduleHistoryIdMap) {
    const currentData = scheduleLoadState.value.data;

    if (!currentData) {
      return;
    }

    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      data: {
        ...currentData,
        works: currentData.works.map((work) => remapHistoryWorkResponse(work, idMap)),
        workDeps: currentData.workDeps.map((workDep) =>
          remapHistoryWorkDepResponse(workDep, idMap),
        ),
        milestones: (currentData.milestones ?? []).map((milestone) =>
          remapHistoryMilestoneResponse(milestone, idMap),
        ),
      },
    };
  }

  function remapCurrentScheduleState(idMap: DesktopScheduleHistoryIdMap) {
    if (
      idMap.workIds.size === 0 &&
      idMap.workDepIds.size === 0 &&
      idMap.milestoneIds.size === 0
    ) {
      return;
    }

    workingItems.value = workingItems.value.map((item) => remapHistoryItem(item, idMap));
    workingWorkConnections.value = workingWorkConnections.value.map((workConnection) =>
      remapHistoryWorkConnection(workConnection, idMap),
    );
    workingMilestones.value = workingMilestones.value.map((milestone) =>
      remapHistoryMilestone(milestone, idMap),
    );
    remapCurrentLoadedData(idMap);
    remapCurrentSelectionState(idMap);
    remapLanePreference(idMap);
    renamingItemId.value = renamingItemId.value
      ? remapItemId(renamingItemId.value, idMap.workIds)
      : null;
    renamingMilestoneId.value = renamingMilestoneId.value
      ? remapMilestoneModelId(renamingMilestoneId.value, idMap.milestoneIds)
      : null;

    if (connectionCreationState.value) {
      connectionCreationState.value = {
        ...connectionCreationState.value,
        sourceItemId: remapItemId(connectionCreationState.value.sourceItemId, idMap.workIds),
      };
    }
  }

  function createWorkUpdateItemFromResponse(
    work: DesktopScheduleWorkResponse,
  ): DesktopScheduleWorkUpdateItem {
    return {
      workId: work.workId,
      workName: work.workName,
      startDate: work.startDate,
      workLeadTime: work.workLeadTime,
      subWorkTypeId: work.subWorkTypeId,
    };
  }

  function getDivisionOrderFromHierarchy(items: DesktopScheduleReferenceHierarchyItem[]) {
    return Array.from(new Set(items.map((item) => item.divisionId)));
  }

  function getWorkTypeOrderByDivisionFromHierarchy(
    items: DesktopScheduleReferenceHierarchyItem[],
  ) {
    const workTypeIdsByDivisionId = new Map<number, number[]>();
    const seenWorkTypeIdsByDivisionId = new Map<number, Set<number>>();

    items.forEach((item) => {
      if (item.workTypeId === 0) {
        return;
      }

      const workTypeIds = workTypeIdsByDivisionId.get(item.divisionId) ?? [];
      const seenWorkTypeIds = seenWorkTypeIdsByDivisionId.get(item.divisionId) ?? new Set<number>();

      if (!seenWorkTypeIds.has(item.workTypeId)) {
        workTypeIds.push(item.workTypeId);
        seenWorkTypeIds.add(item.workTypeId);
      }

      workTypeIdsByDivisionId.set(item.divisionId, workTypeIds);
      seenWorkTypeIdsByDivisionId.set(item.divisionId, seenWorkTypeIds);
    });

    return workTypeIdsByDivisionId;
  }

  async function persistReferenceHistoryPatchToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["workHierarchy"],
    direction: DesktopScheduleHistoryDirection,
  ) {
    const referenceUpdateRequests: Array<Promise<unknown>> = [];
    const updatedDivisionIds = new Set<number>();
    const updatedWorkTypeIds = new Set<number>();
    const updatedSubWorkTypeIds = new Set<number>();

    patch.changes.forEach((change) => {
      const source = getHistoryChangeSource(change, direction);
      const target = getHistoryChangeTarget(change, direction);

      if (!source || !target) {
        return;
      }

      if (
        source.divisionName !== target.divisionName &&
        !updatedDivisionIds.has(target.divisionId)
      ) {
        updatedDivisionIds.add(target.divisionId);
        referenceUpdateRequests.push(
          desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            id: target.divisionId,
            name: target.divisionName,
          }),
        );
      }

      if (
        source.workTypeName !== target.workTypeName &&
        target.workTypeId > 0 &&
        !updatedWorkTypeIds.has(target.workTypeId)
      ) {
        updatedWorkTypeIds.add(target.workTypeId);
        referenceUpdateRequests.push(
          desktopScheduleApi.updateWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            id: target.workTypeId,
            name: target.workTypeName,
          }),
        );
      }

      if (
        (source.subWorkTypeName !== target.subWorkTypeName ||
          source.subWorkTypeColor !== target.subWorkTypeColor) &&
        target.subWorkTypeId > 0 &&
        !updatedSubWorkTypeIds.has(target.subWorkTypeId)
      ) {
        updatedSubWorkTypeIds.add(target.subWorkTypeId);
        referenceUpdateRequests.push(
          desktopScheduleApi.updateSubWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            id: target.subWorkTypeId,
            name: target.subWorkTypeName,
            color: target.subWorkTypeColor,
          }),
        );
      }
    });

    const sourceOrder = direction === "undo" ? patch.afterOrder : patch.beforeOrder;
    const targetOrder = direction === "undo" ? patch.beforeOrder : patch.afterOrder;

    if (JSON.stringify(sourceOrder) !== JSON.stringify(targetOrder)) {
      const targetItems = scheduleLoadState.value.data?.workHierarchy ?? [];
      const sourceItems = applyHistoryCollectionPatch(
        targetItems,
        patch,
        direction === "undo" ? "redo" : "undo",
        getWorkHierarchyItemHistoryKey,
        cloneWorkHierarchyItem,
      );
      const targetDivisionIds = getDivisionOrderFromHierarchy(targetItems);
      const sourceDivisionIds = getDivisionOrderFromHierarchy(sourceItems);

      if (
        targetDivisionIds.length > 1 &&
        JSON.stringify(targetDivisionIds) !== JSON.stringify(sourceDivisionIds)
      ) {
        referenceUpdateRequests.push(desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(), ids: targetDivisionIds }));
      }

      const targetWorkTypeIdsByDivisionId =
        getWorkTypeOrderByDivisionFromHierarchy(targetItems);
      const sourceWorkTypeIdsByDivisionId =
        getWorkTypeOrderByDivisionFromHierarchy(sourceItems);

      targetWorkTypeIdsByDivisionId.forEach((targetWorkTypeIds, divisionId) => {
        if (targetWorkTypeIds.length < 2) {
          return;
        }

        const sourceWorkTypeIds = sourceWorkTypeIdsByDivisionId.get(divisionId) ?? [];

        if (JSON.stringify(targetWorkTypeIds) === JSON.stringify(sourceWorkTypeIds)) {
          return;
        }

        referenceUpdateRequests.push(
          desktopScheduleApi.updateWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            parentId: divisionId,
            ids: targetWorkTypeIds,
          }),
        );
      });
    }

    await Promise.all(referenceUpdateRequests);
  }

  async function persistWorkHistoryPatchToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["works"],
    direction: DesktopScheduleHistoryDirection,
    scheduleVersionId: DesktopScheduleVersionId,
  ): Promise<DesktopScheduleHistorySyncResult> {
    const updateItems: DesktopScheduleWorkUpdateItem[] = [];
    const workIdsToDelete: number[] = [];
    const worksToCreate: DesktopScheduleWorkResponse[] = [];
    const workIdMap = new Map<number, number>();

    patch.changes.forEach((change) => {
      const source = getHistoryChangeSource(change, direction);
      const target = getHistoryChangeTarget(change, direction);

      if (source && target) {
        updateItems.push(createWorkUpdateItemFromResponse(target));
        return;
      }

      if (source && !target) {
        workIdsToDelete.push(source.workId);
        return;
      }

      if (!source && target) {
        worksToCreate.push(target);
      }
    });

    if (workIdsToDelete.length > 0) {
      await Promise.all(workIdsToDelete.map((workId) => desktopScheduleApi.deleteWork(workId)));
    }

    if (updateItems.length > 0) {
      const response = await desktopScheduleApi.updateWork({ items: updateItems });
      applyServerMutationPatch(response);
    }

    for (const work of worksToCreate) {
      const response = await desktopScheduleApi.createWork({
        startDate: work.startDate,
        workLeadTime: work.workLeadTime,
        subWorkTypeId: work.subWorkTypeId,
        scheduleVersionId,
      });
      const createdWork = response.updatedWorks?.[0];

      if (createdWork) {
        workIdMap.set(work.workId, createdWork.workId);
      } else {
        throw new Error("생성된 작업 ID를 확인하지 못했습니다.");
      }

      if (createdWork && createdWork.workName !== work.workName) {
        await desktopScheduleApi.updateWork({
          items: [
            {
              ...createWorkUpdateItemFromResponse(work),
              workId: createdWork.workId,
            },
          ],
        });
      }
    }

    return { workIdMap };
  }

  async function persistDeletedWorkDepsForHistoryToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["workDeps"],
    direction: DesktopScheduleHistoryDirection,
  ) {
    const workDepIdsToDelete = patch.changes
      .map((change) => {
        const source = getHistoryChangeSource(change, direction);
        const target = getHistoryChangeTarget(change, direction);

        if (!source) {
          return null;
        }

        if (!target) {
          return source.id;
        }

        return source.sourceWorkId !== target.sourceWorkId ||
          source.targetWorkId !== target.targetWorkId
          ? source.id
          : null;
      })
      .filter((workDepId): workDepId is number => workDepId !== null);

    await Promise.all(
      Array.from(new Set(workDepIdsToDelete)).map((workDepId) =>
        desktopScheduleApi.deleteWorkDep(workDepId),
      ),
    );
  }

  async function persistWorkDepHistoryPatchToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["workDeps"],
    direction: DesktopScheduleHistoryDirection,
    scheduleVersionId: DesktopScheduleVersionId,
    options: { workIdMap?: Map<number, number> } = {},
  ): Promise<DesktopScheduleHistorySyncResult> {
    const workDepsToCreate: DesktopScheduleWorkDepResponse[] = [];
    const workDepsToUpdate: DesktopScheduleWorkDepResponse[] = [];
    const workDepIdMap = new Map<number, number>();

    patch.changes.forEach((change) => {
      const source = getHistoryChangeSource(change, direction);
      const target = getHistoryChangeTarget(change, direction);

      if (source && target) {
        if (
          source.sourceWorkId === target.sourceWorkId &&
          source.targetWorkId === target.targetWorkId
        ) {
          workDepsToUpdate.push(target);
        } else {
          workDepsToCreate.push(target);
        }
        return;
      }

      if (!source && target) {
        workDepsToCreate.push(target);
      }
    });

    if (workDepsToUpdate.length > 0) {
      await Promise.all(
        workDepsToUpdate.map((workDep) =>
          desktopScheduleApi.updateWorkDep(workDep.id, {
            lagDays: workDep.lagDays,
          }),
        ),
      );
    }

    for (const workDep of workDepsToCreate) {
      const response = await desktopScheduleApi.createWorkDep({
        sourceWorkId: options.workIdMap?.get(workDep.sourceWorkId) ?? workDep.sourceWorkId,
        targetWorkId: options.workIdMap?.get(workDep.targetWorkId) ?? workDep.targetWorkId,
        lagDays: workDep.lagDays,
        scheduleVersionId,
      });
      const createdWorkDep = response.updatedWorkDeps?.[0];

      if (createdWorkDep) {
        workDepIdMap.set(workDep.id, createdWorkDep.id);
      } else {
        throw new Error("생성된 작업 연결 ID를 확인하지 못했습니다.");
      }
    }

    return { workDepIdMap };
  }

  async function persistMilestoneHistoryPatchToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["milestones"],
    direction: DesktopScheduleHistoryDirection,
  ): Promise<DesktopScheduleHistorySyncResult> {
    const milestoneIdsToDelete: number[] = [];
    const milestonesToCreate: DesktopScheduleMilestoneResponse[] = [];
    const milestonesToUpdate: DesktopScheduleMilestoneResponse[] = [];
    const milestoneIdMap = new Map<number, number>();

    patch.changes.forEach((change) => {
      const source = getHistoryChangeSource(change, direction);
      const target = getHistoryChangeTarget(change, direction);

      if (source && target) {
        milestonesToUpdate.push(target);
        return;
      }

      if (source && !target) {
        milestoneIdsToDelete.push(source.id);
        return;
      }

      if (!source && target) {
        milestonesToCreate.push(target);
      }
    });

    if (milestoneIdsToDelete.length > 0) {
      await Promise.all(
        milestoneIdsToDelete.map((milestoneId) =>
          desktopScheduleApi.deleteMilestone(
            milestoneId,
            getRequiredScheduleVersionIdForReferenceMutation(),
          ),
        ),
      );
    }

    if (milestonesToUpdate.length > 0) {
      await Promise.all(
        milestonesToUpdate.map((milestone) =>
          desktopScheduleApi.updateMilestone({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            id: milestone.id,
            date: milestone.date,
            name: milestone.name,
          }),
        ),
      );
    }

    if (milestonesToCreate.length > 0) {
      const createdMilestones = await Promise.all(
        milestonesToCreate.map(async (milestone) => ({
          sourceId: milestone.id,
          milestone: await desktopScheduleApi.createMilestone({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            date: milestone.date,
            name: milestone.name,
          }),
        })),
      );

      createdMilestones.forEach(({ sourceId, milestone }) => {
        milestoneIdMap.set(sourceId, milestone.id);
      });
    }

    return { milestoneIdMap };
  }

  async function persistLocalHistoryEntryToServer(
    entry: DesktopScheduleLocalHistoryEntry,
    direction: DesktopScheduleHistoryDirection,
  ): Promise<DesktopScheduleHistorySyncResult> {
    const scheduleVersionId = getSelectedScheduleVersionId();

    if (!entry.loadedData || !scheduleVersionId) {
      return {};
    }

    await persistReferenceHistoryPatchToServer(entry.loadedData.workHierarchy, direction);
    await persistDeletedWorkDepsForHistoryToServer(entry.loadedData.workDeps, direction);
    const workResult = await persistWorkHistoryPatchToServer(
      entry.loadedData.works,
      direction,
      scheduleVersionId,
    );
    const workDepResult = await persistWorkDepHistoryPatchToServer(
      entry.loadedData.workDeps,
      direction,
      scheduleVersionId,
      { workIdMap: workResult.workIdMap },
    );
    const milestoneResult = await persistMilestoneHistoryPatchToServer(
      entry.loadedData.milestones,
      direction,
    );

    return {
      workIdMap: workResult.workIdMap,
      workDepIdMap: workDepResult.workDepIdMap,
      milestoneIdMap: milestoneResult.milestoneIdMap,
    };
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

  async function moveLocalHistoryStackAndPersist(
    direction: DesktopScheduleHistoryDirection,
    entry: DesktopScheduleLocalHistoryEntry,
    sourceStack: "undo" | "redo",
  ) {
    const previousSnapshot = captureWorkingSnapshot();
    const previousUndoStack = [...localHistoryUndoStack.value];
    const previousRedoStack = [...localHistoryRedoStack.value];

    if (sourceStack === "undo") {
      localHistoryUndoStack.value = localHistoryUndoStack.value.slice(0, -1);
      localHistoryRedoStack.value = [
        ...localHistoryRedoStack.value.slice(-(LOCAL_HISTORY_MAX_ENTRIES - 1)),
        entry,
      ];
    } else {
      localHistoryRedoStack.value = localHistoryRedoStack.value.slice(0, -1);
      localHistoryUndoStack.value = [
        ...localHistoryUndoStack.value.slice(-(LOCAL_HISTORY_MAX_ENTRIES - 1)),
        entry,
      ];
    }

    applyLocalHistoryEntry(entry, direction);
    isLocalHistorySyncInFlight.value = true;

    try {
      const result = await persistLocalHistoryEntryToServer(entry, direction);
      const idMap = {
        workIds: result.workIdMap ?? new Map<number, number>(),
        workDepIds: result.workDepIdMap ?? new Map<number, number>(),
        milestoneIds: result.milestoneIdMap ?? new Map<number, number>(),
      };

      remapCurrentScheduleState(idMap);
      remapLocalHistoryStacks(idMap);
    } catch (error) {
      restoreWorkingSnapshot(previousSnapshot);
      localHistoryUndoStack.value = previousUndoStack;
      localHistoryRedoStack.value = previousRedoStack;
      handleMutationError(
        error,
        direction === "undo"
          ? "되돌리기를 서버에 저장하지 못했습니다."
          : "다시 실행을 서버에 저장하지 못했습니다.",
      );
    } finally {
      isLocalHistorySyncInFlight.value = false;
    }
  }

  async function undoLocalHistory() {
    const entry = localHistoryUndoStack.value[localHistoryUndoStack.value.length - 1];

    if (!entry || interactionSession.value || isLocalHistorySyncInFlight.value) {
      return;
    }

    await moveLocalHistoryStackAndPersist("undo", entry, "undo");
  }

  async function redoLocalHistory() {
    const entry = localHistoryRedoStack.value[localHistoryRedoStack.value.length - 1];

    if (!entry || interactionSession.value || isLocalHistorySyncInFlight.value) {
      return;
    }

    await moveLocalHistoryStackAndPersist("redo", entry, "redo");
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
    workType: { id: number; name: string },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.workTypeId === tempWorkTypeId
          ? {
              ...item,
              workTypeId: workType.id,
              workTypeName: workType.name,
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

  async function loadSchedule(
    options: {
      scheduleVersionId?: DesktopScheduleVersionId;
    } = {},
  ) {
    scheduleVersionReviewState.value = createClosedScheduleVersionReviewState();
    scheduleVersionPromotionRequestId += 1;
    scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
    scheduleLoadState.value = {
      status: "loading",
      data: scheduleLoadState.value.data,
      error: null,
    };

    try {
      const loadedScheduleData = await desktopScheduleApi.loadCurrentProjectSchedule({
        scheduleVersionId: options.scheduleVersionId,
      });
      const scheduleData = loadedScheduleData;
      const nextSnapshot = createDesktopScheduleSnapshotFromApiData(scheduleData);
      timelineCalendarState.value = createTimelineCalendarState(scheduleData);
      applyScheduleSnapshot(nextSnapshot);
      clearLocalHistory();
      scheduleLoadState.value = {
        status: "success",
        data: scheduleData,
        error: null,
      };
      if (scheduleData.selectedScheduleVersion.isMain) {
        scheduleVersionReviewBaselineCache.value = {
          versionId: scheduleData.selectedScheduleVersion.id,
          versionName: scheduleData.selectedScheduleVersion.versionName,
          snapshot: nextSnapshot,
        };
        scheduleVersionReviewSummaryCache.value = null;
      }
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

  function getRequiredScheduleVersionIdForReferenceMutation() {
    const scheduleVersionId = getSelectedScheduleVersionId();

    if (!scheduleVersionId) {
      throw new Error("공종을 저장할 공정표 버전이 없습니다.");
    }

    return scheduleVersionId;
  }


  function updateScheduleVersionsInLoadedData(
    updater: (versions: DesktopScheduleVersionResponse[]) => DesktopScheduleVersionResponse[],
  ) {
    const currentData = scheduleLoadState.value.data;

    if (!currentData) {
      return;
    }

    const nextVersions = updater(currentData.scheduleVersions.map((version) => ({ ...version })));
    const currentSelectedVersion = currentData.selectedScheduleVersion;
    const nextSelectedVersion =
      nextVersions.find((version) => version.id === currentSelectedVersion.id) ??
      currentSelectedVersion;

    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      data: {
        ...currentData,
        scheduleVersions: nextVersions,
        selectedScheduleVersion: { ...nextSelectedVersion },
      },
    };
  }

  function upsertScheduleVersionInLoadedData(version: DesktopScheduleVersionResponse) {
    updateScheduleVersionsInLoadedData((versions) => {
      const hasVersion = versions.some((currentVersion) => currentVersion.id === version.id);
      const nextVersions = hasVersion
        ? versions.map((currentVersion) =>
            currentVersion.id === version.id ? { ...version } : currentVersion,
          )
        : [...versions, { ...version }];

      return sortScheduleVersionsForWorkflow(nextVersions);
    });
  }

  function replaceScheduleVersionInLoadedData(version: DesktopScheduleVersionResponse) {
    updateScheduleVersionsInLoadedData((versions) =>
      sortScheduleVersionsForWorkflow(
        versions.map((currentVersion) =>
          currentVersion.id === version.id ? { ...version } : currentVersion,
        ),
      ),
    );
  }

  async function selectScheduleVersion(scheduleVersionId: DesktopScheduleVersionId) {
    if (scheduleVersionId === getSelectedScheduleVersionId()) {
      return;
    }

    await loadSchedule({ scheduleVersionId });
  }

  async function createDraftVersionFromCurrent(versionName: string) {
    const sourceScheduleVersionId = getSelectedScheduleVersionId();
    const trimmedVersionName = versionName.trim();

    if (!sourceScheduleVersionId) {
      showScheduleToast("작업본을 만들 공정표 버전이 없습니다.");
      return;
    }

    if (!trimmedVersionName) {
      showScheduleToast("작업본 이름을 입력해 주세요.");
      return;
    }

    if (!canCreateDraftVersion.value) {
      showScheduleToast(`작업본은 최대 ${MAX_DRAFT_SCHEDULE_VERSION_COUNT}개까지 만들 수 있어요.`);
      return;
    }

    try {
      const createdVersion = await desktopScheduleApi.duplicateScheduleVersion(
        sourceScheduleVersionId,
        { versionName: trimmedVersionName },
      );
      await loadSchedule({ scheduleVersionId: createdVersion.id });
      showScheduleToast("작업본을 만들었어요.");
    } catch (error) {
      handleMutationError(error, "작업본을 만들지 못했습니다.");
    }
  }

  async function renameScheduleVersion(payload: {
    scheduleVersionId: DesktopScheduleVersionId;
    versionName: string;
  }) {
    const trimmedVersionName = payload.versionName.trim();
    const targetVersion =
      scheduleVersions.value.find((version) => version.id === payload.scheduleVersionId) ?? null;

    if (!targetVersion || targetVersion.isMain) {
      showScheduleToast("기준 공정표 이름은 여기서 변경할 수 없어요.");
      return;
    }

    if (!trimmedVersionName) {
      showScheduleToast("작업본 이름을 입력해 주세요.");
      return;
    }

    if (targetVersion.versionName === trimmedVersionName) {
      return;
    }

    const previousVersion = { ...targetVersion };
    const optimisticVersion = {
      ...targetVersion,
      versionName: trimmedVersionName,
    };

    replaceScheduleVersionInLoadedData(optimisticVersion);

    try {
      const updatedVersion = await desktopScheduleApi.updateScheduleVersion(
        payload.scheduleVersionId,
        {
          versionName: trimmedVersionName,
        },
      );
      replaceScheduleVersionInLoadedData({
        ...updatedVersion,
        versionName: updatedVersion.versionName || trimmedVersionName,
      });
      showScheduleToast("작업본 이름을 변경했어요.");
    } catch (error) {
      replaceScheduleVersionInLoadedData(previousVersion);
      handleMutationError(error, "작업본 이름을 변경하지 못했습니다.");
    }
  }

  async function deleteScheduleVersion(scheduleVersionId: DesktopScheduleVersionId) {
    const targetVersion = scheduleVersions.value.find((version) => version.id === scheduleVersionId);

    if (!targetVersion) {
      return;
    }

    if (targetVersion.isMain) {
      showScheduleToast("기준 공정표는 삭제할 수 없어요.");
      return;
    }

    if (scheduleVersions.value.length <= 1) {
      showScheduleToast("공정표 버전은 최소 1개가 필요해요.");
      return;
    }

    const isDeletingSelectedVersion = scheduleVersionId === getSelectedScheduleVersionId();
    const currentMainFallback = findMainScheduleVersion(
      scheduleVersions.value.filter((version) => version.id !== scheduleVersionId),
    );
    const fallbackScheduleVersionId =
      currentMainFallback?.id ??
      scheduleVersions.value.find((version) => version.id !== scheduleVersionId)?.id;

    try {
      await desktopScheduleApi.deleteScheduleVersion(scheduleVersionId);

      if (isDeletingSelectedVersion) {
        await loadSchedule({ scheduleVersionId: fallbackScheduleVersionId });
      } else {
        updateScheduleVersionsInLoadedData((versions) =>
          sortScheduleVersionsForWorkflow(
            versions.filter((version) => version.id !== scheduleVersionId),
          ),
        );
      }

      showScheduleToast("작업본을 삭제했어요.");
    } catch (error) {
      handleMutationError(error, "작업본을 삭제하지 못했습니다.");
    }
  }

  function createCurrentScheduleVersionReviewDraftSnapshot() {
    return {
      items: cloneItems(workingItems.value),
      workConnections: cloneWorkConnections(workingWorkConnections.value),
      milestones: cloneMilestones(workingMilestones.value),
    };
  }

  function createCurrentScheduleVersionReviewLayoutFingerprint() {
    return createScheduleVersionReviewLayoutFingerprint(workingRows.value, timeline.value, {
      rowHeight: rowHeight.value,
      barHeight: barHeight.value,
      preferredLaneByItemId: lanePreferenceByItemId.value,
    });
  }

  async function getScheduleVersionReviewBaselineCache(
    mainVersion: DesktopScheduleVersionResponse,
  ) {
    const currentCache = scheduleVersionReviewBaselineCache.value;

    if (currentCache?.versionId === mainVersion.id) {
      if (currentCache.versionName !== mainVersion.versionName) {
        scheduleVersionReviewBaselineCache.value = {
          ...currentCache,
          versionName: mainVersion.versionName,
        };
      }

      return scheduleVersionReviewBaselineCache.value!;
    }

    const baselineData = await desktopScheduleApi.loadCurrentProjectSchedule({
      scheduleVersionId: mainVersion.id,
    });
    const baselineSnapshot = createDesktopScheduleSnapshotFromApiData(baselineData);
    const nextCache = {
      versionId: mainVersion.id,
      versionName: mainVersion.versionName,
      snapshot: baselineSnapshot,
    };

    scheduleVersionReviewBaselineCache.value = nextCache;
    scheduleVersionReviewSummaryCache.value = null;

    return nextCache;
  }

  function getCachedScheduleVersionReviewSummary(options: {
    baselineVersion: DesktopScheduleVersionResponse;
    draftVersion: DesktopScheduleVersionResponse;
    draftFingerprint: string;
    layoutFingerprint: string;
  }) {
    const cache = scheduleVersionReviewSummaryCache.value;

    if (
      !cache ||
      cache.baselineVersionId !== options.baselineVersion.id ||
      cache.baselineVersionName !== options.baselineVersion.versionName ||
      cache.draftVersionId !== options.draftVersion.id ||
      cache.draftVersionName !== options.draftVersion.versionName ||
      cache.draftFingerprint !== options.draftFingerprint ||
      cache.layoutFingerprint !== options.layoutFingerprint
    ) {
      return null;
    }

    return cache.summary;
  }

  function createScheduleVersionReviewSummaryFromState(options: {
    baselineCache: ScheduleVersionReviewBaselineCache;
    draftVersion: DesktopScheduleVersionResponse;
    draftSnapshot: Pick<DesktopScheduleSnapshot, "items" | "workConnections" | "milestones">;
  }) {
    const baselineLayout = desktopScheduleService.buildShellLayout(
      workingRows.value,
      options.baselineCache.snapshot.items,
      timeline.value,
      {
        rowHeight: rowHeight.value,
        barHeight: barHeight.value,
        preferredLaneByItemId: lanePreferenceByItemId.value,
        workConnections: options.baselineCache.snapshot.workConnections,
        milestones: options.baselineCache.snapshot.milestones,
      },
    );
    const summaryBase = createDesktopScheduleVersionReviewSummary(
      options.baselineCache.snapshot,
      options.draftSnapshot,
      options.baselineCache.versionName,
      options.draftVersion.versionName,
    );

    return {
      ...summaryBase,
      visual: createDesktopScheduleVersionReviewVisualSummary(
        summaryBase.details,
        options.baselineCache.snapshot,
        options.draftSnapshot,
        baselineLayout,
        shellLayout.value,
      ),
    };
  }

  async function resolveScheduleVersionReviewSummary(options: {
    baselineVersion: DesktopScheduleVersionResponse;
    draftVersion: DesktopScheduleVersionResponse;
  }) {
    const draftSnapshot = createCurrentScheduleVersionReviewDraftSnapshot();
    const draftFingerprint = createScheduleVersionReviewDraftFingerprint(draftSnapshot);
    const layoutFingerprint = createCurrentScheduleVersionReviewLayoutFingerprint();
    const cachedSummary = getCachedScheduleVersionReviewSummary({
      baselineVersion: options.baselineVersion,
      draftVersion: options.draftVersion,
      draftFingerprint,
      layoutFingerprint,
    });

    if (cachedSummary) {
      return cachedSummary;
    }

    const baselineCache = await getScheduleVersionReviewBaselineCache(options.baselineVersion);
    const summary = createScheduleVersionReviewSummaryFromState({
      baselineCache,
      draftVersion: options.draftVersion,
      draftSnapshot,
    });

    scheduleVersionReviewSummaryCache.value = {
      baselineVersionId: options.baselineVersion.id,
      baselineVersionName: options.baselineVersion.versionName,
      draftVersionId: options.draftVersion.id,
      draftVersionName: options.draftVersion.versionName,
      draftFingerprint,
      layoutFingerprint,
      summary,
    };

    return summary;
  }

  function closeScheduleVersionReview() {
    const currentState = scheduleVersionReviewState.value;

    scheduleVersionReviewState.value = {
      open: false,
      status: currentState.summary ? "success" : "idle",
      summary: currentState.summary,
      errorMessage: null,
    };
  }

  async function openScheduleVersionReview() {
    const currentData = scheduleLoadState.value.data;
    const draftVersion = selectedScheduleVersion.value;
    const mainVersion = findMainScheduleVersion(scheduleVersions.value);

    if (!currentData || !draftVersion) {
      showScheduleToast("비교할 공정표 데이터를 찾지 못했어요.");
      return;
    }

    if (draftVersion.isMain) {
      showScheduleToast("작업본에서만 기준 공정표와 비교할 수 있어요.");
      return;
    }

    if (!mainVersion) {
      showScheduleToast("기준 공정표가 없어 비교할 수 없어요.");
      return;
    }

    const draftSnapshot = createCurrentScheduleVersionReviewDraftSnapshot();
    const draftFingerprint = createScheduleVersionReviewDraftFingerprint(draftSnapshot);
    const layoutFingerprint = createCurrentScheduleVersionReviewLayoutFingerprint();
    const cachedSummary = getCachedScheduleVersionReviewSummary({
      baselineVersion: mainVersion,
      draftVersion,
      draftFingerprint,
      layoutFingerprint,
    });

    if (cachedSummary) {
      scheduleVersionReviewState.value = {
        open: true,
        status: "success",
        summary: cachedSummary,
        errorMessage: null,
      };
      return;
    }

    if (scheduleVersionReviewBaselineCache.value?.versionId !== mainVersion.id) {
      scheduleVersionReviewState.value = {
        open: true,
        status: "loading",
        summary: scheduleVersionReviewState.value.summary,
        errorMessage: null,
      };
    }

    try {
      const baselineCache = await getScheduleVersionReviewBaselineCache(mainVersion);
      const summary = createScheduleVersionReviewSummaryFromState({
        baselineCache,
        draftVersion,
        draftSnapshot,
      });

      scheduleVersionReviewSummaryCache.value = {
        baselineVersionId: mainVersion.id,
        baselineVersionName: mainVersion.versionName,
        draftVersionId: draftVersion.id,
        draftVersionName: draftVersion.versionName,
        draftFingerprint,
        layoutFingerprint,
        summary,
      };

      scheduleVersionReviewState.value = {
        open: true,
        status: "success",
        summary,
        errorMessage: null,
      };
    } catch (error) {
      const normalizedError = normalizeError(error);
      showScheduleToast("변경사항을 비교하지 못했어요.");
      scheduleVersionReviewState.value = {
        open: false,
        status: "error",
        summary: null,
        errorMessage: normalizedError.message,
      };
    }
  }

  function closeScheduleVersionPromotionDialog() {
    scheduleVersionPromotionRequestId += 1;
    scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
  }

  async function requestScheduleVersionPromotion() {
    const currentData = scheduleLoadState.value.data;
    const draftVersion = selectedScheduleVersion.value;
    const mainVersion = findMainScheduleVersion(scheduleVersions.value);

    if (!currentData || !draftVersion) {
      showScheduleToast("반영할 공정표 데이터를 찾지 못했어요.");
      return;
    }

    if (draftVersion.isMain) {
      showScheduleToast("작업본에서만 기준 공정표로 반영할 수 있어요.");
      return;
    }

    const requestId = (scheduleVersionPromotionRequestId += 1);

    if (!mainVersion) {
      scheduleVersionPromotionState.value = {
        open: true,
        status: "idle",
        baselineVersionName: "",
        draftVersionName: draftVersion.versionName,
        summary: null,
        errorMessage: null,
      };
      return;
    }

    scheduleVersionPromotionState.value = {
      open: true,
      status: "preparing",
      baselineVersionName: mainVersion.versionName,
      draftVersionName: draftVersion.versionName,
      summary: null,
      errorMessage: null,
    };

    try {
      const summary = await resolveScheduleVersionReviewSummary({
        baselineVersion: mainVersion,
        draftVersion,
      });

      if (
        requestId !== scheduleVersionPromotionRequestId ||
        selectedScheduleVersion.value?.id !== draftVersion.id
      ) {
        return;
      }

      scheduleVersionPromotionState.value = {
        open: true,
        status: "idle",
        baselineVersionName: mainVersion.versionName,
        draftVersionName: draftVersion.versionName,
        summary,
        errorMessage: null,
      };
    } catch (error) {
      if (requestId !== scheduleVersionPromotionRequestId) {
        return;
      }

      const normalizedError = normalizeError(error);
      scheduleVersionPromotionState.value = {
        open: true,
        status: "error",
        baselineVersionName: mainVersion.versionName,
        draftVersionName: draftVersion.versionName,
        summary: null,
        errorMessage: normalizedError.message,
      };
      showScheduleToast("반영 전 변경사항을 불러오지 못했어요.");
    }
  }

  async function confirmScheduleVersionPromotion() {
    const draftVersion = selectedScheduleVersion.value;
    const promotionState = scheduleVersionPromotionState.value;

    if (!promotionState.open || promotionState.status === "promoting") return;
    if (!draftVersion || draftVersion.isMain) {
      showScheduleToast("작업본에서만 기준 공정표로 반영할 수 있어요.");
      return;
    }

    const requestId = (scheduleVersionPromotionRequestId += 1);

    scheduleVersionPromotionState.value = {
      ...promotionState,
      status: "promoting",
      errorMessage: null,
    };

    try {
      await desktopScheduleApi.setScheduleMain(draftVersion.id);

      if (requestId !== scheduleVersionPromotionRequestId) return;

      await loadSchedule({ scheduleVersionId: draftVersion.id });

      if (requestId !== scheduleVersionPromotionRequestId) return;

      scheduleVersionPromotionState.value = createClosedScheduleVersionPromotionState();
      showScheduleToast("기준 공정표로 반영했어요.");
    } catch (error) {
      if (requestId !== scheduleVersionPromotionRequestId) return;

      const normalizedError = normalizeError(error);
      scheduleVersionPromotionState.value = {
        ...scheduleVersionPromotionState.value,
        status: "error",
        errorMessage: normalizedError.message,
      };
      showScheduleToast(normalizedError.message || "기준 공정표로 반영하지 못했어요.");
    }
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

    showScheduleToast(getMutationErrorToastMessage(normalizedError, fallbackMessage));
  }

  async function reloadAfterMutation() {
    const scheduleVersionId = getSelectedScheduleVersionId() ?? undefined;
    await loadSchedule({ scheduleVersionId });
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
    if (!ensureScheduleEditable()) {
      return;
    }

    const snapshot = captureWorkingSnapshot();
    workingRows.value = desktopScheduleService.addParentRow(workingRows.value);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function addChildRow(parentRowId: string) {
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: createOptimisticReferenceId(),
      divisionName: DEFAULT_DIVISION_NAME,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function startDivisionRename(divisionId: number) {
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      renamingDivisionId.value = null;
      return;
    }

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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
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
        await desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(), id: payload.divisionId, name: nextName });
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
    if (!ensureScheduleEditable()) {
      return;
    }

    if (payload.divisionId < 0) {
      showScheduleToast("분류 저장이 끝난 뒤 공종을 추가할 수 있어요.");
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: payload.divisionId,
      divisionName: payload.divisionName,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function createReferenceSubWorkTypeSet(payload: { workTypeId: number }) {
    if (!ensureScheduleEditable()) {
      return;
    }

    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === payload.workTypeId,
    );

    if (!targetHierarchyItem) {
      closeContextMenu();
      return;
    }

    if (targetHierarchyItem.workTypeId < 0) {
      showScheduleToast("공종명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }

    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: targetHierarchyItem.divisionId,
      divisionName: targetHierarchyItem.divisionName,
      workTypeId: targetHierarchyItem.workTypeId,
      workTypeName: targetHierarchyItem.workTypeName,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };

    addReferenceSubWorkTypeItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    closeContextMenu();
  }

  function startWorkTypeRename(workTypeId: number) {
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      renamingWorkTypeId.value = null;
      return;
    }

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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            divisionId: targetHierarchyItem.divisionId,
            name: nextName,
          });
          replaceReferenceWorkTypeId(payload.workTypeId, workType);
        },
        "공종을 추가하지 못했습니다.",
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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          id: payload.workTypeId,
          name: nextName,
        });
      },
      "공종 이름을 변경하지 못했습니다.",
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      renamingSubWorkTypeId.value = null;
      return;
    }

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
      showScheduleToast("공종명을 먼저 입력해 주세요.");
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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            workTypeId: targetHierarchyItem.workTypeId,
            name: nextName,
            color: targetHierarchyItem.subWorkTypeColor ?? null,
          });
          replaceReferenceSubWorkTypeId(payload.subWorkTypeId, subWorkType);
        },
        "세부공종을 추가하지 못했습니다.",
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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          id: payload.subWorkTypeId,
          name: nextName,
        });
      },
      "세부공종 이름을 변경하지 못했습니다.",
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
        await desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(), ids: payload.divisionIds });
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          parentId: payload.divisionId,
          ids: payload.workTypeIds,
        });
      },
      "공종 순서를 변경하지 못했습니다.",
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
              desktopScheduleApi.deleteMilestone(
                milestoneApiId,
                getRequiredScheduleVersionIdForReferenceMutation(),
              ),
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
              desktopScheduleApi.deleteMilestone(
                milestoneApiId,
                getRequiredScheduleVersionIdForReferenceMutation(),
              ),
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
      | { kind: "reference-header" }
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
              id: subWorkTypeId,
              color: colorHex,
            });
          },
          "세부공종 색상을 저장하지 못했습니다.",
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
    if (!ensureScheduleEditable()) {
      return;
    }

    const targetRow = rowById.value.get(payload.rowId);
    const scheduleVersionId = getSelectedScheduleVersionId();
    const subWorkTypeId = targetRow?.source.subWorkTypeId;

    if (!scheduleVersionId || !subWorkTypeId) {
      handleMutationError(
        new Error("작업을 생성할 공정표 버전 또는 세부공종 정보가 없습니다."),
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      renamingItemId.value = null;
      return;
    }

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
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      renamingMilestoneId.value = null;
      return;
    }

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
          scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
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

    if (isScheduleReadOnly.value) {
      return [];
    }

    if (
      target.kind === "reference-header" ||
      target.kind === "division-header" ||
      target.kind === "work-type-header" ||
      target.kind === "sub-work-type-header"
    ) {
      const createItem =
        target.kind === "reference-header"
          ? {
              id: "create-division-reference",
              label: "분류 생성",
              command: "create-division-reference" as const,
              icon: "plus" as const,
            }
          : target.kind === "division-header"
              ? {
                id: "create-work-type-reference",
                label: "공종 생성",
                command: "create-work-type-reference" as const,
                icon: "plus" as const,
              }
            : target.kind === "work-type-header"
              ? {
                id: "create-sub-work-type-reference",
                label: "세부공종 생성",
                command: "create-sub-work-type-reference" as const,
                icon: "plus" as const,
              }
              : null;

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
        ...(createItem ? [createItem] : []),
        ...colorItem,
        ...(target.kind === "reference-header"
          ? []
          : [
              {
                id: "rename-reference",
                label: "이름 변경",
                command: "rename-reference" as const,
                icon: "pencil" as const,
              },
              {
                id: "delete-reference",
                label: "삭제",
                command: "delete-reference" as const,
                icon: "trash" as const,
                danger: true,
              },
            ]),
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
    if (!ensureScheduleEditable()) {
      return;
    }

    const target = contextMenuState.value.target;

    if (!target) {
      return;
    }

    if (
      target.kind === "reference-header" ||
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

      if (command === "create-division-reference" && target.kind === "reference-header") {
        createReferenceDivisionSet();
        return;
      }

      if (command === "create-work-type-reference" && target.kind === "division-header") {
        const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
          (item) => item.divisionId === target.divisionId,
        );

        createReferenceWorkTypeSet({
          divisionId: target.divisionId,
          divisionName: targetHierarchyItem?.divisionName ?? target.name,
        });
        return;
      }

      if (command === "create-sub-work-type-reference" && target.kind === "work-type-header") {
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

        if (target.kind === "sub-work-type-header") {
          startSubWorkTypeRename(target.subWorkTypeId);
        }
        return;
      }

      if (command === "delete-reference" && target.kind !== "reference-header") {
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
                new Set(
                  divisionHierarchy
                    .map((item) => item.subWorkTypeId)
                    .filter((subWorkTypeId) => subWorkTypeId > 0),
                ),
              );
              const workTypeIds = Array.from(
                new Set(
                  divisionHierarchy
                    .map((item) => item.workTypeId)
                    .filter((workTypeId) => workTypeId > 0),
                ),
              );

              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId, getRequiredScheduleVersionIdForReferenceMutation()),
                ),
              );
              await Promise.all(
                workTypeIds.map((workTypeId) => desktopScheduleApi.deleteWorkType(workTypeId, getRequiredScheduleVersionIdForReferenceMutation())),
              );
              await desktopScheduleApi.deleteDivision(target.divisionId, getRequiredScheduleVersionIdForReferenceMutation());
              return;
            }

            if (target.kind === "work-type-header") {
              const subWorkTypeIds = Array.from(
                new Set(
                  workTypeHierarchy
                    .map((item) => item.subWorkTypeId)
                    .filter((subWorkTypeId) => subWorkTypeId > 0),
                ),
              );

              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId, getRequiredScheduleVersionIdForReferenceMutation()),
                ),
              );
              await desktopScheduleApi.deleteWorkType(target.workTypeId, getRequiredScheduleVersionIdForReferenceMutation());
              return;
            }

            if (target.kind === "sub-work-type-header") {
              await desktopScheduleApi.deleteSubWorkType(target.subWorkTypeId, getRequiredScheduleVersionIdForReferenceMutation());
            }
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
        const nextName = promptForName("공종명을 입력하세요.", targetRow.name);
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
          await desktopScheduleApi.deleteMilestone(
            milestoneApiId,
            getRequiredScheduleVersionIdForReferenceMutation(),
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

    if (target.kind === "milestone" && command === "change-properties") {
      startMilestoneRename(target.milestoneId);
      return;
    }

  }

  function cancelConnectionCreation() {
    connectionCreationState.value = null;
  }

  async function completeConnectionCreation(targetItemId: string) {
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (!ensureScheduleEditable()) {
      return;
    }

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
          scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (isScheduleReadOnly.value) {
      return;
    }

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
    if (isScheduleReadOnly.value) {
      interactionSession.value = null;
      return;
    }

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
                scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
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
    if (!ensureScheduleEditable()) {
      return;
    }

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
    if (isScheduleReadOnly.value) {
      return;
    }

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
    if (isScheduleReadOnly.value) {
      interactionSession.value = null;
      return;
    }

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
    persistUiPreferences({ zoomIndex: currentZoomIndex.value, zoomDayWidth: nextDayWidth });
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

  function triggerBlobDownload(blob: Blob, filename: string) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function exportScheduleAsExcel(range: "3week" | "3month") {
    const scheduleVersionId = selectedScheduleVersionId.value;
    if (!scheduleVersionId) {
      showScheduleToast("공정표 버전이 선택되지 않았어요.");
      return;
    }

    try {
      const { blob, filename } =
        range === "3week"
          ? await desktopScheduleApi.export3WeekSchedule({
              scheduleVersionId,
              excludedSubWorkTypeIds: [],
            })
          : await desktopScheduleApi.export3MonthSchedule({
              scheduleVersionId,
              excludedSubWorkTypeIds: [],
            });
      const fallbackName = range === "3week" ? "3주공정표.xlsx" : "3개월공정표.xlsx";
      triggerBlobDownload(blob, filename || fallbackName);
    } catch (error) {
      showScheduleToast(
        error instanceof Error ? error.message : "엑셀을 생성하지 못했어요.",
      );
    }
  }

  function importScheduleStub() {
    showScheduleToast("공정표 불러오기는 준비 중이에요.");
  }

  return {
    scheduleMeta,
    isScheduleReadOnly,
    scheduleVersions,
    selectedScheduleVersionId,
    scheduleVersionDisplayName,
    scheduleVersionModeLabel,
    scheduleVersionAccessLabel,
    suggestedDraftVersionName,
    canCreateDraftVersion,
    canCompareScheduleVersion,
    canPromoteScheduleVersion,
    scheduleVersionReviewState,
    scheduleVersionPromotionState,
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
    notifyReadOnlyScheduleAction,
    selectScheduleVersion,
    createDraftVersionFromCurrent,
    renameScheduleVersion,
    deleteScheduleVersion,
    openScheduleVersionReview,
    closeScheduleVersionReview,
    requestScheduleVersionPromotion,
    confirmScheduleVersionPromotion,
    closeScheduleVersionPromotionDialog,
    exportScheduleAsExcel,
    importScheduleStub,
    pastMainScheduleVersions,
  };
}

type DesktopScheduleViewModel = ReturnType<typeof createDesktopScheduleViewModel>;

let desktopScheduleViewModel: DesktopScheduleViewModel | null = null;

export function useDesktopScheduleViewModel() {
  desktopScheduleViewModel ??= createDesktopScheduleViewModel();
  return desktopScheduleViewModel;
}
