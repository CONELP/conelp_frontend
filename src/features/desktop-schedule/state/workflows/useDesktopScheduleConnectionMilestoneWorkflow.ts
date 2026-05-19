import { type Ref } from "vue";

import type {
    DesktopScheduleVersionId
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import type { ConnectionCreationState } from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import type {
    DesktopScheduleSelectionState
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";


type AnyFunction = (...args: any[]) => any;

type DesktopScheduleConnectionMilestoneWorkflowDeps = Record<string, any> & {
  connectionCreationState: Ref<ConnectionCreationState | null>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  getSelectedScheduleVersionId: () => DesktopScheduleVersionId | null;
  waitForPendingItemCreations: (itemIds: string[]) => Promise<void>;
  getPersistedWorkIdForItem: (item: DesktopScheduleItem) => number;
  createUniqueReferenceName: (baseName: string, existingNames: string[]) => string;
  isSameConnectionItemPair: (workConnection: DesktopScheduleWorkConnection, sourceItemId: string, targetItemId: string) => boolean;
  shouldSwapConnectionDirection: (sourceItem: DesktopScheduleItem, targetItem: DesktopScheduleItem) => boolean;
  captureWorkingSnapshot: AnyFunction;
  restoreWorkingSnapshot: AnyFunction;
  pushLocalHistoryEntry: AnyFunction;
  runScheduleMutation: AnyFunction;
  applyServerMutationPatch: AnyFunction;
};

export function useDesktopScheduleConnectionMilestoneWorkflow(deps: DesktopScheduleConnectionMilestoneWorkflowDeps) {
  const {
    connectionCreationState,
    ensureScheduleEditable,
    getSelectedScheduleVersionId,
    handleMutationError,
    closeContextMenu,
    waitForPendingItemCreations,
    getPersistedWorkIdForItem,
    createUniqueReferenceName,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    pushLocalHistoryEntry,
    runScheduleMutation,
    trackScheduleMutationResult,
    getRequiredScheduleVersionIdForReferenceMutation,
    applyServerMutationPatch,
    upsertLoadedMilestone,
    replaceWorkingMilestoneWithApiMilestone,
    isSameConnectionItemPair,
    shouldSwapConnectionDirection,
  } = deps;

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
          await waitForPendingItemCreations([nextSourceItem.id, nextTargetItem.id]);
          await Promise.all(
            overridingWorkDepIds.map((workDepId) => desktopScheduleApi.deleteWorkDep(workDepId)),
          );
          const response = await desktopScheduleApi.createWorkDep({
            sourceWorkId: getPersistedWorkIdForItem(nextSourceItem),
            targetWorkId: getPersistedWorkIdForItem(nextTargetItem),
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
      trackScheduleMutationResult("create_connection", didSave, {
        replaced_connection_count: overridingWorkDepIds.length,
      });
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
    trackScheduleMutationResult("create_milestone", didSave);
  }
  
  
  return {
    cancelConnectionCreation,
    completeConnectionCreation,
    activateMilestone,
  };
}
