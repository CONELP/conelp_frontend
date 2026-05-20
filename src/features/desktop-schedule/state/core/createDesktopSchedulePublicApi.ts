import { reactive } from "vue";

export function createDesktopSchedulePublicApi(deps: Record<string, any>) {
  const {
    scheduleLoadStatus, scheduleLoadErrorMessage, scheduleToast, loadSchedule, isScheduleReadOnly, isCurrentMainScheduleVersionSelected, notifyReadOnlyScheduleAction,
    scheduleVersions, selectedScheduleVersionId, scheduleVersionDisplayName, scheduleVersionModeLabel, scheduleVersionAccessLabel, suggestedDraftVersionName,
    canCreateDraftVersion, canCompareScheduleVersion, canPromoteScheduleVersion, scheduleVersionReviewState, scheduleVersionPromotionState, pastMainScheduleVersions,
    selectScheduleVersion, createDraftVersionFromCurrent, renameScheduleVersion, deleteScheduleVersion, openScheduleVersionReview, closeScheduleVersionReview,
    requestScheduleVersionPromotion, confirmScheduleVersionPromotion, closeScheduleVersionPromotionDialog, exportScheduleAsExcel, scheduleImportDialogState, openScheduleImportDialog,
    closeScheduleImportDialog, setScheduleImportFile, setScheduleImportStartDate, setScheduleImportEndDate, submitScheduleImport, selectionState, clearSelection, selectBars,
    selectRows, deleteSelection, contextMenuState, contextMenuItems, openItemContextMenu, openWorkConnectionContextMenu, openMilestoneContextMenu, openRowContextMenu,
    openScheduleHeaderContextMenu, openCanvasContextMenu, executeContextMenuCommand, closeContextMenu, colorPaletteState, closeColorPalette, applyColorSelection,
    renamingDivisionId, renamingWorkTypeId, renamingSubWorkTypeId, renamingItemId, renamingMilestoneId, startItemRename, commitItemRename, cancelItemRename,
    startMilestoneRename, commitMilestoneRename, cancelMilestoneRename, startDivisionRename, commitDivisionRename, cancelDivisionRename, startWorkTypeRename,
    commitWorkTypeRename, cancelWorkTypeRename, startSubWorkTypeRename, commitSubWorkTypeRename, cancelSubWorkTypeRename, createReferenceDivisionSet, reorderReferenceDivisions,
    reorderReferenceWorkTypes, reorderReferenceSubWorkTypes, timeline, shellLayout, rowPanelWidth, workTypeColumnWidth, setRowPanelWidth, setWorkTypeColumnWidth,
    chartScrollTop, chartScrollLeft, syncChartScroll, canUndoLocalHistory, canRedoLocalHistory, isLocalHistorySyncInFlight, undoLocalHistory, redoLocalHistory, connectionCreationState,
    cancelConnectionCreation, completeConnectionCreation, activateMilestone, interactionCancelVersion, startMoveSession, draftMoveSession, endMoveSession, startResizeSession,
    draftResizeSession, endResizeSession, zoomScale, currentZoomIndex, maxZoomIndex, canZoomIn, canZoomOut, setZoomIndex, zoomIn, zoomOut,
    isAiVerificationModeActive, aiVerificationFlaggedItemIds, toggleAiVerificationMode, toggleAiVerificationFlag, runAiVerification,
    aiVerificationViolationDetailByItemId, aiVerificationFailedWorkTypeIds, aiVerificationStatus, aiVerificationErrorMessage,
    patchLoadedWorkActualDates, copySelectedItems, cutSelectedItems, pasteCopiedItemsToCanvasTarget,
  } = deps;

  const load = reactive({
    status: scheduleLoadStatus,
    errorMessage: scheduleLoadErrorMessage,
    toast: scheduleToast,
    schedule: loadSchedule,
  });
  
  const access = reactive({
    isReadOnly: isScheduleReadOnly,
    isCurrentMainScheduleVersionSelected,
    notifyReadOnlyAction: notifyReadOnlyScheduleAction,
  });
  
  const version = reactive({
    versions: scheduleVersions,
    selectedId: selectedScheduleVersionId,
    displayName: scheduleVersionDisplayName,
    modeLabel: scheduleVersionModeLabel,
    accessLabel: scheduleVersionAccessLabel,
    suggestedDraftName: suggestedDraftVersionName,
    canCreateDraft: canCreateDraftVersion,
    canCompare: canCompareScheduleVersion,
    canPromote: canPromoteScheduleVersion,
    reviewState: scheduleVersionReviewState,
    promotionState: scheduleVersionPromotionState,
    pastMainVersions: pastMainScheduleVersions,
    select: selectScheduleVersion,
    createDraftFromCurrent: createDraftVersionFromCurrent,
    renameDraft: renameScheduleVersion,
    deleteDraft: deleteScheduleVersion,
    openReview: openScheduleVersionReview,
    closeReview: closeScheduleVersionReview,
    requestPromotion: requestScheduleVersionPromotion,
    confirmPromotion: confirmScheduleVersionPromotion,
    closePromotionDialog: closeScheduleVersionPromotionDialog,
    exportAsExcel: exportScheduleAsExcel,
  });
  
  const importFlow = reactive({
    state: scheduleImportDialogState,
    open: openScheduleImportDialog,
    close: closeScheduleImportDialog,
    setFile: setScheduleImportFile,
    setStartDate: setScheduleImportStartDate,
    setEndDate: setScheduleImportEndDate,
    submit: submitScheduleImport,
  });
  
  const selection = reactive({
    state: selectionState,
    clear: clearSelection,
    selectBars,
    selectRows,
    deleteSelection,
  });

  const clipboard = reactive({
    copyItems: copySelectedItems,
    cutItems: cutSelectedItems,
    pasteItemsToCell: pasteCopiedItemsToCanvasTarget,
  });
  
  const contextMenu = reactive({
    state: contextMenuState,
    items: contextMenuItems,
    openItem: openItemContextMenu,
    openWorkConnection: openWorkConnectionContextMenu,
    openMilestone: openMilestoneContextMenu,
    openRow: openRowContextMenu,
    openHeader: openScheduleHeaderContextMenu,
    openCanvas: openCanvasContextMenu,
    execute: executeContextMenuCommand,
    close: closeContextMenu,
  });
  
  const colorPalette = reactive({
    state: colorPaletteState,
    close: closeColorPalette,
    apply: applyColorSelection,
  });
  
  const rename = reactive({
    divisionId: renamingDivisionId,
    workTypeId: renamingWorkTypeId,
    subWorkTypeId: renamingSubWorkTypeId,
    itemId: renamingItemId,
    milestoneId: renamingMilestoneId,
    startItem: startItemRename,
    commitItem: commitItemRename,
    cancelItem: cancelItemRename,
    startMilestone: startMilestoneRename,
    commitMilestone: commitMilestoneRename,
    cancelMilestone: cancelMilestoneRename,
  });
  
  const reference = reactive({
    createDivision: createReferenceDivisionSet,
    startDivisionRename,
    commitDivisionRename,
    cancelDivisionRename,
    startWorkTypeRename,
    commitWorkTypeRename,
    cancelWorkTypeRename,
    startSubWorkTypeRename,
    commitSubWorkTypeRename,
    cancelSubWorkTypeRename,
    reorderDivisions: reorderReferenceDivisions,
    reorderWorkTypes: reorderReferenceWorkTypes,
    reorderSubWorkTypes: reorderReferenceSubWorkTypes,
  });
  
  const layout = reactive({
    timeline,
    shell: shellLayout,
    rowPanelWidth,
    workTypeColumnWidth,
    setRowPanelWidth,
    setWorkTypeColumnWidth,
  });
  
  const scroll = reactive({
    top: chartScrollTop,
    left: chartScrollLeft,
    syncChart: syncChartScroll,
  });
  
  const history = reactive({
    canUndo: canUndoLocalHistory,
    canRedo: canRedoLocalHistory,
    isSyncing: isLocalHistorySyncInFlight,
    undo: undoLocalHistory,
    redo: redoLocalHistory,
  });
  
  const connection = reactive({
    creationState: connectionCreationState,
    cancelCreation: cancelConnectionCreation,
    completeCreation: completeConnectionCreation,
  });
  
  const milestone = reactive({
    activate: activateMilestone,
  });
  
  const interaction = reactive({
    cancelVersion: interactionCancelVersion,
    startMove: startMoveSession,
    draftMove: draftMoveSession,
    endMove: endMoveSession,
    startResize: startResizeSession,
    draftResize: draftResizeSession,
    endResize: endResizeSession,
  });
  
  const zoom = reactive({
    scale: zoomScale,
    currentIndex: currentZoomIndex,
    maxIndex: maxZoomIndex,
    canZoomIn,
    canZoomOut,
    setIndex: setZoomIndex,
    zoomIn,
    zoomOut,
  });
  
  const aiVerification = reactive({
    isActive: isAiVerificationModeActive,
    flaggedItemIds: aiVerificationFlaggedItemIds,
    violationDetailByItemId: aiVerificationViolationDetailByItemId,
    failedWorkTypeIds: aiVerificationFailedWorkTypeIds,
    status: aiVerificationStatus,
    errorMessage: aiVerificationErrorMessage,
    toggleMode: toggleAiVerificationMode,
    toggleFlag: toggleAiVerificationFlag,
    run: runAiVerification,
  });
  
  const dailyReport = reactive({
    patchLoadedWorkActualDates,
  });
  
  return {
    load,
    access,
    version,
    importFlow,
    selection,
    clipboard,
    contextMenu,
    colorPalette,
    rename,
    reference,
    layout,
    scroll,
    history,
    connection,
    milestone,
    interaction,
    zoom,
    aiVerification,
    dailyReport,
  };
}
