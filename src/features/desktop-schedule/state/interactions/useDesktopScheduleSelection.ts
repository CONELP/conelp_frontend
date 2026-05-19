import type { ComputedRef, Ref } from "vue";

import {
    createEmptyDesktopScheduleSelectionState,
    type DesktopScheduleSelectionState,
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";

type DesktopScheduleSelectionDependencies = {
  selectionState: Ref<DesktopScheduleSelectionState>;
  rowById: Ref<Map<string, { kind: string }>> | ComputedRef<Map<string, { kind: string }>>;
  clearInteractionDrafts: () => void;
  closeContextMenu: () => void;
  closeColorPalette: () => void;
};

export function useDesktopScheduleSelection({
  selectionState,
  rowById,
  clearInteractionDrafts,
  closeContextMenu,
  closeColorPalette,
}: DesktopScheduleSelectionDependencies) {
  function clearSelection() {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    clearInteractionDrafts();
    closeContextMenu();
    closeColorPalette();
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

  return {
    clearSelection,
    selectBars,
    selectRows,
  };
}
