import { computed } from "vue";

import { createDesktopSchedulePublicApi } from "@/features/desktop-schedule/state/core/createDesktopSchedulePublicApi";
import {
    DEFAULT_DIVISION_NAME,
    DEFAULT_NEW_WORK_LEAD_TIME,
    DEFAULT_SUB_WORK_TYPE_COLOR_HEX,
    DEFAULT_SUB_WORK_TYPE_NAME,
    DEFAULT_WORK_TYPE_NAME,
    LOCAL_HISTORY_MAX_ENTRIES,
    MAX_DRAFT_SCHEDULE_VERSION_COUNT,
    clampScheduleNumber,
    createClosedScheduleImportDialogState,
    createClosedScheduleVersionPromotionState,
    createClosedScheduleVersionReviewState,
    createEmptyScheduleSnapshot,
    createEmptyTimelineCalendarState,
    createOptimisticReferenceId,
    createSuggestedDraftVersionName,
    createTimelineCalendarState,
    createUniqueReferenceName,
    diffScheduleDays,
    getMutationErrorToastMessage,
    getWorkLeadTimeWithinProject,
    ignoreMissingHistoryDelete,
    isDateWithinProjectRange,
    isSameConnectionItemPair,
    loadDesktopScheduleUiPreferences,
    normalizeError,
    promptForName,
    shouldSwapConnectionDirection,
    sortScheduleVersionsForWorkflow,
    type ScheduleMutationOptions,
    type TimelineCalendarState
} from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import { useDesktopScheduleCoreState } from "@/features/desktop-schedule/state/core/useDesktopScheduleCoreState";
import { useDesktopScheduleData } from "@/features/desktop-schedule/state/core/useDesktopScheduleData";
import { useDesktopScheduleDragSession } from "@/features/desktop-schedule/state/interactions/useDesktopScheduleDragSession";
import { useDesktopScheduleInteractionSessions } from "@/features/desktop-schedule/state/interactions/useDesktopScheduleInteractionSessions";
import { useDesktopScheduleProjectBounds } from "@/features/desktop-schedule/state/interactions/useDesktopScheduleProjectBounds";
import { useDesktopScheduleSelection } from "@/features/desktop-schedule/state/interactions/useDesktopScheduleSelection";
import { useDesktopScheduleZoomControls } from "@/features/desktop-schedule/state/interactions/useDesktopScheduleZoomControls";
import type {
    MoveSession,
    ResizeSession,
    SummaryResizeSession,
} from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";
import { useDesktopScheduleAiVerification } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleAiVerification";
import { useDesktopScheduleConnectionMilestoneWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleConnectionMilestoneWorkflow";
import { useDesktopScheduleContextMenuCommands } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleContextMenuCommands";
import { useDesktopScheduleEditing } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleEditing";
import { useDesktopScheduleHistoryWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleHistoryWorkflow";
import { useDesktopScheduleImportExport } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleImportExport";
import { useDesktopScheduleItemMilestoneWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleItemMilestoneWorkflow";
import { useDesktopScheduleLoadedDataWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleLoadedDataWorkflow";
import { useDesktopScheduleReferenceMutations } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleReferenceMutations";
import { useDesktopScheduleUiWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleUiWorkflow";
import { useDesktopScheduleVersionHistory } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleVersionHistory";
import { useDesktopScheduleVersionReviewWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleVersionReviewWorkflow";
import { useDesktopScheduleVersionWorkflow } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleVersionWorkflow";
import { useDesktopScheduleWorkPersistence } from "@/features/desktop-schedule/state/workflows/useDesktopScheduleWorkPersistence";

function createDesktopScheduleViewModel() {
  const storedUiPreferences = loadDesktopScheduleUiPreferences();
  const core = useDesktopScheduleCoreState(storedUiPreferences);
  const {
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
    selectedScheduleVersion,
    selectedScheduleVersionId,
    scheduleVersions,
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
  } = core;

  const uiWorkflow = useDesktopScheduleUiWorkflow({
    storedUiPreferences,
    scheduleToastTimer,
    contextMenuState,
    colorPaletteState,
    scheduleToast,
    dayWidth,
    rowPanelWidth,
    workTypeColumnWidth,
    chartScrollTop,
    chartScrollLeft,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    lanePreferenceByItemId,
    pendingWorkCreationByItemId,
    resolvedWorkIdByPendingItemId,
    interactionSession,
    connectionCreationState,
    renamingDivisionId,
    renamingWorkTypeId,
    renamingSubWorkTypeId,
    renamingItemId,
    renamingMilestoneId,
    selectionState,
    scheduleMetadata,
    selectedScheduleVersion,
    isScheduleReadOnly,
    interactionCancelVersion,
  });
  const {
    trackScheduleAction,
    trackScheduleMutationResult,
    trackCreateReferenceDraft,
    closeContextMenu,
    closeColorPalette,
    persistUiPreferences,
    showScheduleToast,
    notifyReadOnlyScheduleAction,
    ensureScheduleEditable,
    syncChartScroll,
    setRowPanelWidth,
    setWorkTypeColumnWidth,
    applyScheduleSnapshot,
  } = uiWorkflow;

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

  const loadedDataWorkflow = useDesktopScheduleLoadedDataWorkflow({
    selectionState,
    renamingMilestoneId,
    scheduleLoadState,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    applyScheduleSnapshot,
  });
  const {
    updateLoadedScheduleData,
    applyServerMutationPatch,
    removeLoadedWorksAndWorkDeps,
    removeLoadedWorkDeps,
    syncLoadedDataFromWorkingItemsAndConnections,
    syncLoadedWorkName,
    patchLoadedWorkActualDates,
    syncLoadedSubWorkTypeColor,
    upsertLoadedMilestone,
    syncLoadedMilestoneFromModel,
    removeLoadedMilestones,
    replaceWorkingMilestoneWithApiMilestone,
    rebuildScheduleFromLoadedData,
    addReferenceHierarchyItem,
    addReferenceSubWorkTypeItem,
    replaceReferenceDivisionId,
    replaceReferenceWorkTypeId,
    replaceReferenceSubWorkTypeId,
    getHierarchyForDivision,
    getHierarchyForWorkType,
    updateReferenceNameLocally,
    removeReferenceLocally,
    sortHierarchyByDivisionIds,
    sortHierarchyBySubWorkTypeIds,
    sortHierarchyByWorkTypeIds,
  } = loadedDataWorkflow;

  const workPersistence = useDesktopScheduleWorkPersistence({
    workingItems,
    workingWorkConnections,
    getWorkConnectionById,
    getPersistedWorkIdForItem,
    waitForPendingItemCreations,
    applyServerMutationPatch,
  });
  const {
    createWorkUpdateRequest,
    orderWorkUpdateItemsByDependency,
    persistWorkConnectionGapChanges,
    persistItemDateAndLayoutChanges,
  } = workPersistence;

  const historyWorkflow = useDesktopScheduleHistoryWorkflow({
    LOCAL_HISTORY_MAX_ENTRIES,
    scheduleLoadState,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    interactionSession,
    connectionCreationState,
    renamingDivisionId,
    renamingWorkTypeId,
    renamingSubWorkTypeId,
    renamingItemId,
    renamingMilestoneId,
    lanePreferenceByItemId,
    localHistoryUndoStack,
    localHistoryRedoStack,
    isLocalHistorySyncInFlight,
    closeContextMenu,
    closeColorPalette,
    getRequiredScheduleVersionIdForReferenceMutation,
    getSelectedScheduleVersionId,
    applyServerMutationPatch,
    handleMutationError,
    trackScheduleAction,
    ignoreMissingHistoryDelete,
  });
  const {
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    pushLocalHistoryEntry,
    clearLocalHistory,
    moveLocalHistoryStackAndPersist,
  } = historyWorkflow;

  const { loadSchedule } = useDesktopScheduleData<TimelineCalendarState>({
    scheduleVersionReviewState,
    createClosedScheduleVersionReviewState,
    incrementScheduleVersionPromotionRequestId,
    scheduleVersionPromotionState,
    createClosedScheduleVersionPromotionState,
    scheduleLoadState,
    timelineCalendarState,
    createTimelineCalendarState,
    createEmptyTimelineCalendarState,
    applyScheduleSnapshot,
    createEmptyScheduleSnapshot,
    clearLocalHistory,
    scheduleVersionReviewBaselineCache,
    scheduleVersionReviewSummaryCache,
    normalizeError,
  });

  const projectBounds = useDesktopScheduleProjectBounds({
    selectionState,
    interactionSession,
    interactionCancelVersion,
    workingItems,
    timeline,
    showScheduleToast,
    diffScheduleDays,
    clampScheduleNumber,
    getProjectScheduleDateRange,
    isDateWithinProjectRange,
    getWorkLeadTimeWithinProject,
  });
  const {
    alertWorkConnectionPredecessorLimitOnce,
    createProjectBoundMoveResult,
    createProjectBoundResizeResult,
  } = projectBounds;

  const { draftMoveSession, draftResizeSession } = useDesktopScheduleDragSession({
    isScheduleReadOnly: () => isScheduleReadOnly.value,
    getInteractionSession: () => interactionSession.value,
    setInteractionSession: (session) => {
      interactionSession.value = session as
        | MoveSession
        | ResizeSession
        | SummaryResizeSession
        | null;
    },
    getWorkingMilestones: () => workingMilestones.value,
    setWorkingMilestones: (milestones) => {
      workingMilestones.value = milestones;
    },
    getWorkingRows: () => workingRows.value,
    setWorkingRows: (rows) => {
      workingRows.value = rows;
    },
    getWorkingItems: () => workingItems.value,
    setWorkingItems: (items) => {
      workingItems.value = items;
    },
    setWorkingWorkConnections: (workConnections) => {
      workingWorkConnections.value = workConnections;
    },
    createProjectBoundMoveResult,
    createProjectBoundResizeResult,
    alertWorkConnectionPredecessorLimitOnce,
  });

  const { clearSelection, selectBars, selectRows } = useDesktopScheduleSelection({
    selectionState,
    rowById,
    clearInteractionDrafts: () => {
      connectionCreationState.value = null;
      renamingItemId.value = null;
      renamingMilestoneId.value = null;
    },
    closeContextMenu,
    closeColorPalette,
  });

  const {
    closeScheduleVersionReview,
    createScheduleVersionReviewCurrentLayout,
    openScheduleVersionReview,
    resolveScheduleVersionReviewSummary,
  } = useDesktopScheduleVersionReviewWorkflow({
    scheduleLoadState,
    selectedScheduleVersion,
    scheduleVersions,
    scheduleVersionReviewState,
    scheduleVersionReviewBaselineCache,
    scheduleVersionReviewSummaryCache,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    timeline,
    rowHeight,
    barHeight,
    lanePreferenceByItemId,
    createCurrentShellLayout,
    showScheduleToast,
    trackScheduleAction,
    normalizeError,
  });

  const shellLayout = computed(() => {
    const baselineCache = getActiveScheduleVersionReviewBaselineCache();
    return baselineCache
      ? createScheduleVersionReviewCurrentLayout(baselineCache)
      : baseShellLayout.value;
  });

  const versionWorkflow = useDesktopScheduleVersionWorkflow({
    MAX_DRAFT_SCHEDULE_VERSION_COUNT,
    canCreateDraftVersion,
    sortScheduleVersionsForWorkflow,
    scheduleLoadState,
    selectedScheduleVersion,
    selectedScheduleVersionId,
    scheduleVersions,
    excludedScheduleVersionIds,
    scheduleVersionReviewBaselineCache,
    scheduleVersionReviewSummaryCache,
    scheduleVersionPromotionState,
    createClosedScheduleVersionPromotionState,
    getSelectedScheduleVersionId,
    getRequiredScheduleVersionIdForReferenceMutation,
    createSuggestedDraftVersionName,
    loadSchedule,
    showScheduleToast,
    handleMutationError,
    updateLoadedScheduleData,
    resolveScheduleVersionReviewSummary,
    normalizeError,
    trackScheduleAction,
    incrementScheduleVersionPromotionRequestId,
    getScheduleVersionPromotionRequestId,
  });
  const {
    selectScheduleVersion,
    createDraftVersionFromCurrent,
    renameScheduleVersion,
    deleteScheduleVersion,
    closeScheduleVersionPromotionDialog,
    requestScheduleVersionPromotion,
    confirmScheduleVersionPromotion,
  } = versionWorkflow;

  const {
    createReferenceDivisionSet,
    createReferenceWorkTypeSet,
    createReferenceSubWorkTypeSet,
    startDivisionRename,
    commitDivisionRename,
    cancelDivisionRename,
    startWorkTypeRename,
    commitWorkTypeRename,
    cancelWorkTypeRename,
    startSubWorkTypeRename,
    commitSubWorkTypeRename,
    cancelSubWorkTypeRename,
    reorderReferenceDivisions,
    reorderReferenceSubWorkTypes,
    reorderReferenceWorkTypes,
  } = useDesktopScheduleReferenceMutations({
    DEFAULT_DIVISION_NAME,
    DEFAULT_WORK_TYPE_NAME,
    DEFAULT_SUB_WORK_TYPE_NAME,
    DEFAULT_SUB_WORK_TYPE_COLOR_HEX,
    scheduleLoadState,
    workingRows,
    renamingDivisionId,
    renamingWorkTypeId,
    renamingSubWorkTypeId,
    renamingItemId,
    renamingMilestoneId,
    ensureScheduleEditable,
    captureWorkingSnapshot,
    pushLocalHistoryEntry,
    restoreWorkingSnapshot,
    closeContextMenu,
    showScheduleToast,
    handleMutationError,
    trackScheduleAction,
    trackScheduleMutationResult,
    trackCreateReferenceDraft,
    runScheduleMutation,
    updateLoadedScheduleData,
    rebuildScheduleFromLoadedData,
    addReferenceHierarchyItem,
    addReferenceSubWorkTypeItem,
    replaceReferenceDivisionId,
    replaceReferenceWorkTypeId,
    replaceReferenceSubWorkTypeId,
    updateReferenceNameLocally,
    getHierarchyForDivision,
    getHierarchyForWorkType,
    createOptimisticReferenceId,
    createUniqueReferenceName,
    getRequiredScheduleVersionIdForReferenceMutation,
    sortHierarchyByDivisionIds,
    sortHierarchyBySubWorkTypeIds,
    sortHierarchyByWorkTypeIds,
  });

  const itemMilestoneWorkflow = useDesktopScheduleItemMilestoneWorkflow({
    DEFAULT_SUB_WORK_TYPE_COLOR_HEX,
    getProjectScheduleDateRange,
    isDateWithinProjectRange,
    getSelectedScheduleVersionId,
    handleMutationError,
    waitForPendingItemCreations,
    getPersistedWorkIdForItem,
    syncLoadedMilestoneFromModel,
    DEFAULT_NEW_WORK_LEAD_TIME,
    scheduleLoadState,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    contextMenuState,
    promptForName,
    colorPaletteState,
    renamingItemId,
    renamingMilestoneId,
    connectionCreationState,
    selectedScheduleVersionId,
    timeline,
    rowById,
    ensureScheduleEditable,
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    pushLocalHistoryEntry,
    closeContextMenu,
    closeColorPalette,
    showScheduleToast,
    trackScheduleAction,
    trackScheduleMutationResult,
    runScheduleMutation,
    getRequiredScheduleVersionIdForReferenceMutation,
    getWorkConnectionById,
    createWorkUpdateRequest,
    orderWorkUpdateItemsByDependency,
    applyServerMutationPatch,
    removeLoadedWorksAndWorkDeps,
    removeLoadedWorkDeps,
    syncLoadedDataFromWorkingItemsAndConnections,
    syncLoadedWorkName,
    syncLoadedSubWorkTypeColor,
    upsertLoadedMilestone,
    removeLoadedMilestones,
    replaceWorkingMilestoneWithApiMilestone,
    removeReferenceLocally,
    createReferenceDivisionSet,
    createReferenceWorkTypeSet,
    createReferenceSubWorkTypeSet,
    getWorkLeadTimeWithinProject,
    mergeCreatedWorkIntoPendingItem,
    pendingWorkCreationByItemId,
    resolvedWorkIdByPendingItemId,
  });
  const {
    getScopedItemIds,
    deleteSelection,
    canCreateItemOnCanvasTarget,
    canCreateMilestoneOnCanvasTarget,
    openItemContextMenu,
    openWorkConnectionContextMenu,
    openMilestoneContextMenu,
    openRowContextMenu,
    openScheduleHeaderContextMenu,
    openCanvasContextMenu,
    openColorPalette,
    applyColorSelection,
    createItemOnCanvasTarget,
    startItemRename,
    commitItemRename,
    cancelItemRename,
    startMilestoneRename,
    commitMilestoneRename,
    cancelMilestoneRename,
  } = itemMilestoneWorkflow;

  const connectionMilestoneWorkflow = useDesktopScheduleConnectionMilestoneWorkflow({
    ensureScheduleEditable,
    getSelectedScheduleVersionId,
    handleMutationError,
    closeContextMenu,
    waitForPendingItemCreations,
    getPersistedWorkIdForItem,
    createUniqueReferenceName,
    connectionCreationState,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    pushLocalHistoryEntry,
    runScheduleMutation,
    trackScheduleMutationResult,
    getWorkConnectionById,
    getRequiredScheduleVersionIdForReferenceMutation,
    applyServerMutationPatch,
    syncLoadedDataFromWorkingItemsAndConnections,
    upsertLoadedMilestone,
    replaceWorkingMilestoneWithApiMilestone,
    isSameConnectionItemPair,
    shouldSwapConnectionDirection,
  });
  const { cancelConnectionCreation, completeConnectionCreation, activateMilestone } = connectionMilestoneWorkflow;

  const { contextMenuItems, executeContextMenuCommand } = useDesktopScheduleContextMenuCommands({
    ensureScheduleEditable,
    scheduleLoadState,
    startDivisionRename,
    startWorkTypeRename,
    startSubWorkTypeRename,
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    pushLocalHistoryEntry,
    getHierarchyForDivision,
    getHierarchyForWorkType,
    removeReferenceLocally,
    runScheduleMutation,
    getRequiredScheduleVersionIdForReferenceMutation,
    trackScheduleMutationResult,
    promptForName,
    workingRows,
    getScopedItemIds,
    removeLoadedWorksAndWorkDeps,
    removeLoadedWorkDeps,
    removeLoadedMilestones,
    renamingItemId,
    renamingMilestoneId,
    getWorkConnectionById,
    trackScheduleAction,
    contextMenuState,
    selectionState,
    colorPaletteState,
    rowById,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    isScheduleReadOnly,
    connectionCreationState,
    closeContextMenu,
    closeColorPalette,
    showScheduleToast,
    notifyReadOnlyScheduleAction,
    canCreateItemOnCanvasTarget,
    canCreateMilestoneOnCanvasTarget,
    openColorPalette,
    createReferenceDivisionSet,
    createReferenceWorkTypeSet,
    createReferenceSubWorkTypeSet,
    deleteSelection,
    createItemOnCanvasTarget,
    startItemRename,
    startMilestoneRename,
    cancelConnectionCreation,
    completeConnectionCreation,
    activateMilestone,
  });

  const { startMoveSession, endMoveSession, startResizeSession, endResizeSession } =
    useDesktopScheduleInteractionSessions({
    ensureScheduleEditable,
    selectionState,
      isScheduleReadOnly,
      interactionSession,
      workingRows,
      workingItems,
      workingWorkConnections,
      workingMilestones,
      shellLayout,
      lanePreferenceByItemId,
      clearSelection,
      selectBars,
      captureWorkingSnapshot,
      restoreWorkingSnapshot,
      pushLocalHistoryEntry,
      runScheduleMutation,
      trackScheduleMutationResult,
      persistItemDateAndLayoutChanges,
      persistWorkConnectionGapChanges,
      syncLoadedDataFromWorkingItemsAndConnections,
      syncLoadedMilestoneFromModel,
      withPersistedWorkIds,
      getRequiredScheduleVersionIdForReferenceMutation,
    });

  const { setZoomIndex, zoomIn, zoomOut } = useDesktopScheduleZoomControls({
    dayWidth,
    chartScrollLeft,
    timeline,
    currentZoomIndex,
    maxZoomIndex,
    canZoomIn,
    canZoomOut,
    persistUiPreferences,
    closeContextMenu,
  });

  const {
    exportScheduleAsExcel,
    openScheduleImportDialog,
    closeScheduleImportDialog,
    setScheduleImportFile,
    setScheduleImportStartDate,
    setScheduleImportEndDate,
    submitScheduleImport,
  } = useDesktopScheduleImportExport({
    scheduleImportDialogState,
    createClosedScheduleImportDialogState,
    getSelectedScheduleVersionId: () => selectedScheduleVersionId.value,
    isScheduleReadOnly: () => isScheduleReadOnly.value,
    notifyReadOnlyScheduleAction,
    showScheduleToast,
    trackScheduleAction,
    loadSchedule,
  });

  const { toggleAiVerificationMode, toggleAiVerificationFlag } = useDesktopScheduleAiVerification({
    selectedScheduleVersionId,
    isAiVerificationModeActive,
    aiVerificationFlaggedItemIds,
    workingRows,
    workingItems,
    captureWorkingSnapshot,
    pushLocalHistoryEntry,
    syncLoadedSubWorkTypeColor,
    trackScheduleAction,
  });

  const { addParentRow, addChildRow, toggleRowCollapse } = useDesktopScheduleEditing({
    workingRows,
    ensureScheduleEditable,
    captureWorkingSnapshot,
    pushLocalHistoryEntry,
    closeContextMenu,
  });

  const { undoLocalHistory, redoLocalHistory } = useDesktopScheduleVersionHistory({
    localHistoryUndoStack,
    localHistoryRedoStack,
    interactionSession,
    isLocalHistorySyncInFlight,
    moveLocalHistoryStackAndPersist,
  });

  return createDesktopSchedulePublicApi({
    scheduleLoadStatus, scheduleLoadErrorMessage, scheduleToast, loadSchedule, isScheduleReadOnly, isCurrentMainScheduleVersionSelected, notifyReadOnlyScheduleAction, scheduleVersions,
    selectedScheduleVersionId, scheduleVersionDisplayName, scheduleVersionModeLabel, scheduleVersionAccessLabel, suggestedDraftVersionName, canCreateDraftVersion, canCompareScheduleVersion, canPromoteScheduleVersion,
    scheduleVersionReviewState, scheduleVersionPromotionState, pastMainScheduleVersions, selectScheduleVersion, createDraftVersionFromCurrent, renameScheduleVersion, deleteScheduleVersion, openScheduleVersionReview,
    closeScheduleVersionReview, requestScheduleVersionPromotion, confirmScheduleVersionPromotion, closeScheduleVersionPromotionDialog, exportScheduleAsExcel, scheduleImportDialogState, openScheduleImportDialog, closeScheduleImportDialog,
    setScheduleImportFile, setScheduleImportStartDate, setScheduleImportEndDate, submitScheduleImport, selectionState, clearSelection, selectBars, selectRows,
    deleteSelection, contextMenuState, contextMenuItems, openItemContextMenu, openWorkConnectionContextMenu, openMilestoneContextMenu, openRowContextMenu, openScheduleHeaderContextMenu,
    openCanvasContextMenu, executeContextMenuCommand, closeContextMenu, colorPaletteState, closeColorPalette, applyColorSelection, renamingDivisionId, renamingWorkTypeId,
    renamingSubWorkTypeId, renamingItemId, renamingMilestoneId, startItemRename, commitItemRename, cancelItemRename, startMilestoneRename, commitMilestoneRename,
    cancelMilestoneRename, startDivisionRename, commitDivisionRename, cancelDivisionRename, startWorkTypeRename, commitWorkTypeRename, cancelWorkTypeRename, startSubWorkTypeRename,
    commitSubWorkTypeRename, cancelSubWorkTypeRename, reorderReferenceDivisions, reorderReferenceWorkTypes, reorderReferenceSubWorkTypes, timeline, shellLayout, rowPanelWidth,
    workTypeColumnWidth, setRowPanelWidth, setWorkTypeColumnWidth, chartScrollTop, chartScrollLeft, syncChartScroll, canUndoLocalHistory, canRedoLocalHistory,
    undoLocalHistory, redoLocalHistory, connectionCreationState, cancelConnectionCreation, completeConnectionCreation, activateMilestone, interactionCancelVersion, startMoveSession,
    draftMoveSession, endMoveSession, startResizeSession, draftResizeSession, endResizeSession, zoomScale, currentZoomIndex, maxZoomIndex,
    canZoomIn, canZoomOut, setZoomIndex, zoomIn, zoomOut, isAiVerificationModeActive, aiVerificationFlaggedItemIds, toggleAiVerificationMode,
    toggleAiVerificationFlag, patchLoadedWorkActualDates,
  });
}

type DesktopScheduleViewModel = ReturnType<typeof createDesktopScheduleViewModel>;

let desktopScheduleViewModel: DesktopScheduleViewModel | null = null;

export function useDesktopScheduleViewModel() {
  desktopScheduleViewModel ??= createDesktopScheduleViewModel();
  return desktopScheduleViewModel;
}
