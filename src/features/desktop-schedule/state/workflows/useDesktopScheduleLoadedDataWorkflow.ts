import { type Ref } from "vue";

import type {
    DesktopScheduleApiLoadState,
    DesktopScheduleBootstrapData,
    DesktopScheduleMilestoneResponse,
    DesktopScheduleMutationResponse,
    DesktopScheduleReferenceHierarchyItem,
    DesktopScheduleWorkDepResponse,
    DesktopScheduleWorkResponse
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { createDesktopScheduleSnapshotFromApiData } from "@/features/desktop-schedule/api/desktop-schedule.mapper";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleSnapshot,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    cloneMilestoneResponse
} from "@/features/desktop-schedule/services/domain/desktop-schedule-history.service";
import {
    createMilestoneModelFromApi,
    getMilestoneApiId
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type {
    DesktopScheduleContextMenuTarget,
    DesktopScheduleSelectionState
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";



type DesktopScheduleLoadedDataWorkflowDeps = Record<string, any> & {
  scheduleLoadState: Ref<DesktopScheduleApiLoadState<DesktopScheduleBootstrapData>>;
  selectionState: Ref<DesktopScheduleSelectionState>;
  renamingMilestoneId: Ref<string | null>;
  workingRows: Ref<DesktopScheduleRow[]>;
  workingItems: Ref<DesktopScheduleItem[]>;
  workingWorkConnections: Ref<DesktopScheduleWorkConnection[]>;
  workingMilestones: Ref<DesktopScheduleMilestone[]>;
  applyScheduleSnapshot: (snapshot: DesktopScheduleSnapshot) => void;
};

export function useDesktopScheduleLoadedDataWorkflow(deps: DesktopScheduleLoadedDataWorkflowDeps) {
  const {
    scheduleLoadState,
    selectionState,
    renamingMilestoneId,
    workingRows,
    workingItems,
    workingWorkConnections,
    workingMilestones,
    applyScheduleSnapshot,
  } = deps;

  
  function updateLoadedScheduleData(
    updater: (data: DesktopScheduleBootstrapData) => DesktopScheduleBootstrapData,
  ) {
    const currentData = scheduleLoadState.value.data;
  
    if (!currentData) {
      return null;
    }
  
    const nextData = updater(currentData);
    scheduleLoadState.value = {
      ...scheduleLoadState.value,
      status: scheduleLoadState.value.status === "error" ? "success" : scheduleLoadState.value.status,
      data: nextData,
      error: null,
    };
  
    return nextData;
  }

  function mergeWorksIntoData(
    data: DesktopScheduleBootstrapData,
    updatedWorks: DesktopScheduleWorkResponse[],
  ) {
    if (updatedWorks.length === 0) {
      return data;
    }
  
    const workById = new Map(data.works.map((work) => [work.workId, work] as const));
    updatedWorks.forEach((work) => {
      workById.set(work.workId, work);
    });
  
    return {
      ...data,
      works: Array.from(workById.values()),
    };
  }
  
  function mergeWorkDepsIntoData(
    data: DesktopScheduleBootstrapData,
    updatedWorkDeps: DesktopScheduleWorkDepResponse[],
  ) {
    if (updatedWorkDeps.length === 0) {
      return data;
    }
  
    const workDepById = new Map(data.workDeps.map((workDep) => [workDep.id, workDep] as const));
    updatedWorkDeps.forEach((workDep) => {
      workDepById.set(workDep.id, workDep);
    });
  
    return {
      ...data,
      workDeps: Array.from(workDepById.values()),
    };
  }
  
  function applyServerMutationPatch(
    response: DesktopScheduleMutationResponse,
    options: {
      rebuildSnapshot?: boolean;
      replacementWorkDeps?: DesktopScheduleWorkDepResponse[];
    } = {},
  ) {
    const nextData = updateLoadedScheduleData((currentData) => {
      const mergedWorksData = mergeWorksIntoData(currentData, response.updatedWorks ?? []);
      const mergedData = options.replacementWorkDeps
        ? {
            ...mergedWorksData,
            workDeps: options.replacementWorkDeps.map((workDep) => ({ ...workDep })),
          }
        : mergeWorkDepsIntoData(mergedWorksData, response.updatedWorkDeps ?? []);
  
      return mergedData;
    });
  
    if (options.rebuildSnapshot && nextData) {
      applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(nextData));
    }
  }
  
  function removeLoadedWorksAndWorkDeps(workIds: number[], workDepIds: number[] = []) {
    const workIdSet = new Set(workIds);
    const workDepIdSet = new Set(workDepIds);
  
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.filter((work) => !workIdSet.has(work.workId)),
      workDeps: currentData.workDeps.filter(
        (workDep) =>
          !workDepIdSet.has(workDep.id) &&
          !workIdSet.has(workDep.sourceWorkId) &&
          !workIdSet.has(workDep.targetWorkId),
      ),
    }));
  }
  
  function removeLoadedWorkDeps(workDepIds: number[]) {
    const workDepIdSet = new Set(workDepIds);
  
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workDeps: currentData.workDeps.filter((workDep) => !workDepIdSet.has(workDep.id)),
    }));
  }
  
  function syncLoadedDataFromWorkingItemsAndConnections(
    items: DesktopScheduleItem[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    const itemByWorkId = new Map(items.map((item) => [item.workId, item] as const));
    const workConnectionByPathId = new Map(
      workConnections.map((workConnection) => [workConnection.pathId, workConnection] as const),
    );
  
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.map((work) => {
        const item = itemByWorkId.get(work.workId);
  
        if (!item) {
          return work;
        }
  
        return {
          ...work,
          startDate: item.startDate,
          completionDate: item.endDate,
          workLeadTime: item.durationDays,
        };
      }),
      workDeps: currentData.workDeps.map((workDep) => {
        const workConnection = workConnectionByPathId.get(workDep.id);
  
        if (!workConnection) {
          return workDep;
        }
  
        return {
          ...workDep,
          lagDays: workConnection.gapDays,
        };
      }),
    }));
  }
  
  function syncLoadedWorkName(workId: number, workName: string) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.map((work) =>
        work.workId === workId
          ? {
              ...work,
              workName,
            }
          : work,
      ),
    }));
  }
  
  function patchLoadedWorkActualDates(
    affectedWorks: { workId: number; actualDates: string[] }[],
  ) {
    if (!affectedWorks || affectedWorks.length === 0) {
      return;
    }
  
    const actualDatesByWorkId = new Map<number, string[]>(
      affectedWorks.map((entry) => [entry.workId, [...entry.actualDates]]),
    );
  
    const nextData = updateLoadedScheduleData((currentData) => ({
      ...currentData,
      works: currentData.works.map((work) => {
        const actualDates = actualDatesByWorkId.get(work.workId);
        if (!actualDates) {
          return work;
        }
        return {
          ...work,
          actualDates,
        };
      }),
    }));
  
    if (nextData) {
      applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(nextData));
    }
  }
  
  function syncLoadedSubWorkTypeColor(subWorkTypeId: number, colorHex: string | null) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.subWorkTypeId === subWorkTypeId
          ? {
              ...item,
              subWorkTypeColor: colorHex,
            }
          : item,
      ),
    }));
  }
  
  function upsertLoadedMilestone(milestone: DesktopScheduleMilestoneResponse) {
    updateLoadedScheduleData((currentData) => {
      const milestoneById = new Map(
        (currentData.milestones ?? []).map((currentMilestone) => [
          currentMilestone.id,
          cloneMilestoneResponse(currentMilestone),
        ] as const),
      );
      milestoneById.set(milestone.id, cloneMilestoneResponse(milestone));
  
      return {
        ...currentData,
        milestones: Array.from(milestoneById.values()).sort((a, b) =>
          a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date),
        ),
      };
    });
  }
  
  function syncLoadedMilestoneFromModel(milestone: DesktopScheduleMilestone) {
    const apiId = getMilestoneApiId(milestone);
  
    if (apiId === null) {
      return;
    }
  
    upsertLoadedMilestone({
      id: apiId,
      date: milestone.date,
      name: milestone.label,
    });
  }
  
  function removeLoadedMilestones(milestoneApiIds: number[]) {
    if (milestoneApiIds.length === 0) {
      return;
    }
  
    const milestoneApiIdSet = new Set(milestoneApiIds);
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      milestones: (currentData.milestones ?? []).filter(
        (milestone) => !milestoneApiIdSet.has(milestone.id),
      ),
    }));
  }
  
  function replaceWorkingMilestoneWithApiMilestone(
    localMilestoneId: string,
    apiMilestone: DesktopScheduleMilestoneResponse,
  ) {
    const milestone = createMilestoneModelFromApi(apiMilestone);
    workingMilestones.value = workingMilestones.value.map((currentMilestone) =>
      currentMilestone.id === localMilestoneId ? milestone : currentMilestone,
    );
    selectionState.value = {
      ...selectionState.value,
      milestoneIds: selectionState.value.milestoneIds.map((milestoneId) =>
        milestoneId === localMilestoneId ? milestone.id : milestoneId,
      ),
    };
    if (renamingMilestoneId.value === localMilestoneId) {
      renamingMilestoneId.value = milestone.id;
    }
    upsertLoadedMilestone(apiMilestone);
  }
  
  function rebuildScheduleFromLoadedData() {
    const currentData = scheduleLoadState.value.data;
  
    if (!currentData) {
      return;
    }
  
    applyScheduleSnapshot(createDesktopScheduleSnapshotFromApiData(currentData));
  }
  
  function insertReferenceHierarchyItem(
    items: DesktopScheduleReferenceHierarchyItem[],
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    const lastSameDivisionIndex = items.reduce(
      (lastIndex, currentItem, index) =>
        currentItem.divisionId === item.divisionId ? index : lastIndex,
      -1,
    );
  
    if (lastSameDivisionIndex < 0) {
      return [...items, item];
    }
  
    return [
      ...items.slice(0, lastSameDivisionIndex + 1),
      item,
      ...items.slice(lastSameDivisionIndex + 1),
    ];
  }
  
  function insertReferenceSubWorkTypeItem(
    items: DesktopScheduleReferenceHierarchyItem[],
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    const lastSameWorkTypeIndex = items.reduce(
      (lastIndex, currentItem, index) =>
        currentItem.workTypeId === item.workTypeId ? index : lastIndex,
      -1,
    );
  
    if (lastSameWorkTypeIndex < 0) {
      return insertReferenceHierarchyItem(items, item);
    }
  
    return [
      ...items.slice(0, lastSameWorkTypeIndex + 1),
      item,
      ...items.slice(lastSameWorkTypeIndex + 1),
    ];
  }
  
  function sortHierarchyByDivisionIds(
    items: DesktopScheduleReferenceHierarchyItem[],
    divisionIds: number[],
  ) {
    const divisionOrder = new Map(divisionIds.map((divisionId, index) => [divisionId, index]));
  
    return [...items].sort((a, b) => {
      const aOrder = divisionOrder.get(a.divisionId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = divisionOrder.get(b.divisionId) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }
  
  function sortHierarchyByWorkTypeIds(
    items: DesktopScheduleReferenceHierarchyItem[],
    divisionId: number,
    workTypeIds: number[],
  ) {
    const workTypeOrder = new Map(workTypeIds.map((workTypeId, index) => [workTypeId, index]));
  
    return [...items].sort((a, b) => {
      if (a.divisionId !== divisionId || b.divisionId !== divisionId) {
        return 0;
      }
  
      const aOrder = workTypeOrder.get(a.workTypeId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = workTypeOrder.get(b.workTypeId) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }
  
  function sortHierarchyBySubWorkTypeIds(
    items: DesktopScheduleReferenceHierarchyItem[],
    workTypeId: number,
    subWorkTypeIds: number[],
  ) {
    const subWorkTypeOrder = new Map(
      subWorkTypeIds.map((subWorkTypeId, index) => [subWorkTypeId, index]),
    );
  
    return [...items].sort((a, b) => {
      if (a.workTypeId !== workTypeId || b.workTypeId !== workTypeId) {
        return 0;
      }
  
      const aOrder = subWorkTypeOrder.get(a.subWorkTypeId) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = subWorkTypeOrder.get(b.subWorkTypeId) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }
  
  function addReferenceHierarchyItem(item: DesktopScheduleReferenceHierarchyItem) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: insertReferenceHierarchyItem(currentData.workHierarchy, item),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function addReferenceSubWorkTypeItem(item: DesktopScheduleReferenceHierarchyItem) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: insertReferenceSubWorkTypeItem(currentData.workHierarchy, item),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function replaceReferenceHierarchyItem(
    tempSubWorkTypeId: number,
    item: DesktopScheduleReferenceHierarchyItem,
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((hierarchyItem) =>
        hierarchyItem.subWorkTypeId === tempSubWorkTypeId ? item : hierarchyItem,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function replaceReferenceDivisionId(
    tempDivisionId: number,
    division: { id: number; name: string },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.divisionId === tempDivisionId
          ? {
              ...item,
              divisionId: division.id,
              divisionName: division.name,
            }
          : item,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function replaceReferenceWorkTypeId(
    tempWorkTypeId: number,
    workType: { id: number; name: string },
  ) {
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) =>
        item.workTypeId === tempWorkTypeId
          ? {
              ...item,
              workTypeId: workType.id,
              workTypeName: workType.name,
            }
          : item,
      ),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function replaceReferenceSubWorkTypeId(
    tempSubWorkTypeId: number,
    subWorkType: { id: number; name: string; color?: string | null },
  ) {
    // service 가 부여한 음수 임시 id (`-workTypeId`) 의 경우 hierarchy 에는 subWorkTypeId=0 으로 저장된 placeholder 가 대응됨.
    const placeholderWorkTypeId = tempSubWorkTypeId < 0 ? -tempSubWorkTypeId : null;
  
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) => {
        const matchesByTempId = item.subWorkTypeId === tempSubWorkTypeId;
        const matchesByPlaceholder =
          placeholderWorkTypeId !== null &&
          item.workTypeId === placeholderWorkTypeId &&
          item.subWorkTypeId === 0;
  
        if (!matchesByTempId && !matchesByPlaceholder) {
          return item;
        }
  
        return {
          ...item,
          subWorkTypeId: subWorkType.id,
          subWorkTypeName: subWorkType.name,
          subWorkTypeColor: subWorkType.color ?? item.subWorkTypeColor ?? null,
        };
      }),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function getHierarchyForDivision(divisionId: number) {
    return scheduleLoadState.value.data?.workHierarchy.filter(
      (item) => item.divisionId === divisionId,
    ) ?? [];
  }
  
  function getHierarchyForWorkType(workTypeId: number) {
    return scheduleLoadState.value.data?.workHierarchy.filter(
      (item) => item.workTypeId === workTypeId,
    ) ?? [];
  }
  
  function updateReferenceNameLocally(
    target: Extract<
      DesktopScheduleContextMenuTarget,
      { kind: "division-header" | "work-type-header" | "sub-work-type-header" }
    >,
    name: string,
  ) {
    // sub-work-type placeholder 의 경우 target.subWorkTypeId 는 service 가 부여한 음수 임시 id 이고,
    // hierarchy 에는 subWorkTypeId=0 으로 저장돼 있어 workTypeId 매칭이 필요.
    const placeholderWorkTypeIdForSubWorkType =
      target.kind === "sub-work-type-header" && target.subWorkTypeId < 0
        ? -target.subWorkTypeId
        : null;
  
    updateLoadedScheduleData((currentData) => ({
      ...currentData,
      workHierarchy: currentData.workHierarchy.map((item) => {
        if (target.kind === "division-header" && item.divisionId === target.divisionId) {
          return { ...item, divisionName: name };
        }
  
        if (target.kind === "work-type-header" && item.workTypeId === target.workTypeId) {
          return { ...item, workTypeName: name };
        }
  
        if (target.kind === "sub-work-type-header") {
          const matchesByTempId = item.subWorkTypeId === target.subWorkTypeId;
          const matchesByPlaceholder =
            placeholderWorkTypeIdForSubWorkType !== null &&
            item.workTypeId === placeholderWorkTypeIdForSubWorkType &&
            item.subWorkTypeId === 0;
  
          if (matchesByTempId || matchesByPlaceholder) {
            return { ...item, subWorkTypeName: name };
          }
        }
  
        return item;
      }),
      works: currentData.works.map((work) => {
        if (target.kind === "sub-work-type-header" && work.subWorkTypeId === target.subWorkTypeId) {
          return { ...work, subWorkType: name };
        }
  
        const hierarchyItem = currentData.workHierarchy.find(
          (item) => item.subWorkTypeId === work.subWorkTypeId,
        );
  
        if (!hierarchyItem) {
          return work;
        }
  
        if (target.kind === "division-header" && hierarchyItem.divisionId === target.divisionId) {
          return { ...work, division: name };
        }
  
        if (target.kind === "work-type-header" && hierarchyItem.workTypeId === target.workTypeId) {
          return { ...work, workType: name };
        }
  
        return work;
      }),
    }));
    rebuildScheduleFromLoadedData();
  }
  
  function removeReferenceLocally(
    target: Extract<
      DesktopScheduleContextMenuTarget,
      { kind: "division-header" | "work-type-header" | "sub-work-type-header" }
    >,
  ) {
    updateLoadedScheduleData((currentData) => {
      const removedSubWorkTypeIds = new Set(
        currentData.workHierarchy
          .filter((item) => {
            if (target.kind === "division-header") {
              return item.divisionId === target.divisionId;
            }
  
            if (target.kind === "work-type-header") {
              return item.workTypeId === target.workTypeId;
            }
  
            return item.subWorkTypeId === target.subWorkTypeId;
          })
          .map((item) => item.subWorkTypeId),
      );
      const removedWorkIds = new Set(
        currentData.works
          .filter((work) => removedSubWorkTypeIds.has(work.subWorkTypeId))
          .map((work) => work.workId),
      );
  
      return {
        ...currentData,
        workHierarchy: currentData.workHierarchy.filter((item) => {
          if (target.kind === "division-header") {
            return item.divisionId !== target.divisionId;
          }
  
          if (target.kind === "work-type-header") {
            return item.workTypeId !== target.workTypeId;
          }
  
          return item.subWorkTypeId !== target.subWorkTypeId;
        }),
        works: currentData.works.filter((work) => !removedSubWorkTypeIds.has(work.subWorkTypeId)),
        workDeps: currentData.workDeps.filter(
          (workDep) =>
            !removedWorkIds.has(workDep.sourceWorkId) && !removedWorkIds.has(workDep.targetWorkId),
        ),
      };
    });
    rebuildScheduleFromLoadedData();
  }
  
  
  return {
    updateLoadedScheduleData,
    mergeWorksIntoData,
    mergeWorkDepsIntoData,
    applyServerMutationPatch,
    removeLoadedWorksAndWorkDeps,
    removeLoadedWorkDeps,
    syncLoadedDataFromWorkingItemsAndConnections,
    syncLoadedWorkName,
    patchLoadedWorkActualDates,
    syncLoadedSubWorkTypeColor,
    upsertLoadedMilestone,
    syncLoadedMilestoneFromModel,
    removeLoadedMilestones,
    replaceWorkingMilestoneWithApiMilestone,
    rebuildScheduleFromLoadedData,
    insertReferenceHierarchyItem,
    insertReferenceSubWorkTypeItem,
    sortHierarchyByDivisionIds,
    sortHierarchyByWorkTypeIds,
    sortHierarchyBySubWorkTypeIds,
    addReferenceHierarchyItem,
    addReferenceSubWorkTypeItem,
    replaceReferenceHierarchyItem,
    replaceReferenceDivisionId,
    replaceReferenceWorkTypeId,
    replaceReferenceSubWorkTypeId,
    getHierarchyForDivision,
    getHierarchyForWorkType,
    updateReferenceNameLocally,
    removeReferenceLocally,
  };
}
