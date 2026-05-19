import type {
    DesktopScheduleBootstrapData,
    DesktopScheduleMilestoneResponse,
    DesktopScheduleReferenceHierarchyItem,
    DesktopScheduleWorkDepResponse,
    DesktopScheduleWorkResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import {
    makeChildRowId,
    makeReferenceDivisionRowId,
    makeReferenceWorkTypeRowId,
} from "@/features/desktop-schedule/services/domain/desktop-schedule-row-builder.service";
import type {
    DesktopScheduleHistoryCollectionPatch,
    DesktopScheduleHistoryDirection,
    DesktopScheduleHistoryEntityChange,
    DesktopScheduleHistoryIdMap,
    DesktopScheduleLoadedDataHistoryPatch,
    DesktopScheduleLocalHistoryEntry,
    DesktopScheduleLocalSnapshot,
} from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";

export function cloneWorkHierarchyItem(
item: DesktopScheduleReferenceHierarchyItem,
): DesktopScheduleReferenceHierarchyItem {
return { ...item };
}

export function getWorkHierarchyItemHistoryKey(item: DesktopScheduleReferenceHierarchyItem) {
if (item.subWorkTypeId !== 0) {
  return `sub-work-type:${item.subWorkTypeId}`;
}

if (item.workTypeId !== 0) {
  return `work-type:${item.workTypeId}`;
}

return `division:${item.divisionId}`;
}

export function cloneWorkResponse(work: DesktopScheduleWorkResponse): DesktopScheduleWorkResponse {
return {
  ...work,
  photos: work.photos?.map((photo) => ({ ...photo })),
};
}

export function cloneWorkDepResponse(workDep: DesktopScheduleWorkDepResponse): DesktopScheduleWorkDepResponse {
return { ...workDep };
}

export function cloneMilestoneResponse(
milestone: DesktopScheduleMilestoneResponse,
): DesktopScheduleMilestoneResponse {
return { ...milestone };
}

export function cloneScheduleData(data: DesktopScheduleBootstrapData): DesktopScheduleBootstrapData {
return {
  ...data,
  projects: data.projects.map((project) => ({ ...project })),
  selectedProject: { ...data.selectedProject },
  scheduleVersions: data.scheduleVersions.map((version) => ({ ...version })),
  selectedScheduleVersion: { ...data.selectedScheduleVersion },
  calendar: {
    ...data.calendar,
    dates: data.calendar.dates.map((date) => ({ ...date })),
  },
  workHierarchy: data.workHierarchy.map(cloneWorkHierarchyItem),
  works: data.works.map(cloneWorkResponse),
  workDeps: data.workDeps.map(cloneWorkDepResponse),
  milestones: (data.milestones ?? []).map(cloneMilestoneResponse),
};
}

export function cloneRow(row: DesktopScheduleRow): DesktopScheduleRow {
return {
  ...row,
  source: { ...row.source },
};
}

export function cloneRows(rows: DesktopScheduleRow[]) {
return rows.map(cloneRow);
}

export function cloneItem(item: DesktopScheduleItem): DesktopScheduleItem {
return {
  ...item,
  zoneIds: [...(item.zoneIds ?? [])],
  floorIds: [...(item.floorIds ?? [])],
  componentTypeIds: [...(item.componentTypeIds ?? [])],
};
}

export function cloneItems(items: DesktopScheduleItem[]) {
return items.map(cloneItem);
}

export function cloneWorkConnection(workConnection: DesktopScheduleWorkConnection): DesktopScheduleWorkConnection {
return { ...workConnection };
}

export function cloneWorkConnections(workConnections: DesktopScheduleWorkConnection[]) {
return workConnections.map(cloneWorkConnection);
}

export function cloneMilestone(milestone: DesktopScheduleMilestone): DesktopScheduleMilestone {
return { ...milestone };
}

export function cloneMilestones(milestones: DesktopScheduleMilestone[]) {
return milestones.map(cloneMilestone);
}


function areHistoryEntitiesEqual<TEntity>(before: TEntity | null, after: TEntity | null) {
  return JSON.stringify(before) === JSON.stringify(after);
}

function createHistoryCollectionPatch<TEntity, TKey extends string | number>(
  before: TEntity[],
  after: TEntity[],
  getKey: (entity: TEntity) => TKey,
  cloneEntity: (entity: TEntity) => TEntity,
): DesktopScheduleHistoryCollectionPatch<TEntity, TKey> {
  const beforeByKey = new Map(before.map((entity) => [getKey(entity), entity] as const));
  const afterByKey = new Map(after.map((entity) => [getKey(entity), entity] as const));
  const keys = [
    ...before.map(getKey),
    ...after.map(getKey).filter((key) => !beforeByKey.has(key)),
  ];

  return {
    beforeOrder: before.map(getKey),
    afterOrder: after.map(getKey),
    changes: keys
      .map((key) => {
        const beforeEntity = beforeByKey.get(key) ?? null;
        const afterEntity = afterByKey.get(key) ?? null;

        if (areHistoryEntitiesEqual(beforeEntity, afterEntity)) {
          return null;
        }

        return {
          key,
          before: beforeEntity ? cloneEntity(beforeEntity) : null,
          after: afterEntity ? cloneEntity(afterEntity) : null,
        };
      })
      .filter(
        (
          change,
        ): change is DesktopScheduleHistoryEntityChange<TEntity, TKey> => change !== null,
      ),
  };
}

function hasHistoryCollectionPatchChange<TEntity, TKey extends string | number>(
  patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
) {
  return (
    patch.changes.length > 0 ||
    JSON.stringify(patch.beforeOrder) !== JSON.stringify(patch.afterOrder)
  );
}

function countHistoryCollectionPatchChangeUnits<TEntity, TKey extends string | number>(
  patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
) {
  const orderChangeCount =
    JSON.stringify(patch.beforeOrder) !== JSON.stringify(patch.afterOrder) ? 1 : 0;

  return patch.changes.length + orderChangeCount;
}

export function createLocalHistoryAnalyticsMeta(entry: DesktopScheduleLocalHistoryEntry) {
  const loadedChangeCount = entry.loadedData
    ? countHistoryCollectionPatchChangeUnits(entry.loadedData.workHierarchy) +
      countHistoryCollectionPatchChangeUnits(entry.loadedData.works) +
      countHistoryCollectionPatchChangeUnits(entry.loadedData.workDeps) +
      countHistoryCollectionPatchChangeUnits(entry.loadedData.milestones)
    : 0;

  return {
    local_change_count:
      countHistoryCollectionPatchChangeUnits(entry.rows) +
      countHistoryCollectionPatchChangeUnits(entry.items) +
      countHistoryCollectionPatchChangeUnits(entry.workConnections) +
      countHistoryCollectionPatchChangeUnits(entry.milestones),
    loaded_change_count: loadedChangeCount,
    has_loaded_data_change: entry.loadedData !== null,
  };
}

function createLoadedDataHistoryPatch(
  beforeData: DesktopScheduleBootstrapData | null,
  afterData: DesktopScheduleBootstrapData | null,
): DesktopScheduleLoadedDataHistoryPatch | null {
  if (!beforeData || !afterData) {
    return null;
  }

  const patch: DesktopScheduleLoadedDataHistoryPatch = {
    workHierarchy: createHistoryCollectionPatch(
      beforeData.workHierarchy,
      afterData.workHierarchy,
      getWorkHierarchyItemHistoryKey,
      cloneWorkHierarchyItem,
    ),
    works: createHistoryCollectionPatch(
      beforeData.works,
      afterData.works,
      (work) => work.workId,
      cloneWorkResponse,
    ),
    workDeps: createHistoryCollectionPatch(
      beforeData.workDeps,
      afterData.workDeps,
      (workDep) => workDep.id,
      cloneWorkDepResponse,
    ),
    milestones: createHistoryCollectionPatch(
      beforeData.milestones ?? [],
      afterData.milestones ?? [],
      (milestone) => milestone.id,
      cloneMilestoneResponse,
    ),
  };

  return hasHistoryCollectionPatchChange(patch.workHierarchy) ||
    hasHistoryCollectionPatchChange(patch.works) ||
    hasHistoryCollectionPatchChange(patch.workDeps) ||
    hasHistoryCollectionPatchChange(patch.milestones)
    ? patch
    : null;
}

export function createLocalHistoryEntry(
  previousSnapshot: DesktopScheduleLocalSnapshot,
  nextSnapshot: DesktopScheduleLocalSnapshot,
): DesktopScheduleLocalHistoryEntry | null {
  const entry: DesktopScheduleLocalHistoryEntry = {
    rows: createHistoryCollectionPatch(
      previousSnapshot.rows,
      nextSnapshot.rows,
      (row) => row.id,
      cloneRow,
    ),
    items: createHistoryCollectionPatch(
      previousSnapshot.items,
      nextSnapshot.items,
      (item) => item.id,
      cloneItem,
    ),
    workConnections: createHistoryCollectionPatch(
      previousSnapshot.workConnections,
      nextSnapshot.workConnections,
      (workConnection) => workConnection.id,
      cloneWorkConnection,
    ),
    milestones: createHistoryCollectionPatch(
      previousSnapshot.milestones,
      nextSnapshot.milestones,
      (milestone) => milestone.id,
      cloneMilestone,
    ),
    loadedData: createLoadedDataHistoryPatch(previousSnapshot.loadedData, nextSnapshot.loadedData),
  };
  const didChange =
    hasHistoryCollectionPatchChange(entry.rows) ||
    hasHistoryCollectionPatchChange(entry.items) ||
    hasHistoryCollectionPatchChange(entry.workConnections) ||
    hasHistoryCollectionPatchChange(entry.milestones) ||
    entry.loadedData !== null;

  return didChange ? entry : null;
}

export function applyHistoryCollectionPatch<TEntity, TKey extends string | number>(
  current: TEntity[],
  patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
  direction: "undo" | "redo",
  getKey: (entity: TEntity) => TKey,
  cloneEntity: (entity: TEntity) => TEntity,
) {
  const entityByKey = new Map(current.map((entity) => [getKey(entity), cloneEntity(entity)] as const));

  patch.changes.forEach((change) => {
    const nextEntity = direction === "undo" ? change.before : change.after;

    if (!nextEntity) {
      entityByKey.delete(change.key);
      return;
    }

    entityByKey.set(change.key, cloneEntity(nextEntity));
  });

  const targetOrder = direction === "undo" ? patch.beforeOrder : patch.afterOrder;
  const orderedEntities: TEntity[] = [];
  const usedKeys = new Set<TKey>();

  targetOrder.forEach((key) => {
    const entity = entityByKey.get(key);

    if (!entity) {
      return;
    }

    orderedEntities.push(entity);
    usedKeys.add(key);
  });

  current.forEach((entity) => {
    const key = getKey(entity);
    const nextEntity = entityByKey.get(key);

    if (usedKeys.has(key) || !nextEntity) {
      return;
    }

    orderedEntities.push(nextEntity);
    usedKeys.add(key);
  });

  return orderedEntities;
}

export function applyLoadedDataHistoryPatch(
  currentData: DesktopScheduleBootstrapData | null,
  patch: DesktopScheduleLoadedDataHistoryPatch | null,
  direction: "undo" | "redo",
) {
  if (!currentData || !patch) {
    return currentData;
  }

  return {
    ...currentData,
    workHierarchy: applyHistoryCollectionPatch(
      currentData.workHierarchy,
      patch.workHierarchy,
      direction,
      getWorkHierarchyItemHistoryKey,
      cloneWorkHierarchyItem,
    ),
    works: applyHistoryCollectionPatch(
      currentData.works,
      patch.works,
      direction,
      (work) => work.workId,
      cloneWorkResponse,
    ),
    workDeps: applyHistoryCollectionPatch(
      currentData.workDeps,
      patch.workDeps,
      direction,
      (workDep) => workDep.id,
      cloneWorkDepResponse,
    ),
    milestones: applyHistoryCollectionPatch(
      currentData.milestones ?? [],
      patch.milestones,
      direction,
      (milestone) => milestone.id,
      cloneMilestoneResponse,
    ),
  };
}


export function getHistoryChangeTarget<TEntity, TKey extends string | number>(
  change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
  direction: DesktopScheduleHistoryDirection,
) {
  return direction === "undo" ? change.before : change.after;
}

export function getHistoryChangeSource<TEntity, TKey extends string | number>(
  change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
  direction: DesktopScheduleHistoryDirection,
) {
  return direction === "undo" ? change.after : change.before;
}

function remapIdValue(value: number, idMap: Map<number, number>) {
  return idMap.get(value) ?? value;
}

function remapOptionalIdValue(value: number | undefined, idMap: Map<number, number>) {
  return typeof value === "number" ? remapIdValue(value, idMap) : value;
}

function remapStringId(value: string, prefix: string, idMap: Map<number, number>) {
  const rawId = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  const numericId = Number(rawId);

  if (!Number.isFinite(numericId)) {
    return value;
  }

  const nextId = idMap.get(numericId);
  return nextId === undefined ? value : `${prefix}${nextId}`;
}

export function remapItemId(value: string, idMap: Map<number, number>) {
  return remapStringId(value, "item:", idMap);
}

export function remapWorkConnectionId(value: string, idMap: Map<number, number>) {
  return remapStringId(value, "work-connection:", idMap);
}

export function remapMilestoneModelId(value: string, idMap: Map<number, number>) {
  return remapStringId(value, "milestone:", idMap);
}

export function remapWorkHierarchyItemHistoryKey(
  value: string,
  idMap: DesktopScheduleHistoryIdMap,
) {
  const remappedSubWorkTypeKey = remapStringId(
    value,
    "sub-work-type:",
    idMap.subWorkTypeIds,
  );

  if (remappedSubWorkTypeKey !== value) {
    return remappedSubWorkTypeKey;
  }

  const remappedWorkTypeKey = remapStringId(value, "work-type:", idMap.workTypeIds);

  if (remappedWorkTypeKey !== value) {
    return remappedWorkTypeKey;
  }

  return remapStringId(value, "division:", idMap.divisionIds);
}

export function remapHistoryRowId(value: string, idMap: DesktopScheduleHistoryIdMap) {
  const remappedDivisionRowId = remapStringId(
    value,
    "reference-division:",
    idMap.divisionIds,
  );

  if (remappedDivisionRowId !== value) {
    return remappedDivisionRowId;
  }

  const remappedWorkTypeRowId = remapStringId(
    value,
    "reference-work-type:",
    idMap.workTypeIds,
  );

  if (remappedWorkTypeRowId !== value) {
    return remappedWorkTypeRowId;
  }

  const parts = value.split(":");
  const maybeNumericSubWorkTypeId = Number(parts[parts.length - 1]);

  if (
    (value.startsWith("child:") || value.startsWith("reference-child:")) &&
    Number.isFinite(maybeNumericSubWorkTypeId)
  ) {
    const nextSubWorkTypeId = idMap.subWorkTypeIds.get(maybeNumericSubWorkTypeId);

    if (nextSubWorkTypeId !== undefined) {
      return [...parts.slice(0, -1), String(nextSubWorkTypeId)].join(":");
    }
  }

  return value;
}

function remapHistoryEntityChange<TEntity, TKey extends string | number>(
  change: DesktopScheduleHistoryEntityChange<TEntity, TKey>,
  mapEntity: (entity: TEntity) => TEntity,
  mapKey: (key: TKey) => TKey,
): DesktopScheduleHistoryEntityChange<TEntity, TKey> {
  return {
    key: mapKey(change.key),
    before: change.before ? mapEntity(change.before) : null,
    after: change.after ? mapEntity(change.after) : null,
  };
}

function remapHistoryCollectionPatch<TEntity, TKey extends string | number>(
  patch: DesktopScheduleHistoryCollectionPatch<TEntity, TKey>,
  mapEntity: (entity: TEntity) => TEntity,
  mapKey: (key: TKey) => TKey,
): DesktopScheduleHistoryCollectionPatch<TEntity, TKey> {
  return {
    changes: patch.changes.map((change) => remapHistoryEntityChange(change, mapEntity, mapKey)),
    beforeOrder: patch.beforeOrder.map(mapKey),
    afterOrder: patch.afterOrder.map(mapKey),
  };
}

export function remapHistoryWorkHierarchyItem(
  item: DesktopScheduleReferenceHierarchyItem,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleReferenceHierarchyItem {
  return {
    ...item,
    divisionId: remapIdValue(item.divisionId, idMap.divisionIds),
    workTypeId: remapIdValue(item.workTypeId, idMap.workTypeIds),
    subWorkTypeId: remapIdValue(item.subWorkTypeId, idMap.subWorkTypeIds),
  };
}

export function remapHistoryWorkResponse(
  work: DesktopScheduleWorkResponse,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleWorkResponse {
  return {
    ...work,
    workId: remapIdValue(work.workId, idMap.workIds),
    subWorkTypeId: remapIdValue(work.subWorkTypeId, idMap.subWorkTypeIds),
  };
}

export function remapHistoryRow(
  row: DesktopScheduleRow,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleRow {
  const source = row.source;
  const parentId = row.parentId ? remapHistoryRowId(row.parentId, idMap) : row.parentId;

  if (source.kind === "division") {
    const divisionId = remapOptionalIdValue(source.divisionId, idMap.divisionIds);
    const id =
      divisionId !== source.divisionId
        ? makeReferenceDivisionRowId(divisionId, source.division ?? row.name)
        : remapHistoryRowId(row.id, idMap);

    return {
      ...row,
      id,
      parentId,
      source: {
        ...source,
        divisionId,
      },
    };
  }

  if (source.kind === "work-type") {
    const divisionId = remapOptionalIdValue(source.divisionId, idMap.divisionIds);
    const workTypeId = remapOptionalIdValue(source.workTypeId, idMap.workTypeIds);
    const id =
      workTypeId !== source.workTypeId
        ? makeReferenceWorkTypeRowId(
            workTypeId,
            source.division ?? "",
            source.workType ?? row.name,
          )
        : remapHistoryRowId(row.id, idMap);

    return {
      ...row,
      id,
      parentId,
      source: {
        ...source,
        divisionId,
        workTypeId,
      },
    };
  }

  if (source.kind === "sub-work-type") {
    const divisionId = remapOptionalIdValue(source.divisionId, idMap.divisionIds);
    const workTypeId = remapOptionalIdValue(source.workTypeId, idMap.workTypeIds);
    const subWorkTypeId = remapOptionalIdValue(source.subWorkTypeId, idMap.subWorkTypeIds);
    const id =
      typeof subWorkTypeId === "number" && subWorkTypeId !== source.subWorkTypeId
        ? makeChildRowId(
            source.division ?? "",
            source.workType ?? "",
            subWorkTypeId,
            source.subWorkType ?? row.name,
          )
        : remapHistoryRowId(row.id, idMap);

    return {
      ...row,
      id,
      parentId,
      source: {
        ...source,
        divisionId,
        workTypeId,
        subWorkTypeId,
      },
    };
  }

  return {
    ...row,
    id: remapHistoryRowId(row.id, idMap),
    parentId,
    source: { ...source },
  };
}

export function remapHistoryWorkDepResponse(
  workDep: DesktopScheduleWorkDepResponse,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleWorkDepResponse {
  return {
    ...workDep,
    id: remapIdValue(workDep.id, idMap.workDepIds),
    sourceWorkId: remapIdValue(workDep.sourceWorkId, idMap.workIds),
    targetWorkId: remapIdValue(workDep.targetWorkId, idMap.workIds),
  };
}

export function remapHistoryMilestoneResponse(
  milestone: DesktopScheduleMilestoneResponse,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleMilestoneResponse {
  return {
    ...milestone,
    id: remapIdValue(milestone.id, idMap.milestoneIds),
  };
}

export function remapHistoryItem(
  item: DesktopScheduleItem,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleItem {
  return {
    ...item,
    id: remapItemId(item.id, idMap.workIds),
    workId: remapIdValue(item.workId, idMap.workIds),
    rowId: remapHistoryRowId(item.rowId, idMap),
  };
}

export function remapHistoryWorkConnection(
  workConnection: DesktopScheduleWorkConnection,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleWorkConnection {
  return {
    ...workConnection,
    id: remapWorkConnectionId(workConnection.id, idMap.workDepIds),
    pathId: remapIdValue(workConnection.pathId, idMap.workDepIds),
    sourceItemId: remapItemId(workConnection.sourceItemId, idMap.workIds),
    targetItemId: remapItemId(workConnection.targetItemId, idMap.workIds),
  };
}

export function remapHistoryMilestone(
  milestone: DesktopScheduleMilestone,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleMilestone {
  const apiId =
    typeof milestone.apiId === "number"
      ? remapIdValue(milestone.apiId, idMap.milestoneIds)
      : milestone.apiId;

  return {
    ...milestone,
    id: remapMilestoneModelId(milestone.id, idMap.milestoneIds),
    apiId,
  };
}

function remapLoadedDataHistoryPatch(
  patch: DesktopScheduleLoadedDataHistoryPatch | null,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleLoadedDataHistoryPatch | null {
  if (!patch) {
    return null;
  }

  return {
    ...patch,
    workHierarchy: remapHistoryCollectionPatch(
      patch.workHierarchy,
      (item) => remapHistoryWorkHierarchyItem(item, idMap),
      (itemKey) => remapWorkHierarchyItemHistoryKey(itemKey, idMap),
    ),
    works: remapHistoryCollectionPatch(
      patch.works,
      (work) => remapHistoryWorkResponse(work, idMap),
      (workId) => remapIdValue(workId, idMap.workIds),
    ),
    workDeps: remapHistoryCollectionPatch(
      patch.workDeps,
      (workDep) => remapHistoryWorkDepResponse(workDep, idMap),
      (workDepId) => remapIdValue(workDepId, idMap.workDepIds),
    ),
    milestones: remapHistoryCollectionPatch(
      patch.milestones,
      (milestone) => remapHistoryMilestoneResponse(milestone, idMap),
      (milestoneId) => remapIdValue(milestoneId, idMap.milestoneIds),
    ),
  };
}

export function remapLocalHistoryEntry(
  entry: DesktopScheduleLocalHistoryEntry,
  idMap: DesktopScheduleHistoryIdMap,
): DesktopScheduleLocalHistoryEntry {
  return {
    ...entry,
    rows: remapHistoryCollectionPatch(
      entry.rows,
      (row) => remapHistoryRow(row, idMap),
      (rowId) => remapHistoryRowId(rowId, idMap),
    ),
    items: remapHistoryCollectionPatch(
      entry.items,
      (item) => remapHistoryItem(item, idMap),
      (itemId) => remapItemId(itemId, idMap.workIds),
    ),
    workConnections: remapHistoryCollectionPatch(
      entry.workConnections,
      (workConnection) => remapHistoryWorkConnection(workConnection, idMap),
      (workConnectionId) => remapWorkConnectionId(workConnectionId, idMap.workDepIds),
    ),
    milestones: remapHistoryCollectionPatch(
      entry.milestones,
      (milestone) => remapHistoryMilestone(milestone, idMap),
      (milestoneId) => remapMilestoneModelId(milestoneId, idMap.milestoneIds),
    ),
    loadedData: remapLoadedDataHistoryPatch(entry.loadedData, idMap),
  };
}
