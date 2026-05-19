import type {
  DesktopScheduleItem,
  DesktopScheduleMilestone,
  DesktopScheduleRow,
  DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

export type ItemMoveSession = {
  type: "move";
  anchor: "item" | "summary";
  itemIds: string[];
  rowIds: string[];
  baseItems: DesktopScheduleItem[];
  baseRows: DesktopScheduleRow[];
  baseWorkConnections: DesktopScheduleWorkConnection[];
  baseLaneByItemId: Record<string, number>;
  maxLaneIndexByRowId: Record<string, number>;
  pinnedLaneByItemId: Record<string, number>;
  blockedAlertShown: boolean;
};

export type MilestoneMoveSession = {
  type: "move";
  anchor: "milestone";
  milestoneIds: string[];
  baseMilestones: DesktopScheduleMilestone[];
};

export type MoveSession = ItemMoveSession | MilestoneMoveSession;

export type ResizeSession = {
  type: "resize";
  target: "item";
  itemId: string;
  edge: "left" | "right";
  baseItems: DesktopScheduleItem[];
  baseWorkConnections: DesktopScheduleWorkConnection[];
  blockedAlertShown: boolean;
};

export type SummaryResizeSession = {
  type: "resize";
  target: "summary";
  rowId: string;
  edge: "left" | "right";
  baseRows: DesktopScheduleRow[];
};
