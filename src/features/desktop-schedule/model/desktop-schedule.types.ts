export type DesktopScheduleSource = "work-api";
export type DesktopScheduleRowKind = "parent-process" | "child-process";
export type DesktopScheduleShellRowKind = DesktopScheduleRowKind | "division" | "milestone";
export type DesktopScheduleItemAppearance = "standard" | "holiday-off";
export type DesktopScheduleConnectionKind =
  | "work-connection"
  | "critical-path";

export interface DesktopScheduleRowSource {
  kind: "work-type" | "sub-work-type" | "mock";
  derivedFrom: string;
  divisionId?: number;
  division?: string;
  workTypeId?: number;
  workType?: string;
  subWorkType?: string;
  subWorkTypeId?: number;
}

export interface DesktopScheduleRow {
  id: string;
  kind: DesktopScheduleRowKind;
  parentId: string | null;
  name: string;
  colorHex?: string | null;
  summaryStartDate?: string | null;
  summaryEndDate?: string | null;
  order: number;
  depth: number;
  collapsed: boolean;
  source: DesktopScheduleRowSource;
}

export interface DesktopScheduleItem {
  id: string;
  workId: number;
  rowId: string;
  name: string;
  colorHex?: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  positionY: number;
  appearance: DesktopScheduleItemAppearance;
  division: string;
  workType: string;
  subWorkType: string;
  annotation?: string;
  zoneIds?: number[];
  floorIds?: number[];
  componentTypeIds?: number[];
}

export interface DesktopScheduleWorkConnection {
  id: string;
  pathId: number;
  sourceItemId: string;
  targetItemId: string;
  gapDays: number;
  pathName: string | null;
  color: string;
}

export interface DesktopScheduleCriticalPath {
  id: string;
  pathId: number;
  sourceItemId: string;
  targetItemId: string;
  colorHex?: string | null;
}

export interface DesktopScheduleMilestone {
  id: string;
  apiId?: number;
  date: string;
  label: string;
  rowId: string | null;
}

export interface DesktopScheduleSourceTask {
  workId: number;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  division: string;
  divisionId?: number;
  workType: string;
  workTypeId?: number;
  subWorkType: string;
  subWorkTypeId: number;
  positionY: number;
  isWorkingOnHoliday: boolean;
  annotation?: string;
  zoneIds?: number[];
  floorIds?: number[];
  componentTypeIds?: number[];
}

export interface DesktopScheduleSourceRow {
  divisionId: number;
  division: string;
  workTypeId: number;
  workType: string;
  isStructure: boolean;
  subWorkTypeId: number;
  subWorkType: string;
  colorHex?: string | null;
}

export interface DesktopScheduleSourceBundle {
  tasks: DesktopScheduleSourceTask[];
  rows?: DesktopScheduleSourceRow[];
  source: DesktopScheduleSource;
}

export interface DesktopScheduleSnapshotMetadata {
  source: DesktopScheduleSource;
  generatedAt: string;
  workCount: number;
  criticalPathCount: number;
  parentRowCount: number;
  childRowCount: number;
}

export interface DesktopScheduleSnapshot {
  rows: DesktopScheduleRow[];
  items: DesktopScheduleItem[];
  workConnections: DesktopScheduleWorkConnection[];
  criticalPaths: DesktopScheduleCriticalPath[];
  milestones: DesktopScheduleMilestone[];
  metadata: DesktopScheduleSnapshotMetadata;
}

export interface DesktopScheduleTimelineCell {
  key: string;
  index: number;
  date: string;
  dayOfMonth: number;
  dayName: string;
  monthLabel: string;
  yearLabel: string;
  weekKey: string;
  weekLabel: string;
  left: number;
  width: number;
  isToday: boolean;
  isWeekend: boolean;
}

export interface DesktopScheduleTimelineGroup {
  key: string;
  label: string;
  startIndex: number;
  span: number;
  left: number;
  width: number;
}

export interface DesktopScheduleTimelineLayout {
  startDate: string;
  endDate: string;
  dayWidth: number;
  chartWidth: number;
  days: DesktopScheduleTimelineCell[];
  monthGroups: DesktopScheduleTimelineGroup[];
  weekGroups: DesktopScheduleTimelineGroup[];
  yearGroups: DesktopScheduleTimelineGroup[];
}

export interface DesktopScheduleShellRow {
  id: string;
  parentId: string | null;
  name: string;
  kind: DesktopScheduleShellRowKind;
  colorHex?: string | null;
  divisionId?: number;
  division?: string;
  workTypeId?: number;
  workType?: string;
  subWorkTypeId?: number;
  subWorkType?: string;
  collapsed: boolean;
  hasChildren: boolean;
  depth: number;
  order: number;
  top: number;
  height: number;
  itemCount: number;
}

export interface DesktopScheduleMilestoneLayout {
  id: string;
  date: string;
  label: string;
  rowId: string | null;
  left: number;
  top: number;
  width: number;
  height: number;
  labelWidth: number;
}

export interface DesktopScheduleBarLayout {
  id: string;
  itemId: string;
  rowId: string;
  kind: "item" | "summary";
  laneIndex: number;
  name: string;
  colorHex?: string | null;
  rangeMismatchSegments?: Array<{ left: number; width: number }>;
  overflowRangeSegments?: Array<{ left: number; width: number }>;
  left: number;
  top: number;
  width: number;
  height: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  appearance: DesktopScheduleItemAppearance;
}

export interface DesktopScheduleConnectionLayout {
  id: string;
  kind: DesktopScheduleConnectionKind;
  pathId: number;
  colorHex: string | null;
  sourceItemId: string;
  targetItemId: string;
  path: string;
  label: string | null;
  labelX: number;
  labelY: number;
}

export interface DesktopScheduleShellLayout {
  rows: DesktopScheduleShellRow[];
  bars: DesktopScheduleBarLayout[];
  milestones: DesktopScheduleMilestoneLayout[];
  connections: DesktopScheduleConnectionLayout[];
  chartHeight: number;
  rowHeight: number;
}
