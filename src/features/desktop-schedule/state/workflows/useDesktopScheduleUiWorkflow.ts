import type { ComputedRef, Ref } from "vue";

import type { DesktopScheduleVersionResponse } from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type { DesktopScheduleSnapshot } from "@/features/desktop-schedule/model/desktop-schedule.types";
import { cloneItems, cloneMilestones, cloneRows, cloneWorkConnections } from "@/features/desktop-schedule/services/domain/desktop-schedule-history.service";
import {
    DESKTOP_SCHEDULE_UI_PREFERENCES_STORAGE_KEY,
    ROW_PANEL_MAX_WIDTH,
    ROW_PANEL_MIN_WIDTH,
    WORK_TYPE_COLUMN_MAX_WIDTH,
    WORK_TYPE_COLUMN_MIN_WIDTH,
    clampNumber,
    createClosedColorPaletteState,
    type DesktopScheduleUiPreferences,
    type ScheduleToastState,
} from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import { createClosedDesktopScheduleContextMenuState, createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { analyticsClient } from "@/shared/analytics/analytics-stub";

type DesktopScheduleUiWorkflowDeps = Record<string, any> & {
  selectedScheduleVersion: ComputedRef<DesktopScheduleVersionResponse | null>;
  isScheduleReadOnly: ComputedRef<boolean>;
  interactionCancelVersion: Ref<number>;
};

export function useDesktopScheduleUiWorkflow(deps: DesktopScheduleUiWorkflowDeps) {
  const {
    storedUiPreferences,
    scheduleToastTimer,
    contextMenuState,
    colorPaletteState,
    scheduleToast,
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
  } = deps;
  let currentUiPreferences = { ...storedUiPreferences };

  function trackScheduleAction(
    action: string,
    result: "success" | "fail" | "attempt",
    meta: Record<string, unknown> = {},
  ) {
    const version = selectedScheduleVersion.value;
  
    analyticsClient.trackAction("schedule", action, result, {
      version_mode: version ? (version.isMain ? "main" : "draft") : "none",
      read_only: isScheduleReadOnly.value,
      ...meta,
    });
  }
  
  function trackScheduleMutationResult(
    action: string,
    didSave: boolean,
    meta: Record<string, unknown> = {},
  ) {
    trackScheduleAction(action, didSave ? "success" : "fail", meta);
  }
  
  function trackCreateReferenceDraft(referenceKind: "division" | "work_type" | "sub_work_type") {
    trackScheduleAction("create_reference_draft", "success", {
      reference_kind: referenceKind,
    });
  }
  
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
  
    if (scheduleToastTimer.value !== null) {
      window.clearTimeout(scheduleToastTimer.value);
    }
  
    scheduleToastTimer.value = window.setTimeout(() => {
      scheduleToast.value = {
        ...scheduleToast.value,
        visible: false,
      };
      scheduleToastTimer.value = null;
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
      "기준 공정표는 직접 수정할 수 없어요. 복제본을 만들어 수정해 주세요.",
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
  
  function applyScheduleSnapshot(nextSnapshot: DesktopScheduleSnapshot) {
    scheduleMetadata.value = nextSnapshot.metadata;
    workingRows.value = cloneRows(nextSnapshot.rows);
    workingItems.value = cloneItems(nextSnapshot.items);
    workingWorkConnections.value = cloneWorkConnections(nextSnapshot.workConnections);
    workingMilestones.value = cloneMilestones(nextSnapshot.milestones);
    lanePreferenceByItemId.value = {};
    pendingWorkCreationByItemId.clear();
    resolvedWorkIdByPendingItemId.clear();
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
  
  
  return {
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
  };
}
