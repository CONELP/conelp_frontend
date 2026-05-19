import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleVersionResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { findMainScheduleVersion } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleImportDialogState,
    DesktopScheduleItem,
    DesktopScheduleVersionPromotionState,
    DesktopScheduleVersionReviewState,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    DESKTOP_SCHEDULE_TIMELINE_DEFAULTS,
    DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS,
    desktopScheduleService
} from "@/features/desktop-schedule/services/desktop-schedule.service";
import type { DesktopScheduleContextMenuTarget } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";

export type ConnectionCreationState = {
  kind: "work-connection";
  sourceItemId: string;
};

export type ColorPaletteTarget = Extract<DesktopScheduleContextMenuTarget, { kind: "row" | "item" }>;

export type ColorPaletteState = {
  open: boolean;
  x: number;
  y: number;
  target: ColorPaletteTarget | null;
  selectedColor: string | null;
};

export type TimelineCalendarState = {
  startDate: string | null;
  endDate: string | null;
  dates: Record<
    string,
    { isHoliday: boolean; isActivated: boolean; holidayName: string | null }
  >;
};

export type ProjectScheduleDateRange = {
  startDate: string;
  endDate: string;
};

export type ScheduleToastState = {
  visible: boolean;
  message: string;
  tone: "neutral" | "warning";
};

export type ScheduleImportDialogState = DesktopScheduleImportDialogState;

export type ScheduleMutationOptions = {
  reloadOnSuccess?: boolean;
  reloadOnError?: boolean;
  rollback?: () => void;
};

export const DEFAULT_DIVISION_NAME = "분류 (건축공사)";
export const DEFAULT_WORK_TYPE_NAME = "공종명 (철콘공사)";
export const DEFAULT_SUB_WORK_TYPE_NAME = "세부공종명 (타설)";
export const DEFAULT_SUB_WORK_TYPE_COLOR_HEX = "#9ca3af";
export const DEFAULT_ROW_PANEL_WIDTH = 220;
export const DEFAULT_WORK_TYPE_COLUMN_WIDTH = 110;
export const DEFAULT_NEW_WORK_LEAD_TIME = 3;
export const ROW_PANEL_MIN_WIDTH = 180;
export const ROW_PANEL_MAX_WIDTH = 520;
export const WORK_TYPE_COLUMN_MIN_WIDTH = 72;
export const WORK_TYPE_COLUMN_MAX_WIDTH = 240;
export const LOCAL_HISTORY_MAX_ENTRIES = 200;
export const MAX_DRAFT_SCHEDULE_VERSION_COUNT = 5;
export const DESKTOP_SCHEDULE_UI_PREFERENCES_STORAGE_KEY =
  "conelp.desktopSchedule.uiPreferences.v1";
export const LEGACY_DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS = [24, 32, 40, 48, 60, 76, 96] as const;
export const DEFAULT_ZOOM_INDEX = Math.max(
  DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.findIndex(
    (level) => level === DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth,
  ),
  0,
);
let optimisticReferenceIdSeed = -1;

export type DesktopScheduleUiPreferences = {
  zoomIndex?: number;
  zoomDayWidth?: number;
  rowPanelWidth?: number;
  workTypeColumnWidth?: number;
};

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampZoomIndex(value: number) {
  return clampNumber(
    Math.round(value),
    0,
    DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1,
  );
}

export function getDayWidthForZoomIndex(zoomIndex: number) {
  return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS[clampZoomIndex(zoomIndex)]!;
}

export function getClosestZoomIndexForDayWidth(dayWidth: number) {
  return DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS.reduce((closestIndex, level, index, levels) => {
    return Math.abs(level - dayWidth) < Math.abs(levels[closestIndex]! - dayWidth)
      ? index
      : closestIndex;
  }, 0);
}

