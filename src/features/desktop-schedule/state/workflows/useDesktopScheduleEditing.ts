import type { Ref } from "vue";

import type { DesktopScheduleRow } from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import type { DesktopScheduleLocalSnapshot } from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";

type DesktopScheduleEditingDependencies = {
  workingRows: Ref<DesktopScheduleRow[]>;
  ensureScheduleEditable: () => boolean;
  captureWorkingSnapshot: () => DesktopScheduleLocalSnapshot;
  pushLocalHistoryEntry: (previousSnapshot: DesktopScheduleLocalSnapshot) => void;
  closeContextMenu: () => void;
};

export function useDesktopScheduleEditing({
  workingRows,
  ensureScheduleEditable,
  captureWorkingSnapshot,
  pushLocalHistoryEntry,
  closeContextMenu,
}: DesktopScheduleEditingDependencies) {
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

  return {
    addParentRow,
    addChildRow,
    toggleRowCollapse,
  };
}
