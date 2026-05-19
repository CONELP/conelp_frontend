import type { Ref } from "vue";

import type {
    DesktopScheduleBootstrapData,
    DesktopScheduleReferenceHierarchyItem,
    DesktopScheduleVersionId,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type { DesktopScheduleRow } from "@/features/desktop-schedule/model/desktop-schedule.types";
import type { DesktopScheduleLocalSnapshot } from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";

type DesktopScheduleReferenceMutationDependencies = {
  DEFAULT_DIVISION_NAME: string;
  DEFAULT_WORK_TYPE_NAME: string;
  DEFAULT_SUB_WORK_TYPE_NAME: string;
  DEFAULT_SUB_WORK_TYPE_COLOR_HEX: string;
  scheduleLoadState: Ref<{ data: DesktopScheduleBootstrapData | null }>;
  workingRows: Ref<DesktopScheduleRow[]>;
  renamingDivisionId: Ref<number | null>;
  renamingWorkTypeId: Ref<number | null>;
  renamingSubWorkTypeId: Ref<number | null>;
  renamingItemId: Ref<string | null>;
  renamingMilestoneId: Ref<string | null>;
  ensureScheduleEditable: () => boolean;
  captureWorkingSnapshot: () => DesktopScheduleLocalSnapshot;
  pushLocalHistoryEntry: (previousSnapshot: DesktopScheduleLocalSnapshot) => void;
  restoreWorkingSnapshot: (snapshot: DesktopScheduleLocalSnapshot) => void;
  closeContextMenu: () => void;
  showScheduleToast: (message: string, tone?: "neutral" | "warning") => void;
  handleMutationError: (error: unknown, fallbackMessage: string) => void;
  trackScheduleAction: (
    action: string,
    status: "attempt" | "success" | "fail",
    meta?: Record<string, string | number | boolean | null>,
  ) => void;
  trackScheduleMutationResult: (
    action: string,
    result: boolean,
    meta?: Record<string, string | number | boolean | null>,
  ) => void;
  trackCreateReferenceDraft: (referenceKind: "division" | "work_type" | "sub_work_type") => void;
  runScheduleMutation: (
    mutation: () => Promise<unknown>,
    fallbackMessage: string,
    options?: { reloadOnSuccess?: boolean; reloadOnError?: boolean; rollback?: () => void },
  ) => Promise<boolean>;
  updateLoadedScheduleData: (
    updater: (data: DesktopScheduleBootstrapData) => DesktopScheduleBootstrapData,
  ) => DesktopScheduleBootstrapData | null;
  rebuildScheduleFromLoadedData: () => void;
  addReferenceHierarchyItem: (item: DesktopScheduleReferenceHierarchyItem) => void;
  addReferenceSubWorkTypeItem: (item: DesktopScheduleReferenceHierarchyItem) => void;
  replaceReferenceDivisionId: (pendingId: number, division: { id: number; name: string }) => void;
  replaceReferenceWorkTypeId: (pendingId: number, workType: { id: number; name: string }) => void;
  replaceReferenceSubWorkTypeId: (
    pendingId: number,
    subWorkType: { id: number; name: string; color?: string | null },
  ) => void;
  updateReferenceNameLocally: (...args: any[]) => void;
  getHierarchyForDivision: (divisionId: number) => DesktopScheduleReferenceHierarchyItem[];
  getHierarchyForWorkType: (workTypeId: number) => DesktopScheduleReferenceHierarchyItem[];
  createOptimisticReferenceId: () => number;
  createUniqueReferenceName: (baseName: string, existingNames: string[]) => string;
  getRequiredScheduleVersionIdForReferenceMutation: () => DesktopScheduleVersionId;
  sortHierarchyByDivisionIds: (...args: any[]) => DesktopScheduleReferenceHierarchyItem[];
  sortHierarchyBySubWorkTypeIds: (...args: any[]) => DesktopScheduleReferenceHierarchyItem[];
  sortHierarchyByWorkTypeIds: (...args: any[]) => DesktopScheduleReferenceHierarchyItem[];
};

export function useDesktopScheduleReferenceMutations({
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
}: DesktopScheduleReferenceMutationDependencies) {
  function createReferenceDivisionSet() {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: createOptimisticReferenceId(),
      divisionName: DEFAULT_DIVISION_NAME,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };
  
    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    trackCreateReferenceDraft("division");
    closeContextMenu();
  }
  
  function startDivisionRename(divisionId: number) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.divisionId === divisionId,
    );
  
    if (!targetHierarchyItem) {
      renamingDivisionId.value = null;
      return;
    }
  
    renamingDivisionId.value = divisionId;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }
  
  async function commitDivisionRename(payload: { divisionId: number; name: string }) {
    if (!ensureScheduleEditable()) {
      renamingDivisionId.value = null;
      return;
    }
  
    const nextName = payload.name.trim();
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.divisionId === payload.divisionId,
    );
  
    renamingDivisionId.value = null;
  
    if (!targetHierarchyItem || !nextName || targetHierarchyItem.divisionName === nextName) {
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "division-header" as const,
      divisionId: payload.divisionId,
      name: targetHierarchyItem.divisionName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();
  
    if (payload.divisionId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const division = await desktopScheduleApi.createDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            name: nextName,
          });
          replaceReferenceDivisionId(payload.divisionId, division);
        },
        "분류를 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("create_division", didSave, {
        reference_kind: "division",
      });
      return;
    }
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(), id: payload.divisionId, name: nextName });
      },
      "분류 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("rename_division", didSave);
  }
  
  function cancelDivisionRename() {
    renamingDivisionId.value = null;
    closeContextMenu();
  }
  
  function createReferenceWorkTypeSet(payload: { divisionId: number; divisionName: string }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: payload.divisionId,
      divisionName: payload.divisionName,
      workTypeId: createOptimisticReferenceId(),
      workTypeName: DEFAULT_WORK_TYPE_NAME,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };
  
    addReferenceHierarchyItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    trackCreateReferenceDraft("work_type");
    closeContextMenu();
  }
  
  function createReferenceSubWorkTypeSet(payload: { workTypeId: number }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === payload.workTypeId,
    );
  
    if (!targetHierarchyItem) {
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const tempReferenceItem: DesktopScheduleReferenceHierarchyItem = {
      divisionId: targetHierarchyItem.divisionId,
      divisionName: targetHierarchyItem.divisionName,
      workTypeId: targetHierarchyItem.workTypeId,
      workTypeName: targetHierarchyItem.workTypeName,
      subWorkTypeId: createOptimisticReferenceId(),
      subWorkTypeName: DEFAULT_SUB_WORK_TYPE_NAME,
      subWorkTypeColor: null,
    };
  
    addReferenceSubWorkTypeItem(tempReferenceItem);
    pushLocalHistoryEntry(snapshot);
    trackCreateReferenceDraft("sub_work_type");
    closeContextMenu();
  }
  
  function startWorkTypeRename(workTypeId: number) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === workTypeId,
    );
  
    if (!targetHierarchyItem) {
      renamingWorkTypeId.value = null;
      return;
    }
  
    renamingWorkTypeId.value = workTypeId;
    renamingDivisionId.value = null;
    renamingSubWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }
  
  async function commitWorkTypeRename(payload: { workTypeId: number; name: string }) {
    if (!ensureScheduleEditable()) {
      renamingWorkTypeId.value = null;
      return;
    }
  
    const nextName = payload.name.trim();
    const targetHierarchyItem = scheduleLoadState.value.data?.workHierarchy.find(
      (item) => item.workTypeId === payload.workTypeId,
    );
  
    renamingWorkTypeId.value = null;
  
    if (!targetHierarchyItem || !nextName || targetHierarchyItem.workTypeName === nextName) {
      closeContextMenu();
      return;
    }
  
    if (targetHierarchyItem.divisionId < 0) {
      showScheduleToast("분류명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "work-type-header" as const,
      divisionId: targetHierarchyItem.divisionId,
      workTypeId: payload.workTypeId,
      name: targetHierarchyItem.workTypeName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();
  
    if (payload.workTypeId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const workType = await desktopScheduleApi.createWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            divisionId: targetHierarchyItem.divisionId,
            name: nextName,
          });
          replaceReferenceWorkTypeId(payload.workTypeId, workType);
        },
        "공종을 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("create_work_type", didSave, {
        reference_kind: "work_type",
      });
      return;
    }
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          id: payload.workTypeId,
          name: nextName,
        });
      },
      "공종 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("rename_work_type", didSave);
  }
  
  function cancelWorkTypeRename() {
    renamingWorkTypeId.value = null;
    closeContextMenu();
  }
  
  function findHierarchyItemForSubWorkTypeRename(subWorkTypeId: number) {
    const hierarchy = scheduleLoadState.value.data?.workHierarchy;
  
    if (!hierarchy) {
      return undefined;
    }
  
    const directMatch = hierarchy.find((item) => item.subWorkTypeId === subWorkTypeId);
    if (directMatch) {
      return directMatch;
    }
  
    if (subWorkTypeId < 0) {
      // service.buildRows 에서 workType-only placeholder 에 `-workTypeId` 음수 임시 id 를 부여한다.
      // hierarchy 에는 여전히 subWorkTypeId=0 으로 저장되어 있으므로 workTypeId 로 역추적한다.
      const workTypeId = -subWorkTypeId;
      return hierarchy.find(
        (item) => item.workTypeId === workTypeId && item.subWorkTypeId === 0,
      );
    }
  
    return undefined;
  }
  
  function startSubWorkTypeRename(subWorkTypeId: number) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    const targetHierarchyItem = findHierarchyItemForSubWorkTypeRename(subWorkTypeId);
  
    if (!targetHierarchyItem) {
      renamingSubWorkTypeId.value = null;
      return;
    }
  
    renamingSubWorkTypeId.value = subWorkTypeId;
    renamingDivisionId.value = null;
    renamingWorkTypeId.value = null;
    renamingItemId.value = null;
    renamingMilestoneId.value = null;
    closeContextMenu();
  }
  
  async function commitSubWorkTypeRename(payload: { subWorkTypeId: number; name: string }) {
    if (!ensureScheduleEditable()) {
      renamingSubWorkTypeId.value = null;
      return;
    }
  
    const nextName = payload.name.trim();
    const targetHierarchyItem = findHierarchyItemForSubWorkTypeRename(payload.subWorkTypeId);
  
    renamingSubWorkTypeId.value = null;
  
    if (!targetHierarchyItem || !nextName || targetHierarchyItem.subWorkTypeName === nextName) {
      closeContextMenu();
      return;
    }
  
    if (targetHierarchyItem.workTypeId < 0) {
      showScheduleToast("공종명을 먼저 입력해 주세요.");
      closeContextMenu();
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    const target = {
      kind: "sub-work-type-header" as const,
      workTypeId: targetHierarchyItem.workTypeId,
      subWorkTypeId: payload.subWorkTypeId,
      rowId: `row:${payload.subWorkTypeId}`,
      name: targetHierarchyItem.subWorkTypeName,
    };
    updateReferenceNameLocally(target, nextName);
    closeContextMenu();
  
    if (payload.subWorkTypeId < 0) {
      const didSave = await runScheduleMutation(
        async () => {
          const subWorkType = await desktopScheduleApi.createSubWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
            workTypeId: targetHierarchyItem.workTypeId,
            name: nextName,
            color: targetHierarchyItem.subWorkTypeColor ?? DEFAULT_SUB_WORK_TYPE_COLOR_HEX,
          });
          replaceReferenceSubWorkTypeId(payload.subWorkTypeId, subWorkType);
        },
        "세부공종을 추가하지 못했습니다.",
        {
          rollback: () => restoreWorkingSnapshot(snapshot),
        },
      );
      if (didSave) {
        pushLocalHistoryEntry(snapshot);
      }
      trackScheduleMutationResult("create_sub_work_type", didSave, {
        reference_kind: "sub_work_type",
      });
      return;
    }
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateSubWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          id: payload.subWorkTypeId,
          name: nextName,
        });
      },
      "세부공종 이름을 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("rename_sub_work_type", didSave);
  }
  
  function cancelSubWorkTypeRename() {
    renamingSubWorkTypeId.value = null;
    closeContextMenu();
  }
  
  async function reorderReferenceDivisions(payload: { divisionIds: number[] }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    if (payload.divisionIds.length < 2) {
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: sortHierarchyByDivisionIds(currentData.workHierarchy, payload.divisionIds),
    }));
    rebuildScheduleFromLoadedData();
    closeContextMenu();
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateDivision({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(), ids: payload.divisionIds });
      },
      "분류 순서를 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("reorder_reference", didSave, {
      reference_kind: "division",
      item_count: payload.divisionIds.length,
    });
  }
  
  async function reorderReferenceSubWorkTypes(payload: {
    workTypeId: number;
    subWorkTypeIds: number[];
  }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    if (payload.subWorkTypeIds.length < 2) {
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: sortHierarchyBySubWorkTypeIds(
        currentData.workHierarchy,
        payload.workTypeId,
        payload.subWorkTypeIds,
      ),
    }));
    rebuildScheduleFromLoadedData();
    closeContextMenu();
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateSubWorkType({
          scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          parentId: payload.workTypeId,
          ids: payload.subWorkTypeIds,
        });
      },
      "세부공종 순서를 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("reorder_reference", didSave, {
      reference_kind: "sub_work_type",
      item_count: payload.subWorkTypeIds.length,
    });
  }
  
  async function reorderReferenceWorkTypes(payload: { divisionId: number; workTypeIds: number[] }) {
    if (!ensureScheduleEditable()) {
      return;
    }
  
    if (payload.workTypeIds.length < 2) {
      return;
    }
  
    const snapshot = captureWorkingSnapshot();
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: sortHierarchyByWorkTypeIds(
        currentData.workHierarchy,
        payload.divisionId,
        payload.workTypeIds,
      ),
    }));
    rebuildScheduleFromLoadedData();
    closeContextMenu();
  
    const didSave = await runScheduleMutation(
      async () => {
        await desktopScheduleApi.updateWorkType({
            scheduleVersionId: getRequiredScheduleVersionIdForReferenceMutation(),
          parentId: payload.divisionId,
          ids: payload.workTypeIds,
        });
      },
      "공종 순서를 변경하지 못했습니다.",
      {
        rollback: () => restoreWorkingSnapshot(snapshot),
      },
    );
    if (didSave) {
      pushLocalHistoryEntry(snapshot);
    }
    trackScheduleMutationResult("reorder_reference", didSave, {
      reference_kind: "work_type",
      item_count: payload.workTypeIds.length,
    });
  }
  
  
  return {
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
  };
}
