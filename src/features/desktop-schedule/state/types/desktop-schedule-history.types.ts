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
import type { createEmptyDesktopScheduleSelectionState } from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";

export type DesktopScheduleLocalSnapshot = {
  rows: DesktopScheduleRow[];
  items: DesktopScheduleItem[];
  workConnections: DesktopScheduleWorkConnection[];
  milestones: DesktopScheduleMilestone[];
  loadedData: DesktopScheduleBootstrapData | null;
  selection: ReturnType<typeof createEmptyDesktopScheduleSelectionState>;
};

export type DesktopScheduleHistoryEntityChange<TEntity, TKey extends string | number> = {
  key: TKey;
  before: TEntity | null;
  after: TEntity | null;
};

export type DesktopScheduleHistoryCollectionPatch<TEntity, TKey extends string | number> = {
  changes: Array<DesktopScheduleHistoryEntityChange<TEntity, TKey>>;
  beforeOrder: TKey[];
  afterOrder: TKey[];
};

export type DesktopScheduleLoadedDataHistoryPatch = {
  workHierarchy: DesktopScheduleHistoryCollectionPatch<
    DesktopScheduleReferenceHierarchyItem,
    string
  >;
  works: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkResponse, number>;
  workDeps: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkDepResponse, number>;
  milestones: DesktopScheduleHistoryCollectionPatch<DesktopScheduleMilestoneResponse, number>;
};

export type DesktopScheduleLocalHistoryEntry = {
  rows: DesktopScheduleHistoryCollectionPatch<DesktopScheduleRow, string>;
  items: DesktopScheduleHistoryCollectionPatch<DesktopScheduleItem, string>;
  workConnections: DesktopScheduleHistoryCollectionPatch<DesktopScheduleWorkConnection, string>;
  milestones: DesktopScheduleHistoryCollectionPatch<DesktopScheduleMilestone, string>;
  loadedData: DesktopScheduleLoadedDataHistoryPatch | null;
};

export type DesktopScheduleHistoryDirection = "undo" | "redo";

export type DesktopScheduleHistorySyncResult = {
  divisionIdMap?: Map<number, number>;
  workTypeIdMap?: Map<number, number>;
  subWorkTypeIdMap?: Map<number, number>;
  workIdMap?: Map<number, number>;
  workDepIdMap?: Map<number, number>;
  milestoneIdMap?: Map<number, number>;
};

export type DesktopScheduleHistoryIdMap = {
  divisionIds: Map<number, number>;
  workTypeIds: Map<number, number>;
  subWorkTypeIds: Map<number, number>;
  workIds: Map<number, number>;
  workDepIds: Map<number, number>;
  milestoneIds: Map<number, number>;
};