export function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function loadDesktopScheduleUiPreferences(): DesktopScheduleUiPreferences {
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

export function createHiddenScheduleToast(): ScheduleToastState {
  return {
    visible: false,
    message: "",
    tone: "neutral",
  };
}

export function createClosedScheduleImportDialogState(): ScheduleImportDialogState {
  return {
    open: false,
    status: "idle",
    fileName: null,
    startDate: "",
    endDate: "",
    errorMessage: null,
  };
}

export function createClosedScheduleVersionReviewState(): DesktopScheduleVersionReviewState {
  return {
    open: false,
    status: "idle",
    summary: null,
    errorMessage: null,
  };
}

export function createClosedScheduleVersionPromotionState(): DesktopScheduleVersionPromotionState {
  return {
    open: false,
    status: "idle",
    baselineVersionName: null,
    draftVersionName: null,
    summary: null,
    errorMessage: null,
  };
}

export function createOptimisticReferenceId() {
  const nextId = optimisticReferenceIdSeed;
  optimisticReferenceIdSeed -= 1;
  return nextId;
}

export function createClosedColorPaletteState(): ColorPaletteState {
  return {
    open: false,
    x: 0,
    y: 0,
    target: null,
    selectedColor: null,
  };
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function promptForName(label: string, currentName: string): string | null {
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

export function shouldSwapConnectionDirection(
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

export function isSameConnectionItemPair(
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

export function createEmptyScheduleSnapshot() {
  return desktopScheduleService.buildSnapshot(
    {
      source: "work-api",
      tasks: [],
    },
    [],
  );
}

export function createIdleScheduleLoadState(): DesktopScheduleApiLoadState<DesktopScheduleBootstrapData> {
  return {
    status: "idle",
    data: null,
    error: null,
  };
}

export function createEmptyTimelineCalendarState(): TimelineCalendarState {
  return {
    startDate: null,
    endDate: null,
    dates: {},
  };
}

export function createTimelineCalendarState(data: DesktopScheduleBootstrapData): TimelineCalendarState {
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

export function parseScheduleLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function diffScheduleDays(startDate: string, endDate: string) {
  const start = parseScheduleLocalDate(startDate);
  const end = parseScheduleLocalDate(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function clampScheduleNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function isDateWithinProjectRange(date: string, range: ProjectScheduleDateRange) {
  return date >= range.startDate && date <= range.endDate;
}

export function getWorkLeadTimeWithinProject(
  startDate: string,
  range: ProjectScheduleDateRange | null,
) {
  if (!range) {
    return DEFAULT_NEW_WORK_LEAD_TIME;
  }

  return clampScheduleNumber(
    DEFAULT_NEW_WORK_LEAD_TIME,
    1,
    Math.max(diffScheduleDays(startDate, range.endDate) + 1, 1),
  );
}

export function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error("공정표 데이터를 불러오지 못했습니다.");
}

export async function ignoreMissingHistoryDelete(
  mutation: () => Promise<unknown>,
  missingEntityPattern: RegExp,
) {
  try {
    await mutation();
  } catch (error) {
    if (missingEntityPattern.test(normalizeError(error).message)) {
      return;
    }

    throw error;
  }
}

export function isNetworkMutationError(error: Error) {
  return /failed to fetch|networkerror|load failed/i.test(error.message);
}

export function getHttpStatusFromErrorMessage(message: string) {
  const statusMatch = message.match(/\((\d{3})\)/);
  return statusMatch ? Number(statusMatch[1]) : null;
}

export function getMutationErrorToastMessage(error: Error, fallbackMessage: string) {
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

export function createUniqueReferenceName(baseName: string, existingNames: string[]) {
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

export function sortScheduleVersionsForWorkflow(
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

export function formatDraftVersionDatePrefix(date = new Date()) {
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

export function createSuggestedDraftVersionName(versions: DesktopScheduleVersionResponse[]) {
  const prefix = `${formatDraftVersionDatePrefix()}_복제본`;
  const versionNameSet = new Set(versions.map((version) => version.versionName));
  let draftNumber = 1;

  while (versionNameSet.has(`${prefix}${draftNumber}`)) {
    draftNumber += 1;
  }

  return `${prefix}${draftNumber}`;
}

