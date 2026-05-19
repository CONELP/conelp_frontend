import { computed, ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleVersionId,
    DesktopScheduleWorkResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { findMainScheduleVersion, getPastMainScheduleVersions } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleVersionPromotionState,
    DesktopScheduleVersionReviewState,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    DESKTOP_SCHEDULE_SHELL_DEFAULTS,
    DESKTOP_SCHEDULE_TIMELINE_DEFAULTS,
    DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS,
    desktopScheduleService,
} from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
    DEFAULT_ROW_PANEL_WIDTH,
    DEFAULT_WORK_TYPE_COLUMN_WIDTH,
    DEFAULT_ZOOM_INDEX,
    MAX_DRAFT_SCHEDULE_VERSION_COUNT,
    createClosedColorPaletteState,
    createClosedScheduleImportDialogState,
    createClosedScheduleVersionPromotionState,
    createClosedScheduleVersionReviewState,
    createEmptyScheduleSnapshot,
    createEmptyTimelineCalendarState,
    createHiddenScheduleToast,
    createIdleScheduleLoadState,
    createSuggestedDraftVersionName,
    formatDateTime,
    formatShortDate,
    getDayWidthForZoomIndex,
    sortScheduleVersionsForWorkflow,
    type ConnectionCreationState,
    type DesktopScheduleUiPreferences,
    type ProjectScheduleDateRange,
    type ScheduleImportDialogState,
    type ScheduleToastState,
    type TimelineCalendarState
} from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import type { MoveSession, ResizeSession, SummaryResizeSession } from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";
import type { DesktopScheduleLocalHistoryEntry } from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";
import { createClosedDesktopScheduleContextMenuState, createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import type {
    ScheduleVersionReviewBaselineCache,
    ScheduleVersionReviewSummaryCache,
} from "@/features/desktop-schedule/state/types/desktop-schedule-version-review.types";

export function useDesktopScheduleCoreState(storedUiPreferences: DesktopScheduleUiPreferences) {
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
  const scheduleImportDialogState = ref<ScheduleImportDialogState>(
    createClosedScheduleImportDialogState(),
  );
  const isAiVerificationModeActive = ref(false);
  const aiVerificationFlaggedItemIds = ref<string[]>([]);
  const excludedScheduleVersionIds = ref<Set<DesktopScheduleVersionId>>(new Set());
  const scheduleVersionReviewBaselineCache = ref<ScheduleVersionReviewBaselineCache | null>(null);
  const scheduleVersionReviewSummaryCache = ref<ScheduleVersionReviewSummaryCache | null>(null);
  const pendingWorkCreationByItemId = new Map<string, Promise<number>>();
  const resolvedWorkIdByPendingItemId = new Map<string, number>();
  const scheduleToastTimer = ref<number | null>(null);
  let scheduleVersionPromotionRequestId = 0;
  
  function getProjectScheduleDateRange(): ProjectScheduleDateRange | null {
    const { startDate, endDate } = timelineCalendarState.value;
  
    if (!startDate || !endDate) {
      return null;
    }
  
    return { startDate, endDate };
  }
  
  function getPersistedWorkIdForItem(item: DesktopScheduleItem) {
    return resolvedWorkIdByPendingItemId.get(item.id) ?? item.workId;
  }
  
  function withPersistedWorkIds(items: DesktopScheduleItem[]) {
    return items.map((item) => ({
      ...item,
      workId: getPersistedWorkIdForItem(item),
    }));
  }
  
  async function waitForPendingItemCreations(itemIds: string[]) {
    const pendingCreations = Array.from(
      new Set(
        itemIds
          .map((itemId) => pendingWorkCreationByItemId.get(itemId))
          .filter((promise): promise is Promise<number> => !!promise),
      ),
    );
  
    if (pendingCreations.length === 0) {
      return;
    }
  
    await Promise.all(pendingCreations);
  }
  
  function mergeCreatedWorkIntoPendingItem(
    itemId: string,
    optimisticItem: DesktopScheduleItem,
    createdWork: DesktopScheduleWorkResponse,
  ) {
    resolvedWorkIdByPendingItemId.set(itemId, createdWork.workId);
  
    workingItems.value = workingItems.value.map((item) => {
      if (item.id !== itemId) {
        return item;
      }
  
      const didEditDateRange =
        item.startDate !== optimisticItem.startDate ||
        item.endDate !== optimisticItem.endDate ||
        item.durationDays !== optimisticItem.durationDays;
  
      return {
        ...item,
        workId: createdWork.workId,
        name:
          item.name === optimisticItem.name
            ? createdWork.workName || item.name
            : item.name,
        startDate: didEditDateRange ? item.startDate : createdWork.startDate,
        endDate: didEditDateRange ? item.endDate : createdWork.completionDate,
        durationDays: didEditDateRange ? item.durationDays : createdWork.workLeadTime,
      };
    });
  }
  
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
  function createCurrentShellLayout(rows: DesktopScheduleRow[]) {
    return desktopScheduleService.buildShellLayout(rows, workingItems.value, timeline.value, {
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
    });
  }
  
  function getActiveScheduleVersionReviewBaselineCache() {
    const reviewState = scheduleVersionReviewState.value;
  
    if (
      !reviewState.open ||
      (reviewState.status !== "loading" && reviewState.status !== "success")
    ) {
      return null;
    }
  
    return scheduleVersionReviewBaselineCache.value;
  }
  
  const baseShellLayout = computed(() => createCurrentShellLayout(workingRows.value));
  const shellLayout = baseShellLayout;
  
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
  const isCurrentMainScheduleVersionSelected = computed(() => {
    const selected = selectedScheduleVersion.value;
    const currentMain = currentMainScheduleVersion.value;
    return Boolean(selected && currentMain && selected.id === currentMain.id);
  });
  const scheduleVersionDisplayName = computed(
    () => selectedScheduleVersion.value?.versionName ?? "공정표",
  );
  const scheduleVersionModeLabel = computed(() =>
    isScheduleReadOnly.value ? "기준 공정표" : "복제본",
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
  
  
  function incrementScheduleVersionPromotionRequestId() {
    scheduleVersionPromotionRequestId += 1;
    return scheduleVersionPromotionRequestId;
  }

  function getScheduleVersionPromotionRequestId() {
    return scheduleVersionPromotionRequestId;
  }

  return {
    scheduleMetadata,
    scheduleLoadState,
    timelineCalendarState,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    contextMenuState,
    colorPaletteState,
    dayWidth,
    rowPanelWidth,
    workTypeColumnWidth,
    chartScrollTop,
    chartScrollLeft,
    localHistoryUndoStack,
    localHistoryRedoStack,
    isLocalHistorySyncInFlight,
    lanePreferenceByItemId,
    interactionSession,
    interactionCancelVersion,
    connectionCreationState,
    renamingDivisionId,
    renamingWorkTypeId,
    renamingSubWorkTypeId,
    renamingItemId,
    renamingMilestoneId,
    scheduleToast,
    scheduleVersionReviewState,
    scheduleVersionPromotionState,
    scheduleImportDialogState,
    isAiVerificationModeActive,
    aiVerificationFlaggedItemIds,
    excludedScheduleVersionIds,
    scheduleVersionReviewBaselineCache,
    scheduleVersionReviewSummaryCache,
    pendingWorkCreationByItemId,
    resolvedWorkIdByPendingItemId,
    scheduleToastTimer,
    getProjectScheduleDateRange,
    getPersistedWorkIdForItem,
    withPersistedWorkIds,
    waitForPendingItemCreations,
    mergeCreatedWorkIntoPendingItem,
    rowById,
    currentZoomIndex,
    canZoomOut,
    canZoomIn,
    maxZoomIndex,
    zoomScale,
    rowHeight,
    barHeight,
    timeline,
    createCurrentShellLayout,
    getActiveScheduleVersionReviewBaselineCache,
    baseShellLayout,
    shellLayout,
    scheduleMeta,
    selectedScheduleVersion,
    selectedScheduleVersionId,
    scheduleVersions,
    draftScheduleVersionCount,
    currentMainScheduleVersion,
    pastMainScheduleVersions,
    isScheduleReadOnly,
    isCurrentMainScheduleVersionSelected,
    scheduleVersionDisplayName,
    scheduleVersionModeLabel,
    scheduleVersionAccessLabel,
    suggestedDraftVersionName,
    canCreateDraftVersion,
    canCompareScheduleVersion,
    canPromoteScheduleVersion,
    scheduleLoadStatus,
    scheduleLoadErrorMessage,
    canUndoLocalHistory,
    canRedoLocalHistory,
    incrementScheduleVersionPromotionRequestId,
    getScheduleVersionPromotionRequestId,
  };
}
