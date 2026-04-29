export interface DesktopScheduleSelectionState {
  rowIds: string[];
  itemIds: string[];
  workConnectionIds: string[];
  criticalPathIds: string[];
  groupIds: string[];
  milestoneIds: string[];
}

export type DesktopScheduleContextMenuTarget =
  | { kind: "row"; rowId: string }
  | { kind: "item"; itemId: string }
  | { kind: "work-connection"; workConnectionId: string }
  | { kind: "critical-path"; criticalPathId: string }
  | { kind: "group"; groupId: string }
  | { kind: "milestone"; milestoneId: string }
  | { kind: "canvas"; rowId: string | null; date: string | null };

export type DesktopScheduleContextMenuCommand =
  | "create-milestone"
  | "create-item"
  | "delete-item"
  | "toggle-work-connection"
  | "remove-work-connection"
  | "remove-milestone"
  | "toggle-critical-path"
  | "remove-critical-path"
  | "remove-critical-path-chain"
  | "change-color"
  | "change-properties";

export type DesktopScheduleContextMenuIcon =
  | "plus"
  | "trash"
  | "connection"
  | "disconnect"
  | "palette"
  | "pencil";

export interface DesktopScheduleContextMenuItem {
  id: string;
  label: string;
  command: DesktopScheduleContextMenuCommand;
  icon: DesktopScheduleContextMenuIcon;
  disabled?: boolean;
  danger?: boolean;
}

export interface DesktopScheduleContextMenuState {
  open: boolean;
  x: number;
  y: number;
  target: DesktopScheduleContextMenuTarget | null;
}

export function createEmptyDesktopScheduleSelectionState(): DesktopScheduleSelectionState {
  return {
    rowIds: [],
    itemIds: [],
    workConnectionIds: [],
    criticalPathIds: [],
    groupIds: [],
    milestoneIds: [],
  };
}

export function createClosedDesktopScheduleContextMenuState(): DesktopScheduleContextMenuState {
  return {
    open: false,
    x: 0,
    y: 0,
    target: null,
  };
}
