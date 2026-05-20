import type {
    DesktopScheduleMutationResponse,
    DesktopScheduleWorkUpdateItem,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import { desktopScheduleApi } from "@/features/desktop-schedule/api/desktop-schedule.api";
import type {
    DesktopScheduleItem,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { hasDateOrLayoutChange, hasWorkConnectionGapChange } from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";

export function useDesktopScheduleWorkPersistence(deps: Record<string, any>) {
  const {
    workingItems,
    rowById,
    getSelectedScheduleVersionId,
    getWorkConnectionById,
    getPersistedWorkIdForItem,
    waitForPendingItemCreations,
    applyServerMutationPatch,
    resolvedWorkIdByPendingItemId,
  } = deps;

  function isMissingWorkError(error: unknown) {
    return error instanceof Error && /work\s+not\s+found/i.test(error.message);
  }

  function getMissingWorkIdFromError(error: unknown) {
    if (!(error instanceof Error)) {
      return null;
    }

    const match = error.message.match(/work\s+not\s+found\s*:?\s*(\d+)/i);
    if (!match?.[1]) {
      return null;
    }

    const workId = Number(match[1]);
    return Number.isFinite(workId) ? workId : null;
  }

  async function recreateMissingWorkFromFrontend(item: DesktopScheduleItem) {
    const scheduleVersionId = getSelectedScheduleVersionId();
    const targetRow = rowById.value.get(item.rowId);
    const subWorkTypeId = targetRow?.source.subWorkTypeId;

    if (
      !scheduleVersionId ||
      !targetRow ||
      targetRow.kind !== "child-process" ||
      targetRow.source.kind !== "sub-work-type" ||
      typeof subWorkTypeId !== "number" ||
      subWorkTypeId <= 0
    ) {
      throw new Error("누락된 작업을 동기화할 공정표 버전 또는 세부공종 정보가 없습니다.");
    }

    const response = await desktopScheduleApi.createWork({
      startDate: item.startDate,
      workLeadTime: item.durationDays,
      subWorkTypeId,
      scheduleVersionId,
    });
    const createdWork = response.updatedWorks?.[0];

    if (!createdWork) {
      throw new Error("동기화할 작업 ID를 확인하지 못했습니다.");
    }

    resolvedWorkIdByPendingItemId.set(item.id, createdWork.workId);
    workingItems.value = workingItems.value.map((currentItem: DesktopScheduleItem) =>
      currentItem.id === item.id
        ? {
            ...currentItem,
            workId: createdWork.workId,
          }
        : currentItem,
    );
    applyServerMutationPatch(response);

    return createdWork.workId;
  }

  async function updateWorkWithFrontendRecovery(
    updateItems: DesktopScheduleWorkUpdateItem[],
    sourceItems: DesktopScheduleItem[],
  ) {
    let nextUpdateItems = updateItems.map((item) => ({ ...item }));
    const recoveredWorkIds = new Set<number>();
    const maxAttempts = Math.max(nextUpdateItems.length, 1);

    for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await desktopScheduleApi.updateWork({ items: nextUpdateItems });
        applyServerMutationPatch(response);
        return response;
      } catch (error) {
        const missingWorkId =
          getMissingWorkIdFromError(error) ??
          (isMissingWorkError(error) && nextUpdateItems.length === 1
            ? nextUpdateItems[0]!.workId
            : null);

        if (missingWorkId === null || recoveredWorkIds.has(missingWorkId)) {
          throw error;
        }

        const sourceItem = sourceItems.find(
          (item) =>
            item.workId === missingWorkId ||
            getPersistedWorkIdForItem(item) === missingWorkId,
        );

        if (!sourceItem) {
          throw error;
        }

        recoveredWorkIds.add(missingWorkId);
        const recoveredWorkId = await recreateMissingWorkFromFrontend(sourceItem);
        nextUpdateItems = nextUpdateItems.map((item) =>
          item.workId === missingWorkId
            ? {
                ...item,
                workId: recoveredWorkId,
                workName: sourceItem.name,
              }
            : item,
        );
      }
    }

    throw new Error("누락된 작업을 동기화하지 못했습니다.");
  }

  function createWorkUpdateRequest(
    baseItem: DesktopScheduleItem,
    nextItem: DesktopScheduleItem,
    options: { omitStartDate?: boolean } = {},
  ): DesktopScheduleWorkUpdateItem {
    const request: DesktopScheduleWorkUpdateItem = {
      workId: getPersistedWorkIdForItem(nextItem),
    };
  
    if (!options.omitStartDate && baseItem.startDate !== nextItem.startDate) {
      request.startDate = nextItem.startDate;
    }
  
    if (baseItem.durationDays !== nextItem.durationDays) {
      request.workLeadTime = nextItem.durationDays;
    }

    if (baseItem.rowId !== nextItem.rowId) {
      const targetRow = rowById.value.get(nextItem.rowId);
      const subWorkTypeId = targetRow?.source.subWorkTypeId;

      if (
        targetRow?.kind === "child-process" &&
        targetRow.source.kind === "sub-work-type" &&
        typeof subWorkTypeId === "number" &&
        subWorkTypeId > 0
      ) {
        request.subWorkTypeId = subWorkTypeId;
      }
    }
  
    return request;
  }
  
  function orderWorkUpdateItemsByDependency(
    updateItems: DesktopScheduleWorkUpdateItem[],
    nextItems: DesktopScheduleItem[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    if (updateItems.length <= 1 || workConnections.length === 0) {
      return updateItems;
    }
  
    const itemById = new Map(nextItems.map((item) => [item.id, item] as const));
    const updateItemByWorkId = new Map(updateItems.map((item) => [item.workId, item] as const));
    const originalIndexByWorkId = new Map(
      updateItems.map((item, index) => [item.workId, index] as const),
    );
    const outgoingWorkIdsByWorkId = new Map<number, Set<number>>();
    const incomingCountByWorkId = new Map<number, number>(
      updateItems.map((item) => [item.workId, 0] as const),
    );
  
    workConnections.forEach((workConnection) => {
      const sourceItem = itemById.get(workConnection.sourceItemId);
      const targetItem = itemById.get(workConnection.targetItemId);
  
      if (
        !sourceItem ||
        !targetItem ||
        !updateItemByWorkId.has(sourceItem.workId) ||
        !updateItemByWorkId.has(targetItem.workId) ||
        sourceItem.workId === targetItem.workId
      ) {
        return;
      }
  
      const outgoingWorkIds = outgoingWorkIdsByWorkId.get(sourceItem.workId) ?? new Set<number>();
  
      if (outgoingWorkIds.has(targetItem.workId)) {
        return;
      }
  
      outgoingWorkIds.add(targetItem.workId);
      outgoingWorkIdsByWorkId.set(sourceItem.workId, outgoingWorkIds);
      incomingCountByWorkId.set(targetItem.workId, (incomingCountByWorkId.get(targetItem.workId) ?? 0) + 1);
    });
  
    const orderedWorkIds: number[] = [];
    let availableWorkIds = updateItems
      .map((item) => item.workId)
      .filter((workId) => (incomingCountByWorkId.get(workId) ?? 0) === 0);
  
    while (availableWorkIds.length > 0) {
      availableWorkIds = availableWorkIds.sort(
        (a, b) => (originalIndexByWorkId.get(a) ?? 0) - (originalIndexByWorkId.get(b) ?? 0),
      );
  
      const workId = availableWorkIds.shift();
  
      if (workId === undefined) {
        continue;
      }
  
      orderedWorkIds.push(workId);
  
      (outgoingWorkIdsByWorkId.get(workId) ?? new Set<number>()).forEach((targetWorkId) => {
        const nextIncomingCount = (incomingCountByWorkId.get(targetWorkId) ?? 0) - 1;
        incomingCountByWorkId.set(targetWorkId, nextIncomingCount);
  
        if (nextIncomingCount === 0) {
          availableWorkIds.push(targetWorkId);
        }
      });
    }
  
    updateItems
      .map((item) => item.workId)
      .filter((workId) => !orderedWorkIds.includes(workId))
      .forEach((workId) => {
        orderedWorkIds.push(workId);
      });
  
    return orderedWorkIds
      .map((workId) => updateItemByWorkId.get(workId))
      .filter((item): item is DesktopScheduleWorkUpdateItem => !!item);
  }
  
  async function persistWorkConnectionGapChanges(
    baseWorkConnections: DesktopScheduleWorkConnection[],
    nextWorkConnections: DesktopScheduleWorkConnection[],
  ) {
    const nextWorkConnectionById = new Map(
      nextWorkConnections.map((workConnection) => [workConnection.id, workConnection] as const),
    );
    const changedWorkConnections = baseWorkConnections
      .map((baseWorkConnection) => {
        const nextWorkConnection = nextWorkConnectionById.get(baseWorkConnection.id);
        return nextWorkConnection &&
          hasWorkConnectionGapChange(baseWorkConnection, nextWorkConnection)
          ? nextWorkConnection
          : null;
      })
      .filter((workConnection): workConnection is DesktopScheduleWorkConnection => !!workConnection);
  
    const responses: DesktopScheduleMutationResponse[] = [];
  
    for (const workConnection of changedWorkConnections) {
      responses.push(
        await desktopScheduleApi.updateWorkDep(workConnection.pathId, {
          lagDays: workConnection.gapDays,
        }),
      );
    }
  
    responses.forEach((response) => applyServerMutationPatch(response));
  
    return changedWorkConnections;
  }
  
  async function persistItemDateAndLayoutChanges(
    baseItems: DesktopScheduleItem[],
    nextItems: DesktopScheduleItem[],
    itemIds: string[],
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    await waitForPendingItemCreations(itemIds);
  
    const nextItemById = new Map(nextItems.map((item) => [item.id, item] as const));
    const updateItems: DesktopScheduleWorkUpdateItem[] = [];
  
    baseItems
      .filter((baseItem) => itemIds.includes(baseItem.id))
      .forEach((baseItem) => {
        const nextItem = nextItemById.get(baseItem.id);
  
        if (!nextItem || !hasDateOrLayoutChange(baseItem, nextItem)) {
          return;
        }
  
        const request = createWorkUpdateRequest(baseItem, nextItem);
  
        if (Object.keys(request).length <= 1) {
          return;
        }
  
        updateItems.push(request);
      });
  
    if (updateItems.length === 0) {
      return null;
    }
  
    const response = await updateWorkWithFrontendRecovery(
      orderWorkUpdateItemsByDependency(updateItems, nextItems, workConnections),
      nextItems,
    );
    return response;
  }
  
  
  return {
    createWorkUpdateRequest,
    orderWorkUpdateItemsByDependency,
    updateWorkWithFrontendRecovery,
    persistWorkConnectionGapChanges,
    persistItemDateAndLayoutChanges,
  };
}
