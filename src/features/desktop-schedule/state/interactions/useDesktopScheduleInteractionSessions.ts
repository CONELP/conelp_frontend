import { type ComputedRef, type Ref } from "vue";

import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleShellLayout,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    cloneItems,
    cloneMilestones,
    cloneRows,
    cloneWorkConnections
} from "@/features/desktop-schedule/services/domain/desktop-schedule-history.service";
import {
    getMilestoneApiId
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type { MoveSession, ResizeSession, SummaryResizeSession } from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";
import type {
    DesktopScheduleSelectionState
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";


type AnyFunction = (...args: any[]) => any;

type DesktopScheduleInteractionSessionsDeps = Record<string, any> & {
  isScheduleReadOnly: ComputedRef<boolean>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  interactionSession: Ref<MoveSession | ResizeSession | SummaryResizeSession | null>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  shellLayout: ComputedRef<DesktopScheduleShellLayout>;
  lanePreferenceByItemId: Ref<Record<string, number>>;
  clearSelection: AnyFunction;
  selectBars: AnyFunction;
  captureWorkingSnapshot: AnyFunction;
  restoreWorkingSnapshot: AnyFunction;
  pushLocalHistoryEntry: AnyFunction;
  runScheduleMutation: AnyFunction;
  trackScheduleMutationResult: AnyFunction;
  persistItemDateAndLayoutChanges: AnyFunction;
  persistWorkConnectionGapChanges: AnyFunction;
  syncLoadedDataFromWorkingItemsAndConnections: AnyFunction;
  syncLoadedMilestoneFromModel: (milestone: DesktopScheduleMilestone) => void;
  withPersistedWorkIds: (items: DesktopScheduleItem[]) => DesktopScheduleItem[];
};

export function useDesktopScheduleInteractionSessions(deps: DesktopScheduleInteractionSessionsDeps) {
  const {
    isScheduleReadOnly,
    ensureScheduleEditable,
    selectionState,
    closeContextMenu,
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
  } = deps;

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
      trackScheduleMutationResult("move_item", didSave, {
        target_kind: "milestone",
        item_count: movedMilestones.length,
      });
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
        await persistItemDateAndLayoutChanges(
          baseItems,
          nextItems,
          session.itemIds,
          nextWorkConnections,
        );
        await persistWorkConnectionGapChanges(
          baseWorkConnections,
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
      syncLoadedDataFromWorkingItemsAndConnections(
        withPersistedWorkIds(nextItems),
        nextWorkConnections,
      );
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("move_item", didSave, {
      target_kind: "item",
      item_count: session.itemIds.length,
    });
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
        await persistItemDateAndLayoutChanges(
          baseItems,
          nextItems,
          [session.itemId],
          nextWorkConnections,
        );
        await persistWorkConnectionGapChanges(
          baseWorkConnections,
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
      syncLoadedDataFromWorkingItemsAndConnections(
        withPersistedWorkIds(nextItems),
        nextWorkConnections,
      );
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("resize_item", didSave);
  }
  
  
  return {
    startMoveSession,
    endMoveSession,
    startResizeSession,
    endResizeSession,
  };
}
