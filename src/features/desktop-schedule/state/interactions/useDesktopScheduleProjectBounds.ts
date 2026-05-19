
import type {
    DesktopScheduleItem,
    DesktopScheduleWorkConnection
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import {
    hasDateOrLayoutChange
} from "@/features/desktop-schedule/services/domain/desktop-schedule-version-review.service";
import type { ProjectScheduleDateRange } from "@/features/desktop-schedule/state/core/desktop-schedule-view-model-core";
import { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";


export function useDesktopScheduleProjectBounds(deps: Record<string, any>) {
  const {
    selectionState,
    interactionSession,
    interactionCancelVersion,
    timeline,
    showScheduleToast,
    diffScheduleDays,
    clampScheduleNumber,
    getProjectScheduleDateRange,
    isDateWithinProjectRange,
    getWorkLeadTimeWithinProject,
  } = deps;

  
  function alertWorkConnectionPredecessorLimitOnce(session: {
    blockedAlertShown: boolean;
  }) {
    if (session.blockedAlertShown) {
      return;
    }

    session.blockedAlertShown = true;
    selectionState.value = createEmptyDesktopScheduleSelectionState();
    interactionSession.value = null;
    interactionCancelVersion.value += 1;
    showScheduleToast("작업 연결 상태에서 후행작업은 선행작업보다 빠를 수 없어요.");
  }

  function getDateChangedItems(
    baseItems: DesktopScheduleItem[],
    nextItems: DesktopScheduleItem[],
  ) {
    const baseItemById = new Map(baseItems.map((item) => [item.id, item] as const));

    return nextItems.filter((item) => {
      const baseItem = baseItemById.get(item.id);
      return !!baseItem && hasDateOrLayoutChange(baseItem, item);
    });
  }

  function getProjectRangeAdjustment(
    items: DesktopScheduleItem[],
    range: ProjectScheduleDateRange,
  ) {
    if (items.length === 0) {
      return 0;
    }
  
    const minStartDate = items.reduce(
      (minDate, item) => (item.startDate < minDate ? item.startDate : minDate),
      items[0]!.startDate,
    );
    const maxEndDate = items.reduce(
      (maxDate, item) => (item.endDate > maxDate ? item.endDate : maxDate),
      items[0]!.endDate,
    );
  
    if (minStartDate < range.startDate) {
      return diffScheduleDays(minStartDate, range.startDate);
    }
  
    if (maxEndDate > range.endDate) {
      return diffScheduleDays(maxEndDate, range.endDate);
    }
  
    return 0;
  }
  
  function createProjectBoundMoveResult(
    baseItems: DesktopScheduleItem[],
    itemIds: string[],
    deltaDays: number,
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    const projectDateRange = getProjectScheduleDateRange();
    let nextDeltaDays = deltaDays;
    let moveResult = desktopScheduleService.moveItemsWithWorkConnections(
      baseItems,
      itemIds,
      nextDeltaDays,
      workConnections,
    );
  
    if (!projectDateRange) {
      return {
        ...moveResult,
        deltaDays: nextDeltaDays,
      };
    }
  
    for (let index = 0; index < 6; index += 1) {
      const adjustment = getProjectRangeAdjustment(
        getDateChangedItems(baseItems, moveResult.items),
        projectDateRange,
      );
  
      if (adjustment === 0) {
        break;
      }
  
      nextDeltaDays += adjustment;
      moveResult = desktopScheduleService.moveItemsWithWorkConnections(
        baseItems,
        itemIds,
        nextDeltaDays,
        workConnections,
      );
    }
  
    return {
      ...moveResult,
      deltaDays: nextDeltaDays,
    };
  }
  
  function createProjectBoundResizeResult(
    baseItems: DesktopScheduleItem[],
    itemId: string,
    edge: "left" | "right",
    deltaDays: number,
    workConnections: DesktopScheduleWorkConnection[],
  ) {
    const projectDateRange = getProjectScheduleDateRange();
    let nextDeltaDays = deltaDays;
    let resizeResult = desktopScheduleService.resizeItemWithWorkConnections(
      baseItems,
      itemId,
      edge,
      nextDeltaDays,
      workConnections,
    );
  
    if (!projectDateRange) {
      return resizeResult;
    }
  
    for (let index = 0; index < 6; index += 1) {
      const adjustment = getProjectRangeAdjustment(
        getDateChangedItems(baseItems, resizeResult.items),
        projectDateRange,
      );
  
      if (adjustment === 0) {
        break;
      }
  
      nextDeltaDays += adjustment;
      resizeResult = desktopScheduleService.resizeItemWithWorkConnections(
        baseItems,
        itemId,
        edge,
        nextDeltaDays,
        workConnections,
      );
    }
  
    return resizeResult;
  }
  
  
  return {
    alertWorkConnectionPredecessorLimitOnce,
    getDateChangedItems,
    getProjectRangeAdjustment,
    createProjectBoundMoveResult,
    createProjectBoundResizeResult,
  };
}
