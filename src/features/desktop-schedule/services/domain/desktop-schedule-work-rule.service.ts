import type {
  DesktopScheduleItem,
  DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { diffDays, shiftDateString } from "@/features/desktop-schedule/services/desktop-schedule-date.service";

export function shiftItemByDays(item: DesktopScheduleItem, deltaDays: number): DesktopScheduleItem {
  if (deltaDays === 0) {
    return item;
  }

  return {
    ...item,
    startDate: shiftDateString(item.startDate, deltaDays),
    endDate: shiftDateString(item.endDate, deltaDays),
  };
}

export function getSuccessorStartDateFromPredecessor(endDate: string, gapDays: number) {
  return shiftDateString(endDate, gapDays + 1);
}

export function getWorkConnectionSuccessorStartDate(
  sourceItem: DesktopScheduleItem,
  gapDays: number,
) {
  const preferredStartDate = getSuccessorStartDateFromPredecessor(sourceItem.endDate, gapDays);
  return preferredStartDate < sourceItem.startDate ? sourceItem.startDate : preferredStartDate;
}

export function getCurrentGapDays(sourceItem: DesktopScheduleItem, targetItem: DesktopScheduleItem) {
  return diffDays(sourceItem.endDate, targetItem.startDate) - 1;
}

export function getGapDaysBetweenItems(sourceItem: DesktopScheduleItem, targetItem: DesktopScheduleItem) {
  return getCurrentGapDays(sourceItem, targetItem);
}

export function serializeItemsInBaseOrder(
  baseItems: DesktopScheduleItem[],
  itemsById: Map<string, DesktopScheduleItem>,
) {
  return baseItems.map((item) => itemsById.get(item.id) ?? item);
}

export function buildRelationMaps<
  TRelation extends { sourceItemId: string; targetItemId: string },
>(relations: TRelation[]) {
  const outgoingByItemId = new Map<string, TRelation[]>();
  const incomingByItemId = new Map<string, TRelation[]>();

  relations.forEach((relation) => {
    outgoingByItemId.set(relation.sourceItemId, [
      ...(outgoingByItemId.get(relation.sourceItemId) ?? []),
      relation,
    ]);
    incomingByItemId.set(relation.targetItemId, [
      ...(incomingByItemId.get(relation.targetItemId) ?? []),
      relation,
    ]);
  });

  return {
    outgoingByItemId,
    incomingByItemId,
  };
}

export function applyWorkConnectionRules(
  baseItems: DesktopScheduleItem[],
  itemsById: Map<string, DesktopScheduleItem>,
  controlledSourceItemIds: string[],
  workConnections: DesktopScheduleWorkConnection[],
) {
  const connectionMaps = buildRelationMaps(workConnections);
  const nextWorkConnectionById = new Map<string, DesktopScheduleWorkConnection>(
    workConnections.map((workConnection) => [workConnection.id, { ...workConnection }]),
  );
  const preservedConnectionIds = new Set<string>();
  const queue = Array.from(new Set(controlledSourceItemIds));
  const queuedItemIds = new Set(queue);
  const maxIterations = Math.max(baseItems.length * Math.max(workConnections.length, 1) * 4, 32);
  let iterationCount = 0;
  let blockedByPredecessorStart = false;

  function enqueue(itemId: string) {
    if (queuedItemIds.has(itemId)) {
      return;
    }

    queue.push(itemId);
    queuedItemIds.add(itemId);
  }

  function setItemStart(item: DesktopScheduleItem, nextStartDate: string) {
    const deltaDays = diffDays(item.startDate, nextStartDate);

    if (deltaDays === 0) {
      return item;
    }

    return shiftItemByDays(item, deltaDays);
  }

  function processOutgoingQueue() {
    while (queue.length > 0 && iterationCount < maxIterations) {
      iterationCount += 1;
      const currentItemId = queue.shift();

      if (!currentItemId) {
        continue;
      }

      queuedItemIds.delete(currentItemId);
      const sourceItem = itemsById.get(currentItemId);

      if (!sourceItem) {
        continue;
      }

      (connectionMaps.outgoingByItemId.get(currentItemId) ?? []).forEach((workConnection) => {
        const targetItem = itemsById.get(workConnection.targetItemId);
        const nextWorkConnection = nextWorkConnectionById.get(workConnection.id);

        if (!targetItem || !nextWorkConnection) {
          return;
        }

        const requiredStartDate = getWorkConnectionSuccessorStartDate(
          sourceItem,
          nextWorkConnection.gapDays,
        );
        const nextTargetItem = setItemStart(targetItem, requiredStartDate);

        if (nextTargetItem !== targetItem) {
          itemsById.set(nextTargetItem.id, nextTargetItem);
          enqueue(nextTargetItem.id);
        }

        const actualTargetItem = itemsById.get(workConnection.targetItemId);

        if (actualTargetItem) {
          nextWorkConnection.gapDays = getCurrentGapDays(sourceItem, actualTargetItem);
        }

        preservedConnectionIds.add(workConnection.id);
      });
    }
  }

  processOutgoingQueue();

  let didClampSuccessor = true;

  while (didClampSuccessor && iterationCount < maxIterations) {
    didClampSuccessor = false;

    workConnections.forEach((workConnection) => {
      if (preservedConnectionIds.has(workConnection.id)) {
        return;
      }

      const sourceItem = itemsById.get(workConnection.sourceItemId);
      const targetItem = itemsById.get(workConnection.targetItemId);

      if (!sourceItem || !targetItem || targetItem.startDate >= sourceItem.startDate) {
        return;
      }

      const nextTargetItem = setItemStart(targetItem, sourceItem.startDate);
      itemsById.set(nextTargetItem.id, nextTargetItem);
      blockedByPredecessorStart = true;
      didClampSuccessor = true;
      enqueue(nextTargetItem.id);
    });

    processOutgoingQueue();
  }

  workConnections.forEach((workConnection) => {
    if (preservedConnectionIds.has(workConnection.id)) {
      return;
    }

    const sourceItem = itemsById.get(workConnection.sourceItemId);
    const targetItem = itemsById.get(workConnection.targetItemId);
    const nextWorkConnection = nextWorkConnectionById.get(workConnection.id);

    if (!sourceItem || !targetItem || !nextWorkConnection) {
      return;
    }

    nextWorkConnection.gapDays = getCurrentGapDays(sourceItem, targetItem);
  });

  return {
    items: serializeItemsInBaseOrder(baseItems, itemsById),
    workConnections: workConnections.map(
      (workConnection) => nextWorkConnectionById.get(workConnection.id) ?? workConnection,
    ),
    blockedByPredecessorStart,
  };
}

export function getChangedItemIds(
  baseItems: DesktopScheduleItem[],
  nextItems: DesktopScheduleItem[],
) {
  const baseItemById = new Map(baseItems.map((item) => [item.id, item] as const));

  return nextItems
    .filter((item) => {
      const baseItem = baseItemById.get(item.id);
      return (
        !!baseItem &&
        (baseItem.startDate !== item.startDate ||
          baseItem.endDate !== item.endDate ||
          baseItem.durationDays !== item.durationDays)
      );
    })
    .map((item) => item.id);
}

export function moveItems(
  baseItems: DesktopScheduleItem[],
  itemIds: string[],
  deltaDays: number,
) {
  if (itemIds.length === 0) {
    return baseItems;
  }

  const itemIdSet = new Set(itemIds);
  return baseItems.map((item) => (itemIdSet.has(item.id) ? shiftItemByDays(item, deltaDays) : item));
}

export function moveItemsWithWorkConnections(
  baseItems: DesktopScheduleItem[],
  itemIds: string[],
  deltaDays: number,
  workConnections: DesktopScheduleWorkConnection[] = [],
) {
  const itemsAfterLinkedMove = moveItems(baseItems, itemIds, deltaDays);
  const changedItemIds = getChangedItemIds(baseItems, itemsAfterLinkedMove);

  if (workConnections.length === 0 || changedItemIds.length === 0) {
    return {
      items: itemsAfterLinkedMove,
      workConnections,
      blockedByPredecessorStart: false,
    };
  }

  return applyWorkConnectionRules(
    baseItems,
    new Map(itemsAfterLinkedMove.map((item) => [item.id, item] as const)),
    changedItemIds,
    workConnections,
  );
}

export function resizeItem(
  baseItems: DesktopScheduleItem[],
  itemId: string,
  edge: "left" | "right",
  deltaDays: number,
) {
  const itemsById = new Map(baseItems.map((item) => [item.id, item] as const));
  const targetItem = itemsById.get(itemId);

  if (!targetItem) {
    return baseItems;
  }

  if (edge === "left") {
    const clampedDelta = Math.min(deltaDays, targetItem.durationDays - 1);
    itemsById.set(itemId, {
      ...targetItem,
      startDate: shiftDateString(targetItem.startDate, clampedDelta),
      durationDays: targetItem.durationDays - clampedDelta,
    });
  } else {
    const nextDurationDays = Math.max(targetItem.durationDays + deltaDays, 1);
    const endDateDelta = nextDurationDays - targetItem.durationDays;
    itemsById.set(itemId, {
      ...targetItem,
      durationDays: nextDurationDays,
      endDate: shiftDateString(targetItem.endDate, endDateDelta),
    });
  }

  return serializeItemsInBaseOrder(baseItems, itemsById);
}

export function resizeItemWithWorkConnections(
  baseItems: DesktopScheduleItem[],
  itemId: string,
  edge: "left" | "right",
  deltaDays: number,
  workConnections: DesktopScheduleWorkConnection[] = [],
) {
  const itemsAfterResize = resizeItem(baseItems, itemId, edge, deltaDays);
  const changedItemIds = getChangedItemIds(baseItems, itemsAfterResize);

  if (workConnections.length === 0 || changedItemIds.length === 0) {
    return {
      items: itemsAfterResize,
      workConnections,
      blockedByPredecessorStart: false,
    };
  }

  return applyWorkConnectionRules(
    baseItems,
    new Map(itemsAfterResize.map((item) => [item.id, item] as const)),
    changedItemIds,
    workConnections,
  );
}
