import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";
import type {
    MoveSession,
    ResizeSession,
    SummaryResizeSession,
} from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";

type ProjectBoundMoveResult = {
  items: DesktopScheduleItem[];
  workConnections: DesktopScheduleWorkConnection[];
  blockedByPredecessorStart: boolean;
};

type ProjectBoundResizeResult = ProjectBoundMoveResult;

type DesktopScheduleDragSessionDependencies = {
  isScheduleReadOnly: () => boolean;
  getInteractionSession: () => unknown;
  setInteractionSession: (session: unknown) => void;
  getWorkingMilestones: () => DesktopScheduleMilestone[];
  setWorkingMilestones: (milestones: DesktopScheduleMilestone[]) => void;
  getWorkingRows: () => DesktopScheduleRow[];
  setWorkingRows: (rows: DesktopScheduleRow[]) => void;
  getWorkingItems: () => DesktopScheduleItem[];
  setWorkingItems: (items: DesktopScheduleItem[]) => void;
  setWorkingWorkConnections: (workConnections: DesktopScheduleWorkConnection[]) => void;
  createProjectBoundMoveResult: (
    baseItems: DesktopScheduleItem[],
    itemIds: string[],
    deltaDays: number,
    baseWorkConnections: DesktopScheduleWorkConnection[],
  ) => ProjectBoundMoveResult;
  createProjectBoundResizeResult: (
    baseItems: DesktopScheduleItem[],
    itemId: string,
    edge: "left" | "right",
    deltaDays: number,
    baseWorkConnections: DesktopScheduleWorkConnection[],
  ) => ProjectBoundResizeResult;
  alertWorkConnectionPredecessorLimitOnce: (session: { blockedAlertShown: boolean }) => void;
};

function isMoveSession(session: unknown): session is MoveSession {
  return typeof session === "object" && session !== null && "type" in session
    && session.type === "move";
}

function isResizeSession(session: unknown): session is ResizeSession | SummaryResizeSession {
  return typeof session === "object" && session !== null && "type" in session
    && session.type === "resize";
}

export function useDesktopScheduleDragSession(
  dependencies: DesktopScheduleDragSessionDependencies,
) {
  function draftMoveSession(payload: { deltaDays: number; deltaLanes: number }) {
    if (dependencies.isScheduleReadOnly()) {
      return;
    }

    const session = dependencies.getInteractionSession();

    if (!isMoveSession(session)) {
      return;
    }

    if (session.anchor === "milestone") {
      dependencies.setWorkingMilestones(
        desktopScheduleService.moveMilestones(
          session.baseMilestones,
          session.milestoneIds,
          payload.deltaDays,
        ),
      );
      return;
    }

    if (session.rowIds.length > 0) {
      dependencies.setWorkingRows(
        desktopScheduleService.moveSummaryRows(
          session.baseRows,
          session.rowIds,
          payload.deltaDays,
        ),
      );
    }

    if (session.itemIds.length === 0) {
      return;
    }

    const rowIdByItemId = new Map(
      session.baseItems
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => [item.id, item.rowId] as const),
    );
    const laneBoundsByRowId = Object.entries(session.baseLaneByItemId).reduce<
      Record<string, { minLane: number; maxLane: number }>
    >((acc, [itemId, laneIndex]) => {
      const rowId = rowIdByItemId.get(itemId);
      if (!rowId) {
        return acc;
      }

      const existing = acc[rowId];
      if (!existing) {
        acc[rowId] = { minLane: laneIndex, maxLane: laneIndex };
        return acc;
      }

      existing.minLane = Math.min(existing.minLane, laneIndex);
      existing.maxLane = Math.max(existing.maxLane, laneIndex);
      return acc;
    }, {});

    dependencies.setInteractionSession({
      ...session,
      pinnedLaneByItemId: Object.fromEntries(
        Object.entries(session.baseLaneByItemId).map(([itemId, laneIndex]) => {
          const rowId = rowIdByItemId.get(itemId);
          if (!rowId) {
            return [itemId, laneIndex] as const;
          }

          const rowBounds = laneBoundsByRowId[rowId];
          const maxLaneIndex = session.maxLaneIndexByRowId[rowId] ?? rowBounds?.maxLane ?? laneIndex;
          const deltaLanes = session.anchor === "item" ? payload.deltaLanes : 0;
          const clampedDeltaLanes = Math.min(
            Math.max(deltaLanes, -(rowBounds?.minLane ?? laneIndex)),
            maxLaneIndex - (rowBounds?.maxLane ?? laneIndex),
          );

          return [itemId, laneIndex + clampedDeltaLanes] as const;
        }),
      ),
    });

    const moveResult = dependencies.createProjectBoundMoveResult(
      session.baseItems,
      session.itemIds,
      payload.deltaDays,
      session.baseWorkConnections,
    );
    dependencies.setWorkingItems(moveResult.items);
    dependencies.setWorkingWorkConnections(moveResult.workConnections);

    if (moveResult.blockedByPredecessorStart) {
      dependencies.alertWorkConnectionPredecessorLimitOnce(session);
    }
  }

  function draftResizeSession(payload: { deltaDays: number }) {
    if (dependencies.isScheduleReadOnly()) {
      return;
    }

    const session = dependencies.getInteractionSession();
    if (!isResizeSession(session)) {
      return;
    }

    if (session.target === "summary") {
      dependencies.setWorkingRows(
        desktopScheduleService.resizeSummaryRow(
          session.baseRows,
          session.rowId,
          session.edge,
          payload.deltaDays,
        ),
      );
      return;
    }

    const resizeResult = dependencies.createProjectBoundResizeResult(
      session.baseItems,
      session.itemId,
      session.edge,
      payload.deltaDays,
      session.baseWorkConnections,
    );
    dependencies.setWorkingItems(resizeResult.items);
    dependencies.setWorkingWorkConnections(resizeResult.workConnections);

    if (resizeResult.blockedByPredecessorStart) {
      dependencies.alertWorkConnectionPredecessorLimitOnce(session);
    }
  }

  return {
    draftMoveSession,
    draftResizeSession,
  };
}
