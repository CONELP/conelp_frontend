import { type ComputedRef, type Ref } from "vue";

import type {
    DesktopScheduleVersionId
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { DESKTOP_SCHEDULE_MILESTONE_ROW_ID, desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
    getMilestoneApiId
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type {
    ColorPaletteState,
    ColorPaletteTarget,
    ConnectionCreationState,
    ProjectScheduleDateRange,
} from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import type {
    DesktopScheduleContextMenuState,
    DesktopScheduleContextMenuTarget,
    DesktopScheduleSelectionState
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";


type AnyFunction = (...args: any[]) => any;

type DesktopScheduleItemMilestoneWorkflowDeps = Record<string, any> & {
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  contextMenuState: Ref<DesktopScheduleContextMenuState>;
  colorPaletteState: Ref<ColorPaletteState>;
  renamingItemId: Ref<string | null>;
  renamingMilestoneId: Ref<string | null>;
  connectionCreationState: Ref<ConnectionCreationState | null>;
  selectedScheduleVersionId: ComputedRef<DesktopScheduleVersionId | null>;
  rowById: ComputedRef<Map<string, DesktopScheduleRow>>;
  getProjectScheduleDateRange: () => ProjectScheduleDateRange | null;
  isDateWithinProjectRange: (date: string, range: ProjectScheduleDateRange) => boolean;
  getSelectedScheduleVersionId: () => DesktopScheduleVersionId | null;
  waitForPendingItemCreations: (itemIds: string[]) => Promise<void>;
  getPersistedWorkIdForItem: (item: DesktopScheduleItem) => number;
  getWorkConnectionById: (workConnectionId: string) => DesktopScheduleWorkConnection | null;
  getWorkLeadTimeWithinProject: (startDate: string, range: ProjectScheduleDateRange | null) => number;
  createWorkUpdateRequest: AnyFunction;
  orderWorkUpdateItemsByDependency: AnyFunction;
  captureWorkingSnapshot: AnyFunction;
  restoreWorkingSnapshot: AnyFunction;
  pushLocalHistoryEntry: AnyFunction;
  runScheduleMutation: AnyFunction;
  applyServerMutationPatch: AnyFunction;
  pendingWorkCreationByItemId: Map<string, Promise<number>>;
  resolvedWorkIdByPendingItemId: Map<string, number>;
};

export function useDesktopScheduleItemMilestoneWorkflow(deps: DesktopScheduleItemMilestoneWorkflowDeps) {
  const {
    DEFAULT_SUB_WORK_TYPE_COLOR_HEX,
    getProjectScheduleDateRange,
    isDateWithinProjectRange,
    getSelectedScheduleVersionId,
    handleMutationError,
    waitForPendingItemCreations,
    getPersistedWorkIdForItem,
    syncLoadedMilestoneFromModel,
    scheduleLoadState,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    selectionState,
    contextMenuState,
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
    removeReferenceLocally,
    createReferenceWorkTypeSet,
    createReferenceSubWorkTypeSet,
    getWorkLeadTimeWithinProject,
    mergeCreatedWorkIntoPendingItem,
    pendingWorkCreationByItemId,
    resolvedWorkIdByPendingItemId,
  } = deps;

  
  async function deleteSelection() {
    if (!ensureScheduleEditable()) {
      return;
    }

    const selectedRowIds = selectionState.value.rowIds.filter((rowId) => rowById.value.has(rowId));
    const selectedRowIdSet = new Set(selectedRowIds);
    const rowItemIds = workingItems.value
      .filter((item) => selectedRowIdSet.has(item.rowId))
      .map((item) => item.id);
    const itemIdsToDelete = Array.from(new Set([...selectionState.value.itemIds, ...rowItemIds]));
    try {
      await waitForPendingItemCreations(itemIdsToDelete);
    } catch {
      return;
    }

    const workIdsToDelete = workingItems.value
      .filter((item) => itemIdsToDelete.includes(item.id))
      .map(getPersistedWorkIdForItem);
    const workDepIdsToDelete = workingWorkConnections.value
      .filter((workConnection) =>
        selectionState.value.workConnectionIds.includes(workConnection.id),
      )
      .map((workConnection) => workConnection.pathId);
    const milestoneIdsToDelete = [...selectionState.value.milestoneIds];
    const milestoneApiIdsToDelete = workingMilestones.value
      .filter((milestone) => milestoneIdsToDelete.includes(milestone.id))
      .map(getMilestoneApiId)
      .filter((milestoneApiId): milestoneApiId is number => milestoneApiId !== null);
    const snapshot = captureWorkingSnapshot();

    if (workIdsToDelete.length > 0 || workDepIdsToDelete.length > 0) {
      if (itemIdsToDelete.length > 0) {
        workingItems.value = desktopScheduleService.deleteItems(workingItems.value, itemIdsToDelete);
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
          workingWorkConnections.value,
          itemIdsToDelete,
        );
      }

      if (workDepIdsToDelete.length > 0) {
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
          workingWorkConnections.value,
          selectionState.value.workConnectionIds,
        );
      }

      if (milestoneIdsToDelete.length > 0) {
        workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
          workingMilestones.value,
          milestoneIdsToDelete,
        );
      }

      removeLoadedWorksAndWorkDeps(workIdsToDelete, workDepIdsToDelete);
      removeLoadedMilestones(milestoneApiIdsToDelete);

      selectionState.value = createEmptyDesktopScheduleSelectionState();
      connectionCreationState.value = null;
      closeContextMenu();

      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all([
            ...workDepIdsToDelete.map((workDepId) => desktopScheduleApi.deleteWorkDep(workDepId)),
            ...workIdsToDelete.map((workId) => desktopScheduleApi.deleteWork(workId)),
            ...milestoneApiIdsToDelete.map((milestoneApiId) =>
              desktopScheduleApi.deleteMilestone(
                milestoneApiId,
                getRequiredScheduleVersionIdForReferenceMutation(),
              ),
            ),
          ]);
        },
        "공정표 항목을 삭제하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("delete_selection", didSave, {
        work_count: workIdsToDelete.length,
        connection_count: workDepIdsToDelete.length,
        milestone_count: milestoneApiIdsToDelete.length,
      });
      return;
    }

    if (selectedRowIds.length > 0) {
      workingRows.value = desktopScheduleService.deleteRows(workingRows.value, selectedRowIds);
    }

    if (itemIdsToDelete.length > 0) {
      workingItems.value = desktopScheduleService.deleteItems(workingItems.value, itemIdsToDelete);
      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
        workingWorkConnections.value,
        itemIdsToDelete,
      );
    }

    if (selectionState.value.workConnectionIds.length > 0) {
      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
        workingWorkConnections.value,
        selectionState.value.workConnectionIds,
      );
    }

    if (selectionState.value.milestoneIds.length > 0) {
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        selectionState.value.milestoneIds,
      );
      removeLoadedMilestones(milestoneApiIdsToDelete);
    }

    if (renamingItemId.value && itemIdsToDelete.includes(renamingItemId.value)) {
      renamingItemId.value = null;
    }

    if (
      renamingMilestoneId.value &&
      selectionState.value.milestoneIds.includes(renamingMilestoneId.value)
    ) {
      renamingMilestoneId.value = null;
    }

    selectionState.value = createEmptyDesktopScheduleSelectionState();
    connectionCreationState.value = null;
    closeContextMenu();

    if (milestoneApiIdsToDelete.length > 0) {
      const didSave = await runScheduleMutation(
        async () => {
          await Promise.all(
            milestoneApiIdsToDelete.map((milestoneApiId) =>
              desktopScheduleApi.deleteMilestone(
                milestoneApiId,
                getRequiredScheduleVersionIdForReferenceMutation(),
              ),
            ),
          );
        },
        "마일스톤을 삭제하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("delete_selection", didSave, {
        work_count: 0,
        connection_count: 0,
        milestone_count: milestoneApiIdsToDelete.length,
      });
      return;
    }

    pushLocalHistoryEntry(snapshot);
    trackScheduleAction("delete_selection", "success", {
      local_only: true,
      row_count: selectedRowIds.length,
      item_count: itemIdsToDelete.length,
      connection_count: workDepIdsToDelete.length,
      milestone_count: milestoneIdsToDelete.length,
    });
  }

  function canCreateItemOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    if (!target.rowId || !target.date) {
      return false;
    }

    const targetRow = rowById.value.get(target.rowId);
    const subWorkTypeId = targetRow?.source.subWorkTypeId;
    const projectDateRange = getProjectScheduleDateRange();
  
    return (
      targetRow?.kind === "child-process" &&
      targetRow.source.kind === "sub-work-type" &&
      typeof subWorkTypeId === "number" &&
      subWorkTypeId > 0 &&
      (!projectDateRange || isDateWithinProjectRange(target.date, projectDateRange))
    );
  }
  
  function canCreateMilestoneOnCanvasTarget(
    target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>,
  ) {
    return target.rowId === DESKTOP_SCHEDULE_MILESTONE_ROW_ID && !!target.date;
  }
  
  function openItemContextMenu(payload: { itemId: string; x: number; y: number }) {
    const nextSelectedItemIds = selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : [payload.itemId];
  
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: nextSelectedItemIds,
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "item",
        itemId: payload.itemId,
      },
    };
  }
  
  function openWorkConnectionContextMenu(payload: { workConnectionId: string; x: number; y: number }) {
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      workConnectionIds: [payload.workConnectionId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "work-connection",
        workConnectionId: payload.workConnectionId,
      },
    };
  }
  
  function openMilestoneContextMenu(payload: { milestoneId: string; x: number; y: number }) {
    if (!workingMilestones.value.some((milestone) => milestone.id === payload.milestoneId)) {
      return;
    }
  
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "milestone",
        milestoneId: payload.milestoneId,
      },
    };
  }
  
  function openRowContextMenu(payload: { rowId: string; x: number; y: number }) {
    if (!rowById.value.has(payload.rowId)) {
      return;
    }
  
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      rowIds: [payload.rowId],
    };
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "row",
        rowId: payload.rowId,
      },
    };
  }
  
  function openScheduleHeaderContextMenu(payload: {
    target:
      | { kind: "reference-header" }
      | { kind: "division-header"; divisionId: number; name: string }
      | { kind: "work-type-header"; divisionId: number; workTypeId: number; name: string }
      | {
          kind: "sub-work-type-header";
          workTypeId: number;
          subWorkTypeId: number;
          rowId: string;
          name: string;
        };
    x: number;
    y: number;
  }) {
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: payload.target,
    };
  }
  
  function openCanvasContextMenu(payload: {
    x: number;
    y: number;
    rowId: string | null;
    date: string | null;
  }) {
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: "canvas",
        rowId: payload.rowId,
        date: payload.date,
      },
    };
  }
  
  function getScopedItemIds(targetItemId: string) {
    return selectionState.value.itemIds.includes(targetItemId)
      ? selectionState.value.itemIds
      : [targetItemId];
  }
  
  function openColorPalette(target: ColorPaletteTarget, selectedColor: string | null | undefined) {
    colorPaletteState.value = {
      open: true,
      x: contextMenuState.value.x,
      y: contextMenuState.value.y,
      target,
      selectedColor: selectedColor ?? null,
    };
    closeContextMenu();
  }
  
  async function applyColorSelection(colorHex: string | null) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const target = colorPaletteState.value.target;
  
    if (!target) {
      closeColorPalette();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
  
    if (target.kind === "row") {
      const targetRow = rowById.value.get(target.rowId);
      const subWorkTypeId = targetRow?.source.subWorkTypeId ?? null;
      const effectiveColor = colorHex ?? DEFAULT_SUB_WORK_TYPE_COLOR_HEX;
  
      workingRows.value = desktopScheduleService.updateRowColor(
        workingRows.value,
        target.rowId,
        effectiveColor,
      );
      if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
        syncLoadedSubWorkTypeColor(subWorkTypeId, effectiveColor);
      }
      selectionState.value = {
        ...createEmptyDesktopScheduleSelectionState(),
        rowIds: [target.rowId],
      };
      closeColorPalette();
      if (typeof subWorkTypeId === "number" && subWorkTypeId > 0) {
        const didSave = await runScheduleMutation(
          async () => {
            await desktopScheduleApi.updateSubWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
              id: subWorkTypeId,
              color: effectiveColor,
            });
          },
          "세부공종 색상을 저장하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        trackScheduleMutationResult("change_color", didSave, {
          target_kind: "row",
        });
        return;
      }
  
      pushLocalHistoryEntry(snapshot);
      trackScheduleAction("change_color", "success", {
        target_kind: "row",
        local_only: true,
      });
      return;
    }
  
    const scopedItemIds = getScopedItemIds(target.itemId);
    workingItems.value = desktopScheduleService.updateItemColor(
      workingItems.value,
      scopedItemIds,
      colorHex,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: scopedItemIds,
    };
    pushLocalHistoryEntry(snapshot);
    closeColorPalette();
    trackScheduleAction("change_color", "success", {
      target_kind: "item",
      item_count: scopedItemIds.length,
      local_only: true,
    });
  }
  
  async function createItemOnCanvasTarget(payload: { rowId: string; startDate: string }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetRow = rowById.value.get(payload.rowId);
    const scheduleVersionId = getSelectedScheduleVersionId();
    const subWorkTypeId = targetRow?.source.subWorkTypeId;
    const projectDateRange = getProjectScheduleDateRange();
  
    if (
      !scheduleVersionId ||
      !targetRow ||
      targetRow.kind !== "child-process" ||
      targetRow.source.kind !== "sub-work-type" ||
      typeof subWorkTypeId !== "number" ||
      subWorkTypeId <= 0
    ) {
      handleMutationError(
        new Error("작업을 생성할 공정표 버전 또는 세부공종 정보가 없습니다."),
        "작업을 생성하지 못했습니다.",
      );
      closeContextMenu();
      return;
    }
  
    if (projectDateRange && !isDateWithinProjectRange(payload.startDate, projectDateRange)) {
      showScheduleToast("프로젝트 기간 안에서만 작업을 생성할 수 있어요.");
      closeContextMenu();
      return;
    }
  
    const workLeadTime = getWorkLeadTimeWithinProject(payload.startDate, projectDateRange);
    const snapshot = captureWorkingSnapshot();
    const previousItemIds = new Set(workingItems.value.map((item) => item.id));
    workingItems.value = desktopScheduleService.createItem(workingRows.value, workingItems.value, {
      rowId: payload.rowId,
      startDate: payload.startDate,
      durationDays: workLeadTime,
      workType: targetRow.source.workType,
      subWorkType: targetRow.source.subWorkType,
      division: targetRow.source.division,
      annotation: "",
    });
    const createdItem = workingItems.value.find((item) => !previousItemIds.has(item.id));
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: createdItem ? [createdItem.id] : [],
    };
    closeContextMenu();
  
    const didSave = await runScheduleMutation(
      async () => {
        if (!createdItem) {
          throw new Error("생성된 작업을 확인하지 못했습니다.");
        }
  
        const creationPromise = desktopScheduleApi.createWork({
          startDate: payload.startDate,
          workLeadTime,
          subWorkTypeId,
          scheduleVersionId,
        }).then((response) => {
          const createdWork = response.updatedWorks?.[0];
  
          if (!createdWork) {
            throw new Error("생성된 작업 ID를 확인하지 못했습니다.");
          }
  
          if (getSelectedScheduleVersionId() === scheduleVersionId) {
            applyServerMutationPatch(response);
            mergeCreatedWorkIntoPendingItem(createdItem.id, createdItem, createdWork);
          }
  
          return createdWork.workId;
        });
  
        pendingWorkCreationByItemId.set(createdItem.id, creationPromise);
  
        try {
          await creationPromise;
        } finally {
          pendingWorkCreationByItemId.delete(createdItem.id);
        }
      },
      "작업을 생성하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("create_item", didSave);
  }
  
  function startItemRename(itemId: string) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetItem = workingItems.value.find((item) => item.id === itemId);
  
    if (!targetItem) {
      renamingItemId.value = null;
      closeContextMenu();
      return;
    }
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [itemId],
    };
    renamingItemId.value = itemId;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }
  
  async function commitItemRename(payload: { itemId: string; name: string }) {
    if (!ensureScheduleEditable()) {
      renamingItemId.value = null;
      return;
    }
  
    const nextName = payload.name;
    const targetItem = workingItems.value.find((item) => item.id === payload.itemId);
  
    renamingItemId.value = null;
  
    if (!targetItem) {
      closeContextMenu();
      return;
    }
  
    if (targetItem.name === nextName) {
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    workingItems.value = desktopScheduleService.updateItemName(
      workingItems.value,
      payload.itemId,
      nextName,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      itemIds: [payload.itemId],
    };
    closeContextMenu();
  
    const didSave = await runScheduleMutation(
      async () => {
        await waitForPendingItemCreations([payload.itemId]);
        const persistedWorkId = getPersistedWorkIdForItem(targetItem);
        const response = await desktopScheduleApi.updateWork({
          items: [
            {
              workId: persistedWorkId,
              workName: nextName,
            },
          ],
        });
        applyServerMutationPatch(response);
      },
      "작업명을 저장하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
  
    if (didSave) {
      syncLoadedWorkName(getPersistedWorkIdForItem(targetItem), nextName);
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("rename_item", didSave);
  }
  
  function cancelItemRename() {
    renamingItemId.value = null;
    closeContextMenu();
  }
  
  function startMilestoneRename(milestoneId: string) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetMilestone = workingMilestones.value.find((milestone) => milestone.id === milestoneId);
  
    if (!targetMilestone) {
      renamingMilestoneId.value = null;
      closeContextMenu();
      return;
    }
  
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [milestoneId],
    };
    renamingItemId.value = null;
    renamingMilestoneId.value = milestoneId;
    closeContextMenu();
  }
  
  async function commitMilestoneRename(payload: { milestoneId: string; label: string }) {
    if (!ensureScheduleEditable()) {
      renamingMilestoneId.value = null;
      return;
    }
  
    const trimmedLabel = payload.label.trim();
    const targetMilestone = workingMilestones.value.find(
      (milestone) => milestone.id === payload.milestoneId,
    );
  
    renamingMilestoneId.value = null;
  
    if (!targetMilestone || !trimmedLabel || targetMilestone.label === trimmedLabel) {
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    workingMilestones.value = desktopScheduleService.updateMilestoneLabel(
      workingMilestones.value,
      payload.milestoneId,
      trimmedLabel,
    );
    selectionState.value = {
      ...createEmptyDesktopScheduleSelectionState(),
      milestoneIds: [payload.milestoneId],
    };
    syncLoadedMilestoneFromModel({
      ...targetMilestone,
      label: trimmedLabel,
    });
    closeContextMenu();
  
    const apiId = getMilestoneApiId(targetMilestone);
    if (apiId === null) {
      pushLocalHistoryEntry(snapshot);
      trackScheduleAction("rename_milestone", "success", {
        local_only: true,
      });
      return;
    }
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateMilestone({
          scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          id: apiId,
          date: targetMilestone.date,
          name: trimmedLabel,
        });
      },
      "마일스톤 이름을 저장하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("rename_milestone", didSave);
  }
  
  function cancelMilestoneRename() {
    renamingMilestoneId.value = null;
    closeContextMenu();
  }
  
  
  return {
    deleteSelection,
    canCreateItemOnCanvasTarget,
    canCreateMilestoneOnCanvasTarget,
    openItemContextMenu,
    openWorkConnectionContextMenu,
    openMilestoneContextMenu,
    openRowContextMenu,
    openScheduleHeaderContextMenu,
    openCanvasContextMenu,
    getScopedItemIds,
    openColorPalette,
    applyColorSelection,
    createItemOnCanvasTarget,
    startItemRename,
    commitItemRename,
    cancelItemRename,
    startMilestoneRename,
    commitMilestoneRename,
    cancelMilestoneRename,
  };
}
