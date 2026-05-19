import { computed, type ComputedRef, type Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleReferenceHierarchyItem
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
    getMilestoneApiId
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type { ColorPaletteState, ConnectionCreationState } from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import type {
    DesktopScheduleContextMenuCommand,
    DesktopScheduleContextMenuItem,
    DesktopScheduleContextMenuState,
    DesktopScheduleContextMenuTarget,
    DesktopScheduleSelectionState,
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";


type AnyFunction = (...args: any[]) => any;

type DesktopScheduleContextMenuCommandsDeps = Record<string, any> & {
  contextMenuState: Ref<DesktopScheduleContextMenuState>;
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  colorPaletteState: Ref<ColorPaletteState>;
  rowById: ComputedRef<Map<string, DesktopScheduleRow>>;
  isScheduleReadOnly: ComputedRef<boolean>;
  connectionCreationState: Ref<ConnectionCreationState | null>;
  renamingItemId: Ref<string | null>;
  renamingMilestoneId: Ref<string | null>;
  getHierarchyForDivision: (divisionId: number) => DesktopScheduleReferenceHierarchyItem[];
  getHierarchyForWorkType: (workTypeId: number) => DesktopScheduleReferenceHierarchyItem[];
  getScopedItemIds: (targetItemId: string) => string[];
  getWorkConnectionById: (workConnectionId: string) => DesktopScheduleWorkConnection | null;
  removeLoadedWorksAndWorkDeps: (workIds: number[], workDepIds?: number[]) => void;
  removeLoadedWorkDeps: (workDepIds: number[]) => void;
  removeLoadedMilestones: (milestoneApiIds: number[]) => void;
  canCreateItemOnCanvasTarget: (target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>) => boolean;
  canCreateMilestoneOnCanvasTarget: (target: Extract<DesktopScheduleContextMenuTarget, { kind: "canvas" }>) => boolean;
  openColorPalette: (target: Extract<DesktopScheduleContextMenuTarget, { kind: "row" | "item" }>, selectedColor: string | null | undefined) => void;
  promptForName: (label: string, currentName: string) => string | null;
  captureWorkingSnapshot: AnyFunction;
  restoreWorkingSnapshot: AnyFunction;
  pushLocalHistoryEntry: AnyFunction;
  runScheduleMutation: AnyFunction;
  trackScheduleMutationResult: AnyFunction;
  trackScheduleAction: AnyFunction;
};

export function useDesktopScheduleContextMenuCommands(deps: DesktopScheduleContextMenuCommandsDeps) {
  const {
    contextMenuState,
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
    selectionState,
    rowById,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    isScheduleReadOnly,
    connectionCreationState,
    closeContextMenu,
    closeColorPalette,
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
    completeConnectionCreation,
    activateMilestone,
  } = deps;

  const contextMenuItems = computed<DesktopScheduleContextMenuItem[]>(() => {
    const target = contextMenuState.value.target;
    if (!contextMenuState.value.open || !target) {
      return [];
    }
  
    if (isScheduleReadOnly.value) {
      return [];
    }
  
    if (
      target.kind === "reference-header" ||
      target.kind === "division-header" ||
      target.kind === "work-type-header" ||
      target.kind === "sub-work-type-header"
    ) {
      const createItem =
        target.kind === "reference-header"
          ? {
              id: "create-division-reference",
              label: "분류 생성",
              command: "create-division-reference" as const,
              icon: "plus" as const,
            }
          : target.kind === "division-header"
              ? {
                id: "create-work-type-reference",
                label: "공종 생성",
                command: "create-work-type-reference" as const,
                icon: "plus" as const,
              }
            : target.kind === "work-type-header" || target.kind === "sub-work-type-header"
              ? {
                id: "create-sub-work-type-reference",
                label: "세부공종 생성",
                command: "create-sub-work-type-reference" as const,
                icon: "plus" as const,
              }
              : null;
  
      const colorItem =
        target.kind === "sub-work-type-header"
          ? [
              {
                id: "change-sub-work-type-color",
                label: "색상 설정",
                command: "change-color" as const,
                icon: "palette" as const,
              },
            ]
          : [];
  
      return [
        ...(createItem ? [createItem] : []),
        ...colorItem,
        ...(target.kind === "reference-header"
          ? []
          : [
              {
                id: "rename-reference",
                label: "이름 변경",
                command: "rename-reference" as const,
                icon: "pencil" as const,
              },
              {
                id: "delete-reference",
                label: "삭제",
                command: "delete-reference" as const,
                icon: "trash" as const,
                danger: true,
              },
            ]),
      ];
    }
  
    if (target.kind === "item") {
      return [
        {
          id: "toggle-work-connection",
          label: "작업 연결 생성",
          command: "toggle-work-connection",
          icon: "connection",
        },
        { id: "change-item-color", label: "색상 변경", command: "change-color", icon: "palette" },
        {
          id: "change-item-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "delete-item",
          label: "삭제",
          command: "delete-item",
          icon: "trash",
          danger: true,
        },
      ];
    }
  
    if (target.kind === "work-connection") {
      return [
        {
          id: "remove-work-connection",
          label: "작업 연결 제거",
          command: "remove-work-connection",
          icon: "disconnect",
          danger: true,
        },
      ];
    }
  
    if (target.kind === "milestone") {
      return [
        {
          id: "change-milestone-properties",
          label: "이름 변경",
          command: "change-properties",
          icon: "pencil",
        },
        {
          id: "remove-milestone",
          label: "마일스톤 제거",
          command: "remove-milestone",
          icon: "trash",
          danger: true,
        },
      ];
    }
  
    if (target.kind === "row") {
      const row = rowById.value.get(target.rowId);
  
      if (!row) {
        return [];
      }
  
      if (row.kind === "child-process") {
        return [
          {
            id: "change-child-color",
            label: "색상 설정",
            command: "change-color",
            icon: "palette",
          },
        ];
      }
  
      return [
        {
          id: "change-parent-properties",
          label: "속성 변경",
          command: "change-properties",
          icon: "pencil",
        },
      ];
    }
  
    if (target.kind === "canvas") {
      if (canCreateMilestoneOnCanvasTarget(target)) {
        return [
          {
            id: "create-milestone",
            label: "마일스톤 생성",
            command: "create-milestone",
            icon: "plus",
          },
        ];
      }
  
      return [
        {
          id: "create-item",
          label: "작업 생성",
          command: "create-item",
          icon: "plus",
          disabled: !canCreateItemOnCanvasTarget(target),
        },
      ];
    }
  
    return [];
  });
  
  async function executeContextMenuCommand(command: DesktopScheduleContextMenuCommand) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const target = contextMenuState.value.target;
  
    if (!target) {
      return;
    }
  
    if (
      target.kind === "reference-header" ||
      target.kind === "division-header" ||
      target.kind === "work-type-header" ||
      target.kind === "sub-work-type-header"
    ) {
      if (command === "change-color" && target.kind === "sub-work-type-header") {
        const targetRow = rowById.value.get(target.rowId);
        openColorPalette(
          {
            kind: "row",
            rowId: target.rowId,
          },
          targetRow?.colorHex,
        );
        return;
      }
  
      if (command === "create-division-reference" && target.kind === "reference-header") {
        createReferenceDivisionSet();
        return;
      }
  
      if (command === "create-work-type-reference" && target.kind === "division-header") {
        const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
          (item) => item.divisionId === target.divisionId,
        );
  
        createReferenceWorkTypeSet({
          divisionId: target.divisionId,
          divisionName: targetHierarchyItem?.divisionName ?? target.name,
        });
        return;
      }
  
      if (
        command === "create-sub-work-type-reference" &&
        (target.kind === "work-type-header" || target.kind === "sub-work-type-header")
      ) {
        createReferenceSubWorkTypeSet({
          workTypeId: target.workTypeId,
        });
        return;
      }
  
      if (command === "rename-reference") {
        if (target.kind === "division-header") {
          startDivisionRename(target.divisionId);
          return;
        }
  
        if (target.kind === "work-type-header") {
          startWorkTypeRename(target.workTypeId);
          return;
        }
  
        if (target.kind === "sub-work-type-header") {
          startSubWorkTypeRename(target.subWorkTypeId);
        }
        return;
      }
  
      if (command === "delete-reference" && target.kind !== "reference-header") {
        if (typeof window !== "undefined") {
          const confirmed = window.confirm(
            `${target.name}을(를) 삭제할까요?\n하위 항목이 있으면 함께 삭제를 시도합니다.`,
          );
  
          if (!confirmed) {
            closeContextMenu();
            return;
          }
        }
  
        const snapshot = captureWorkingSnapshot();
        const divisionHierarchy =
          target.kind === "division-header" ? getHierarchyForDivision(target.divisionId) : [];
        const workTypeHierarchy =
          target.kind === "work-type-header" ? getHierarchyForWorkType(target.workTypeId) : [];
        removeReferenceLocally(target);
        closeContextMenu();
  
        const didSave = await runScheduleMutation(
          async () => {
            if (target.kind === "division-header") {
              const subWorkTypeIds = Array.from(
                new Set(
                  divisionHierarchy
                    .map((item) => item.subWorkTypeId)
                    .filter((subWorkTypeId) => subWorkTypeId > 0),
                ),
              );
              const workTypeIds = Array.from(
                new Set(
                  divisionHierarchy
                    .map((item) => item.workTypeId)
                    .filter((workTypeId) => workTypeId > 0),
                ),
              );
  
              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId, getRequiredScheduleVersionIdForReferenceMutation()),
                ),
              );
              await Promise.all(
                workTypeIds.map((workTypeId) => desktopScheduleApi.deleteWorkType(workTypeId, getRequiredScheduleVersionIdForReferenceMutation())),
              );
              if (target.divisionId > 0) {
                await desktopScheduleApi.deleteDivision(
                  target.divisionId,
                  getRequiredScheduleVersionIdForReferenceMutation(),
                );
              }
              return;
            }
  
            if (target.kind === "work-type-header") {
              const subWorkTypeIds = Array.from(
                new Set(
                  workTypeHierarchy
                    .map((item) => item.subWorkTypeId)
                    .filter((subWorkTypeId) => subWorkTypeId > 0),
                ),
              );
  
              await Promise.all(
                subWorkTypeIds.map((subWorkTypeId) =>
                  desktopScheduleApi.deleteSubWorkType(subWorkTypeId, getRequiredScheduleVersionIdForReferenceMutation()),
                ),
              );
              if (target.workTypeId > 0) {
                await desktopScheduleApi.deleteWorkType(
                  target.workTypeId,
                  getRequiredScheduleVersionIdForReferenceMutation(),
                );
              }
              return;
            }
  
            if (target.kind === "sub-work-type-header") {
              if (target.subWorkTypeId > 0) {
                await desktopScheduleApi.deleteSubWorkType(
                  target.subWorkTypeId,
                  getRequiredScheduleVersionIdForReferenceMutation(),
                );
              }
            }
          },
          "공정 항목을 삭제하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        trackScheduleMutationResult("delete_selection", didSave, {
          reference_kind: target.kind.replace("-header", ""),
        });
        return;
      }
    }
  
    if (
      command === "create-milestone" &&
      target.kind === "canvas" &&
      canCreateMilestoneOnCanvasTarget(target) &&
      target.date
    ) {
      await activateMilestone({ date: target.date });
      return;
    }
  
    if (
      command === "create-item" &&
      target.kind === "canvas" &&
      canCreateItemOnCanvasTarget(target) &&
      target.rowId &&
      target.date
    ) {
      await createItemOnCanvasTarget({
        rowId: target.rowId,
        startDate: target.date,
      });
      return;
    }
  
    if (target.kind === "row") {
      const targetRow = rowById.value.get(target.rowId);
  
      if (!targetRow) {
        closeContextMenu();
        return;
      }
  
      if (command === "change-color") {
        openColorPalette(target, targetRow.colorHex);
        return;
      }
  
      if (targetRow.kind === "parent-process" && command === "change-properties") {
        const nextName = promptForName("공종명을 입력하세요.", targetRow.name);
        if (nextName) {
          const snapshot = captureWorkingSnapshot();
          workingRows.value = desktopScheduleService.updateRowName(
            workingRows.value,
            target.rowId,
            nextName,
          );
          pushLocalHistoryEntry(snapshot);
        }
        closeContextMenu();
        return;
      }
    }
  
    if (target.kind === "item") {
      const scopedItemIds = getScopedItemIds(target.itemId);
  
      if (command === "toggle-work-connection") {
        connectionCreationState.value = {
          kind: "work-connection",
          sourceItemId: target.itemId,
        };
        selectionState.value = {
          ...createEmptyDesktopScheduleSelectionState(),
          itemIds: [target.itemId],
        };
        closeContextMenu();
        return;
      }
  
      if (command === "delete-item") {
        const snapshot = captureWorkingSnapshot();
        const workIdsToDelete = workingItems.value
          .filter((item) => scopedItemIds.includes(item.id))
          .map((item) => item.workId);
        workingItems.value = desktopScheduleService.deleteItems(workingItems.value, scopedItemIds);
        workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsForItems(
          workingWorkConnections.value,
          scopedItemIds,
        );
        if (renamingItemId.value && scopedItemIds.includes(renamingItemId.value)) {
          renamingItemId.value = null;
        }
        selectionState.value = createEmptyDesktopScheduleSelectionState();
        removeLoadedWorksAndWorkDeps(workIdsToDelete);
        closeContextMenu();
        const didSave = await runScheduleMutation(
          async () => {
            await Promise.all(
              workIdsToDelete.map((workId) => desktopScheduleApi.deleteWork(workId)),
            );
          },
          "작업을 삭제하지 못했습니다.",
          {
            rollback: () => restoreWorkingSnapshot(snapshot),
          },
        );
        if (didSave) {
          pushLocalHistoryEntry(snapshot);
        }
        trackScheduleMutationResult("delete_selection", didSave, {
          work_count: workIdsToDelete.length,
        });
        return;
      }
  
      if (command === "change-color") {
        const targetItem = workingItems.value.find((item) => item.id === target.itemId);
        openColorPalette(target, targetItem?.colorHex);
        return;
      }
  
      if (command === "change-properties") {
        startItemRename(target.itemId);
        return;
      }
    }
  
    if (target.kind === "work-connection" && command === "remove-work-connection") {
      const targetWorkConnection = getWorkConnectionById(target.workConnectionId);
      const snapshot = captureWorkingSnapshot();
      closeContextMenu();
      if (!targetWorkConnection) {
        return;
      }
  
      workingWorkConnections.value = desktopScheduleService.removeWorkConnectionsByIds(
        workingWorkConnections.value,
        [target.workConnectionId],
      );
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      removeLoadedWorkDeps([targetWorkConnection.pathId]);
  
      const didSave = await runScheduleMutation(
        async () => {
          await desktopScheduleApi.deleteWorkDep(targetWorkConnection.pathId);
        },
        "작업 연결을 제거하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("remove_connection", didSave);
      return;
    }
  
    if (target.kind === "milestone" && command === "remove-milestone") {
      const snapshot = captureWorkingSnapshot();
      const targetMilestone = workingMilestones.value.find(
        (milestone) => milestone.id === target.milestoneId,
      );
      const milestoneApiId = getMilestoneApiId(targetMilestone);
      workingMilestones.value = desktopScheduleService.removeMilestonesByIds(
        workingMilestones.value,
        [target.milestoneId],
      );
      removeLoadedMilestones(milestoneApiId === null ? [] : [milestoneApiId]);
      if (renamingMilestoneId.value === target.milestoneId) {
        renamingMilestoneId.value = null;
      }
      selectionState.value = createEmptyDesktopScheduleSelectionState();
      closeContextMenu();
      if (milestoneApiId === null) {
        pushLocalHistoryEntry(snapshot);
        trackScheduleAction("remove_milestone", "success", {
          local_only: true,
        });
        return;
      }
  
      const didSave = await runScheduleMutation(
        async () => {
          await desktopScheduleApi.deleteMilestone(
            milestoneApiId,
            getRequiredScheduleVersionIdForReferenceMutation(),
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
      trackScheduleMutationResult("remove_milestone", didSave);
      return;
    }
  
    if (target.kind === "milestone" && command === "change-properties") {
      startMilestoneRename(target.milestoneId);
      return;
    }
  
  }
  
  
  return {
    contextMenuItems,
    executeContextMenuCommand,
  };
}
