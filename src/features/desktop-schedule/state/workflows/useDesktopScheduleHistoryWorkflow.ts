import { type Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleMilestoneResponse,
    DesktopScheduleMutationResponse,
    DesktopScheduleReferenceHierarchyItem,
    DesktopScheduleVersionId,
    DesktopScheduleWorkDepResponse,
    DesktopScheduleWorkResponse,
    DesktopScheduleWorkUpdateItem
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    applyHistoryCollectionPatch,
    applyLoadedDataHistoryPatch,
    cloneItem,
    cloneItems,
    cloneMilestone,
    cloneMilestones,
    cloneRow,
    cloneRows,
    cloneScheduleData,
    cloneWorkConnection,
    cloneWorkConnections,
    createLocalHistoryAnalyticsMeta,
    createLocalHistoryEntry,
    getHistoryChangeSource,
    getHistoryChangeTarget,
    remapHistoryItem,
    remapHistoryMilestone,
    remapHistoryMilestoneResponse,
    remapHistoryRow,
    remapHistoryWorkHierarchyItem,
    remapHistoryWorkConnection,
    remapHistoryWorkDepResponse,
    remapHistoryWorkResponse,
    remapItemId,
    remapLocalHistoryEntry,
    remapMilestoneModelId,
    remapWorkConnectionId
} from "@/features/desktop-schedule/services/domain/desktop-schedule-history.service";
import {
    cloneSelectionState
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type { ConnectionCreationState } from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import type { MoveSession, ResizeSession, SummaryResizeSession } from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";
import type {
    DesktopScheduleHistoryDirection,
    DesktopScheduleHistoryIdMap,
    DesktopScheduleHistorySyncResult,
    DesktopScheduleLoadedDataHistoryPatch,
    DesktopScheduleLocalHistoryEntry,
    DesktopScheduleLocalSnapshot,
} from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";
import type {
    DesktopScheduleSelectionState
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";

type ReferenceDivisionSnapshot = {
  id: number;
  name: string;
};

type ReferenceWorkTypeSnapshot = {
  id: number;
  divisionId: number;
  name: string;
};

type ReferenceSubWorkTypeSnapshot = {
  id: number;
  workTypeId: number;
  name: string;
  color: string | null;
};

type ReferenceHierarchySnapshot = {
  divisionsById: Map<number, ReferenceDivisionSnapshot>;
  workTypesById: Map<number, ReferenceWorkTypeSnapshot>;
  subWorkTypesById: Map<number, ReferenceSubWorkTypeSnapshot>;
};

type DesktopScheduleHistoryWorkflowDeps = {
  LOCAL_HISTORY_MAX_ENTRIES: number;
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  interactionSession: Ref<MoveSession | ResizeSession | SummaryResizeSession | null>;
  connectionCreationState: Ref<ConnectionCreationState | null>;
  renamingDivisionId: Ref<number | null>;
  renamingWorkTypeId: Ref<number | null>;
  renamingSubWorkTypeId: Ref<number | null>;
  renamingItemId: Ref<string | null>;
  renamingMilestoneId: Ref<string | null>;
  lanePreferenceByItemId: Ref<Record<string, number>>;
  localHistoryUndoStack: Ref<DesktopScheduleLocalHistoryEntry[]>;
  localHistoryRedoStack: Ref<DesktopScheduleLocalHistoryEntry[]>;
  isLocalHistorySyncInFlight: Ref<boolean>;
  closeContextMenu: () => void;
  closeColorPalette: () => void;
  getRequiredScheduleVersionIdForReferenceMutation: () => DesktopScheduleVersionId;
  getSelectedScheduleVersionId: () => DesktopScheduleVersionId | null;
  applyServerMutationPatch: (response: DesktopScheduleMutationResponse) => void;
  handleMutationError: (error: unknown, fallbackMessage: string) => void;
  trackScheduleAction: (
    action: string,
    result: "success" | "fail",
    meta?: Record<string, unknown>,
  ) => void;
  ignoreMissingHistoryDelete: (mutation: () => Promise<unknown>, missingEntityPattern: RegExp) => Promise<void>;
};

type PendingLocalHistorySyncJob = {
  direction: DesktopScheduleHistoryDirection;
  entry: DesktopScheduleLocalHistoryEntry;
  action: "undo_history" | "redo_history";
  analyticsMeta: Record<string, unknown>;
  sourceData: DesktopScheduleBootstrapData | null;
  previousSnapshot: DesktopScheduleLocalSnapshot;
  previousUndoStack: DesktopScheduleLocalHistoryEntry[];
  previousRedoStack: DesktopScheduleLocalHistoryEntry[];
};

export function useDesktopScheduleHistoryWorkflow(deps: DesktopScheduleHistoryWorkflowDeps) {
  const {
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
  } = deps;
  let localHistorySyncQueue: PendingLocalHistorySyncJob[] = [];
  let isProcessingLocalHistorySyncQueue = false;

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

  function hasHistoryIdMapChanges(idMap: DesktopScheduleHistoryIdMap) {
    return (
      idMap.divisionIds.size > 0 ||
      idMap.workTypeIds.size > 0 ||
      idMap.subWorkTypeIds.size > 0 ||
      idMap.workIds.size > 0 ||
      idMap.workDepIds.size > 0 ||
      idMap.milestoneIds.size > 0
    );
  }
  
  function remapLocalHistoryStacks(idMap: DesktopScheduleHistoryIdMap) {
    if (!hasHistoryIdMapChanges(idMap)) {
      return;
    }
  
    localHistoryUndoStack.value = localHistoryUndoStack.value.map((entry) =>
      remapLocalHistoryEntry(entry, idMap),
    );
    localHistoryRedoStack.value = localHistoryRedoStack.value.map((entry) =>
      remapLocalHistoryEntry(entry, idMap),
    );
  }

  function remapLoadedScheduleDataForHistorySync(
    data: DesktopScheduleBootstrapData,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleBootstrapData {
    return {
      ...data,
      workHierarchy: data.workHierarchy.map((item) =>
        remapHistoryWorkHierarchyItem(item, idMap),
      ),
      works: data.works.map((work) => remapHistoryWorkResponse(work, idMap)),
      workDeps: data.workDeps.map((workDep) => remapHistoryWorkDepResponse(workDep, idMap)),
      milestones: (data.milestones ?? []).map((milestone) =>
        remapHistoryMilestoneResponse(milestone, idMap),
      ),
    };
  }

  function remapLocalSnapshotForHistorySync(
    snapshot: DesktopScheduleLocalSnapshot,
    idMap: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleLocalSnapshot {
    return {
      rows: snapshot.rows.map((row) => remapHistoryRow(row, idMap)),
      items: snapshot.items.map((item) => remapHistoryItem(item, idMap)),
      workConnections: snapshot.workConnections.map((workConnection) =>
        remapHistoryWorkConnection(workConnection, idMap),
      ),
      milestones: snapshot.milestones.map((milestone) =>
        remapHistoryMilestone(milestone, idMap),
      ),
      loadedData: snapshot.loadedData
        ? remapLoadedScheduleDataForHistorySync(snapshot.loadedData, idMap)
        : null,
      selection: createEmptyDesktopScheduleSelectionState(),
    };
  }

  function remapQueuedLocalHistorySyncJobs(idMap: DesktopScheduleHistoryIdMap) {
    if (!hasHistoryIdMapChanges(idMap)) {
      return;
    }

    localHistorySyncQueue = localHistorySyncQueue.map((job) => ({
      ...job,
      entry: remapLocalHistoryEntry(job.entry, idMap),
      sourceData: job.sourceData
        ? remapLoadedScheduleDataForHistorySync(job.sourceData, idMap)
        : null,
      previousSnapshot: remapLocalSnapshotForHistorySync(job.previousSnapshot, idMap),
      previousUndoStack: job.previousUndoStack.map((entry) =>
        remapLocalHistoryEntry(entry, idMap),
      ),
      previousRedoStack: job.previousRedoStack.map((entry) =>
        remapLocalHistoryEntry(entry, idMap),
      ),
    }));
  }

  function createHistoryIdMapFromSyncResult(
    result: DesktopScheduleHistorySyncResult,
  ): DesktopScheduleHistoryIdMap {
    return {
      divisionIds: result.divisionIdMap ?? new Map<number, number>(),
      workTypeIds: result.workTypeIdMap ?? new Map<number, number>(),
      subWorkTypeIds: result.subWorkTypeIdMap ?? new Map<number, number>(),
      workIds: result.workIdMap ?? new Map<number, number>(),
      workDepIds: result.workDepIdMap ?? new Map<number, number>(),
      milestoneIds: result.milestoneIdMap ?? new Map<number, number>(),
    };
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
        workHierarchy: currentData.workHierarchy.map((item) =>
          remapHistoryWorkHierarchyItem(item, idMap),
        ),
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
    if (!hasHistoryIdMapChanges(idMap)) {
      return;
    }
  
    workingRows.value = workingRows.value.map((row) => remapHistoryRow(row, idMap));
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
    renamingDivisionId.value =
      renamingDivisionId.value !== null
        ? idMap.divisionIds.get(renamingDivisionId.value) ?? renamingDivisionId.value
        : null;
    renamingWorkTypeId.value =
      renamingWorkTypeId.value !== null
        ? idMap.workTypeIds.get(renamingWorkTypeId.value) ?? renamingWorkTypeId.value
        : null;
    renamingSubWorkTypeId.value =
      renamingSubWorkTypeId.value !== null
        ? idMap.subWorkTypeIds.get(renamingSubWorkTypeId.value) ?? renamingSubWorkTypeId.value
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
    idMap?: DesktopScheduleHistoryIdMap,
  ): DesktopScheduleWorkUpdateItem {
    return {
      workId: idMap?.workIds.get(work.workId) ?? work.workId,
      workName: work.workName,
      startDate: work.startDate,
      workLeadTime: work.workLeadTime,
      subWorkTypeId: idMap?.subWorkTypeIds.get(work.subWorkTypeId) ?? work.subWorkTypeId,
    };
  }
  
  function createReferenceHierarchySnapshot(
    items: DesktopScheduleReferenceHierarchyItem[],
  ): ReferenceHierarchySnapshot {
    const divisionsById = new Map<number, ReferenceDivisionSnapshot>();
    const workTypesById = new Map<number, ReferenceWorkTypeSnapshot>();
    const subWorkTypesById = new Map<number, ReferenceSubWorkTypeSnapshot>();

    items.forEach((item) => {
      if (item.divisionId > 0 && !divisionsById.has(item.divisionId)) {
        divisionsById.set(item.divisionId, {
          id: item.divisionId,
          name: item.divisionName,
        });
      }

      if (item.workTypeId > 0 && !workTypesById.has(item.workTypeId)) {
        workTypesById.set(item.workTypeId, {
          id: item.workTypeId,
          divisionId: item.divisionId,
          name: item.workTypeName,
        });
      }

      if (item.subWorkTypeId > 0 && !subWorkTypesById.has(item.subWorkTypeId)) {
        subWorkTypesById.set(item.subWorkTypeId, {
          id: item.subWorkTypeId,
          workTypeId: item.workTypeId,
          name: item.subWorkTypeName,
          color: item.subWorkTypeColor,
        });
      }
    });

    return {
      divisionsById,
      workTypesById,
      subWorkTypesById,
    };
  }

  function mapReferenceId(value: number, idMap: Map<number, number>) {
    return idMap.get(value) ?? value;
  }

  function getDivisionOrderFromHierarchy(
    items: DesktopScheduleReferenceHierarchyItem[],
    idMap: Map<number, number> = new Map<number, number>(),
  ) {
    return Array.from(
      new Set(
        items
          .map((item) => mapReferenceId(item.divisionId, idMap))
          .filter((divisionId) => divisionId > 0),
      ),
    );
  }

  function getWorkTypeOrderByDivisionFromHierarchy(
    items: DesktopScheduleReferenceHierarchyItem[],
    idMap: DesktopScheduleHistoryIdMap,
  ) {
    const workTypeIdsByDivisionId = new Map<number, number[]>();
    const seenWorkTypeIdsByDivisionId = new Map<number, Set<number>>();

    items.forEach((item) => {
      const divisionId = mapReferenceId(item.divisionId, idMap.divisionIds);
      const workTypeId = mapReferenceId(item.workTypeId, idMap.workTypeIds);

      if (divisionId <= 0 || workTypeId <= 0) {
        return;
      }

      const workTypeIds = workTypeIdsByDivisionId.get(divisionId) ?? [];
      const seenWorkTypeIds = seenWorkTypeIdsByDivisionId.get(divisionId) ?? new Set<number>();

      if (!seenWorkTypeIds.has(workTypeId)) {
        workTypeIds.push(workTypeId);
        seenWorkTypeIds.add(workTypeId);
      }

      workTypeIdsByDivisionId.set(divisionId, workTypeIds);
      seenWorkTypeIdsByDivisionId.set(divisionId, seenWorkTypeIds);
    });

    return workTypeIdsByDivisionId;
  }

  function getSubWorkTypeOrderByWorkTypeFromHierarchy(
    items: DesktopScheduleReferenceHierarchyItem[],
    idMap: DesktopScheduleHistoryIdMap,
  ) {
    const subWorkTypeIdsByWorkTypeId = new Map<number, number[]>();
    const seenSubWorkTypeIdsByWorkTypeId = new Map<number, Set<number>>();

    items.forEach((item) => {
      const workTypeId = mapReferenceId(item.workTypeId, idMap.workTypeIds);
      const subWorkTypeId = mapReferenceId(item.subWorkTypeId, idMap.subWorkTypeIds);

      if (workTypeId <= 0 || subWorkTypeId <= 0) {
        return;
      }

      const subWorkTypeIds = subWorkTypeIdsByWorkTypeId.get(workTypeId) ?? [];
      const seenSubWorkTypeIds =
        seenSubWorkTypeIdsByWorkTypeId.get(workTypeId) ?? new Set<number>();

      if (!seenSubWorkTypeIds.has(subWorkTypeId)) {
        subWorkTypeIds.push(subWorkTypeId);
        seenSubWorkTypeIds.add(subWorkTypeId);
      }

      subWorkTypeIdsByWorkTypeId.set(workTypeId, subWorkTypeIds);
      seenSubWorkTypeIdsByWorkTypeId.set(workTypeId, seenSubWorkTypeIds);
    });

    return subWorkTypeIdsByWorkTypeId;
  }

  function haveReferenceOrderIdsChanged(sourceIds: number[], targetIds: number[]) {
    return JSON.stringify(sourceIds) !== JSON.stringify(targetIds);
  }

  function createEmptyHistoryIdMap(): DesktopScheduleHistoryIdMap {
    return {
      divisionIds: new Map<number, number>(),
      workTypeIds: new Map<number, number>(),
      subWorkTypeIds: new Map<number, number>(),
      workIds: new Map<number, number>(),
      workDepIds: new Map<number, number>(),
      milestoneIds: new Map<number, number>(),
    };
  }

  async function persistReferenceOrderChangesToServer(
    sourceHierarchy: DesktopScheduleReferenceHierarchyItem[],
    targetHierarchy: DesktopScheduleReferenceHierarchyItem[],
    idMap: DesktopScheduleHistoryIdMap,
    scheduleVersionId: DesktopScheduleVersionId,
  ) {
    const referenceOrderRequests: Array<Promise<unknown>> = [];
    const sourceDivisionIds = getDivisionOrderFromHierarchy(sourceHierarchy);
    const targetDivisionIds = getDivisionOrderFromHierarchy(targetHierarchy, idMap.divisionIds);

    if (
      targetDivisionIds.length > 1 &&
      haveReferenceOrderIdsChanged(sourceDivisionIds, targetDivisionIds)
    ) {
      referenceOrderRequests.push(
        desktopScheduleApi.updateDivision({
          scheduleVersionId,
          ids: targetDivisionIds,
        }),
      );
    }

    const emptyIdMap = createEmptyHistoryIdMap();
    const sourceWorkTypeIdsByDivisionId = getWorkTypeOrderByDivisionFromHierarchy(
      sourceHierarchy,
      emptyIdMap,
    );
    const targetWorkTypeIdsByDivisionId = getWorkTypeOrderByDivisionFromHierarchy(
      targetHierarchy,
      idMap,
    );

    targetWorkTypeIdsByDivisionId.forEach((targetWorkTypeIds, divisionId) => {
      if (targetWorkTypeIds.length < 2) {
        return;
      }

      const sourceWorkTypeIds = sourceWorkTypeIdsByDivisionId.get(divisionId) ?? [];

      if (!haveReferenceOrderIdsChanged(sourceWorkTypeIds, targetWorkTypeIds)) {
        return;
      }

      referenceOrderRequests.push(
        desktopScheduleApi.updateWorkType({
          scheduleVersionId,
          parentId: divisionId,
          ids: targetWorkTypeIds,
        }),
      );
    });

    const sourceSubWorkTypeIdsByWorkTypeId = getSubWorkTypeOrderByWorkTypeFromHierarchy(
      sourceHierarchy,
      emptyIdMap,
    );
    const targetSubWorkTypeIdsByWorkTypeId = getSubWorkTypeOrderByWorkTypeFromHierarchy(
      targetHierarchy,
      idMap,
    );

    targetSubWorkTypeIdsByWorkTypeId.forEach((targetSubWorkTypeIds, workTypeId) => {
      if (targetSubWorkTypeIds.length < 2) {
        return;
      }

      const sourceSubWorkTypeIds = sourceSubWorkTypeIdsByWorkTypeId.get(workTypeId) ?? [];

      if (!haveReferenceOrderIdsChanged(sourceSubWorkTypeIds, targetSubWorkTypeIds)) {
        return;
      }

      referenceOrderRequests.push(
        desktopScheduleApi.updateSubWorkType({
          scheduleVersionId,
          parentId: workTypeId,
          ids: targetSubWorkTypeIds,
        }),
      );
    });

    await Promise.all(referenceOrderRequests);
  }

  async function persistReferenceHistoryPatchToServer(
    sourceHierarchy: DesktopScheduleReferenceHierarchyItem[],
    targetHierarchy: DesktopScheduleReferenceHierarchyItem[],
  ): Promise<DesktopScheduleHistorySyncResult> {
    const scheduleVersionId = getRequiredScheduleVersionIdForReferenceMutation();
    const sourceSnapshot = createReferenceHierarchySnapshot(sourceHierarchy);
    const targetSnapshot = createReferenceHierarchySnapshot(targetHierarchy);
    const divisionIdMap = new Map<number, number>();
    const workTypeIdMap = new Map<number, number>();
    const subWorkTypeIdMap = new Map<number, number>();

    await Promise.all(
      Array.from(sourceSnapshot.subWorkTypesById.keys())
        .filter((subWorkTypeId) => !targetSnapshot.subWorkTypesById.has(subWorkTypeId))
        .map((subWorkTypeId) =>
          ignoreMissingHistoryDelete(
            () => desktopScheduleApi.deleteSubWorkType(subWorkTypeId, scheduleVersionId),
            /sub\s*work\s*type|subworktype|not\s+found/i,
          ),
        ),
    );

    await Promise.all(
      Array.from(sourceSnapshot.workTypesById.keys())
        .filter((workTypeId) => !targetSnapshot.workTypesById.has(workTypeId))
        .map((workTypeId) =>
          ignoreMissingHistoryDelete(
            () => desktopScheduleApi.deleteWorkType(workTypeId, scheduleVersionId),
            /work\s*type|worktype|not\s+found/i,
          ),
        ),
    );

    await Promise.all(
      Array.from(sourceSnapshot.divisionsById.keys())
        .filter((divisionId) => !targetSnapshot.divisionsById.has(divisionId))
        .map((divisionId) =>
          ignoreMissingHistoryDelete(
            () => desktopScheduleApi.deleteDivision(divisionId, scheduleVersionId),
            /division|not\s+found/i,
          ),
        ),
    );

    for (const [divisionId, division] of targetSnapshot.divisionsById) {
      if (sourceSnapshot.divisionsById.has(divisionId)) {
        continue;
      }

      const createdDivision = await desktopScheduleApi.createDivision({
        scheduleVersionId,
        name: division.name,
      });
      divisionIdMap.set(divisionId, createdDivision.id);
    }

    for (const [workTypeId, workType] of targetSnapshot.workTypesById) {
      if (sourceSnapshot.workTypesById.has(workTypeId)) {
        continue;
      }

      const divisionId = mapReferenceId(workType.divisionId, divisionIdMap);

      if (divisionId <= 0) {
        continue;
      }

      const createdWorkType = await desktopScheduleApi.createWorkType({
        scheduleVersionId,
        divisionId,
        name: workType.name,
      });
      workTypeIdMap.set(workTypeId, createdWorkType.id);
    }

    for (const [subWorkTypeId, subWorkType] of targetSnapshot.subWorkTypesById) {
      if (sourceSnapshot.subWorkTypesById.has(subWorkTypeId)) {
        continue;
      }

      const workTypeId = mapReferenceId(subWorkType.workTypeId, workTypeIdMap);

      if (workTypeId <= 0) {
        continue;
      }

      const createdSubWorkType = await desktopScheduleApi.createSubWorkType({
        scheduleVersionId,
        workTypeId,
        name: subWorkType.name,
        color: subWorkType.color,
      });
      subWorkTypeIdMap.set(subWorkTypeId, createdSubWorkType.id);
    }

    const referenceUpdateRequests: Array<Promise<unknown>> = [];

    targetSnapshot.divisionsById.forEach((targetDivision, divisionId) => {
      const sourceDivision = sourceSnapshot.divisionsById.get(divisionId);

      if (!sourceDivision || sourceDivision.name === targetDivision.name) {
        return;
      }

      referenceUpdateRequests.push(
        desktopScheduleApi.updateDivision({
          scheduleVersionId,
          id: divisionId,
          name: targetDivision.name,
        }),
      );
    });

    targetSnapshot.workTypesById.forEach((targetWorkType, workTypeId) => {
      const sourceWorkType = sourceSnapshot.workTypesById.get(workTypeId);

      if (!sourceWorkType || sourceWorkType.name === targetWorkType.name) {
        return;
      }

      referenceUpdateRequests.push(
        desktopScheduleApi.updateWorkType({
          scheduleVersionId,
          id: workTypeId,
          name: targetWorkType.name,
        }),
      );
    });

    targetSnapshot.subWorkTypesById.forEach((targetSubWorkType, subWorkTypeId) => {
      const sourceSubWorkType = sourceSnapshot.subWorkTypesById.get(subWorkTypeId);

      if (
        !sourceSubWorkType ||
        (sourceSubWorkType.name === targetSubWorkType.name &&
          sourceSubWorkType.color === targetSubWorkType.color)
      ) {
        return;
      }

      referenceUpdateRequests.push(
        desktopScheduleApi.updateSubWorkType({
          scheduleVersionId,
          id: subWorkTypeId,
          name: targetSubWorkType.name,
          color: targetSubWorkType.color,
        }),
      );
    });

    await Promise.all(referenceUpdateRequests);

    const referenceIdMap: DesktopScheduleHistoryIdMap = {
      ...createEmptyHistoryIdMap(),
      divisionIds: divisionIdMap,
      workTypeIds: workTypeIdMap,
      subWorkTypeIds: subWorkTypeIdMap,
    };
    await persistReferenceOrderChangesToServer(
      sourceHierarchy,
      targetHierarchy,
      referenceIdMap,
      scheduleVersionId,
    );

    return {
      divisionIdMap,
      workTypeIdMap,
      subWorkTypeIdMap,
    };
  }
  
  async function persistWorkHistoryPatchToServer(
    patch: DesktopScheduleLoadedDataHistoryPatch["works"],
    direction: DesktopScheduleHistoryDirection,
    scheduleVersionId: DesktopScheduleVersionId,
    idMap: DesktopScheduleHistoryIdMap = createEmptyHistoryIdMap(),
  ): Promise<DesktopScheduleHistorySyncResult> {
    const updateItems: DesktopScheduleWorkUpdateItem[] = [];
    const workIdsToDelete: number[] = [];
    const worksToCreate: DesktopScheduleWorkResponse[] = [];
    const workIdMap = new Map<number, number>();
  
    patch.changes.forEach((change) => {
      const source = getHistoryChangeSource(change, direction);
      const target = getHistoryChangeTarget(change, direction);
  
      if (source && target) {
        updateItems.push(createWorkUpdateItemFromResponse(target, idMap));
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
      await Promise.all(
        Array.from(new Set(workIdsToDelete)).map((workId) =>
          ignoreMissingHistoryDelete(
            () => desktopScheduleApi.deleteWork(workId),
            /work\s+not\s+found/i,
          ),
        ),
      );
    }
  
    if (updateItems.length > 0) {
      const response = await desktopScheduleApi.updateWork({ items: updateItems });
      applyServerMutationPatch(response);
    }
  
    for (const work of worksToCreate) {
      const response = await desktopScheduleApi.createWork({
        startDate: work.startDate,
        workLeadTime: work.workLeadTime,
        subWorkTypeId: idMap.subWorkTypeIds.get(work.subWorkTypeId) ?? work.subWorkTypeId,
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
              ...createWorkUpdateItemFromResponse(work, idMap),
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
        ignoreMissingHistoryDelete(
          () => desktopScheduleApi.deleteWorkDep(workDepId),
          /work\s*dep(?:endency)?\s+not\s+found/i,
        ),
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
        Array.from(new Set(milestoneIdsToDelete)).map((milestoneId) =>
          ignoreMissingHistoryDelete(
            () =>
              desktopScheduleApi.deleteMilestone(
                milestoneId,
                getRequiredScheduleVersionIdForReferenceMutation(),
              ),
            /milestone\s+not\s+found/i,
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
    sourceData: DesktopScheduleBootstrapData | null,
  ): Promise<DesktopScheduleHistorySyncResult> {
    const scheduleVersionId = getSelectedScheduleVersionId();
    const targetData = scheduleLoadState.value.data;
  
    if (!entry.loadedData || !scheduleVersionId || !sourceData || !targetData) {
      return {};
    }
  
    const referenceResult = await persistReferenceHistoryPatchToServer(
      sourceData.workHierarchy,
      targetData.workHierarchy,
    );
    const referenceIdMap: DesktopScheduleHistoryIdMap = {
      ...createEmptyHistoryIdMap(),
      divisionIds: referenceResult.divisionIdMap ?? new Map<number, number>(),
      workTypeIds: referenceResult.workTypeIdMap ?? new Map<number, number>(),
      subWorkTypeIds: referenceResult.subWorkTypeIdMap ?? new Map<number, number>(),
    };
    await persistDeletedWorkDepsForHistoryToServer(entry.loadedData.workDeps, direction);
    const workResult = await persistWorkHistoryPatchToServer(
      entry.loadedData.works,
      direction,
      scheduleVersionId,
      referenceIdMap,
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
      divisionIdMap: referenceResult.divisionIdMap,
      workTypeIdMap: referenceResult.workTypeIdMap,
      subWorkTypeIdMap: referenceResult.subWorkTypeIdMap,
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
    const action = direction === "undo" ? "undo_history" : "redo_history";
    const analyticsMeta = createLocalHistoryAnalyticsMeta(entry);
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

    localHistorySyncQueue.push({
      direction,
      entry,
      action,
      analyticsMeta,
      sourceData: previousSnapshot.loadedData,
      previousSnapshot,
      previousUndoStack,
      previousRedoStack,
    });
    void processLocalHistorySyncQueue();
  }

  async function processLocalHistorySyncQueue() {
    if (isProcessingLocalHistorySyncQueue) {
      return;
    }

    isProcessingLocalHistorySyncQueue = true;
    isLocalHistorySyncInFlight.value = localHistorySyncQueue.length > 0;

    try {
      while (localHistorySyncQueue.length > 0) {
        const job = localHistorySyncQueue[0]!;

        try {
          const result = await persistLocalHistoryEntryToServer(
            job.entry,
            job.direction,
            job.sourceData,
          );
          const idMap = createHistoryIdMapFromSyncResult(result);

          localHistorySyncQueue.shift();
          remapCurrentScheduleState(idMap);
          remapLocalHistoryStacks(idMap);
          remapQueuedLocalHistorySyncJobs(idMap);
          trackScheduleAction(job.action, "success", job.analyticsMeta);
        } catch (error) {
          restoreWorkingSnapshot(job.previousSnapshot);
          localHistoryUndoStack.value = job.previousUndoStack;
          localHistoryRedoStack.value = job.previousRedoStack;
          localHistorySyncQueue = [];
          trackScheduleAction(job.action, "fail", job.analyticsMeta);
          handleMutationError(
            error,
            job.direction === "undo"
              ? "되돌리기를 서버에 저장하지 못했습니다."
              : "다시 실행을 서버에 저장하지 못했습니다.",
          );
          break;
        }

        isLocalHistorySyncInFlight.value = localHistorySyncQueue.length > 0;
      }
    } finally {
      isProcessingLocalHistorySyncQueue = false;
      isLocalHistorySyncInFlight.value = localHistorySyncQueue.length > 0;
    }
  }
  
  
  return {
    captureWorkingSnapshot,
    restoreWorkingSnapshot,
    applyLocalHistoryEntry,
    remapCurrentScheduleState,
    pushLocalHistoryEntry,
    clearLocalHistory,
    moveLocalHistoryStackAndPersist,
  };
}
