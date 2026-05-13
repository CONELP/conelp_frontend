export type DesktopScheduleSource = "work-api";
export type DesktopScheduleRowKind = "parent-process" | "child-process";
export type DesktopScheduleShellRowKind = DesktopScheduleRowKind | "division" | "milestone";
export type DesktopScheduleItemAppearance = "standard" | "holiday-off";
export type DesktopScheduleConnectionKind =
  | "work-connection"
  | "critical-path";

export interface DesktopScheduleRowSource {
  kind: "division" | "work-type" | "sub-work-type" | "mock";
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
  progress?: number | null;
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
  progress?: number | null;
}

export interface DesktopScheduleSourceRow {
  divisionId: number;
  division: string;
  workTypeId: number;
  workType: string;
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
  isHoliday: boolean;
  holidayName: string | null;
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

export interface DesktopScheduleProgressLineLayout {
  id: string;
  rowId: string;
  workId: number;
  status: "ahead" | "behind";
  top: number;
  leftStart: number;
  leftEnd: number;
  progressDate: string;
}

export interface DesktopScheduleShellLayout {
  rows: DesktopScheduleShellRow[];
  bars: DesktopScheduleBarLayout[];
  milestones: DesktopScheduleMilestoneLayout[];
  connections: DesktopScheduleConnectionLayout[];
  progressLines: DesktopScheduleProgressLineLayout[];
  chartHeight: number;
  rowHeight: number;
}

export type DesktopScheduleVersionReviewCategory =
  | "workAdded"
  | "workChanged"
  | "workDeleted"
  | "connectionChanged"
  | "milestoneChanged";

export interface DesktopScheduleVersionReviewCount {
  category: DesktopScheduleVersionReviewCategory;
  label: string;
  count: number;
}

export interface DesktopScheduleVersionReviewDetail {
  id: string;
  category: DesktopScheduleVersionReviewCategory;
  kindLabel: string;
  title: string;
  description: string;
}

export type DesktopScheduleVersionReviewVisualChangeKind = "added" | "changed" | "deleted";

export interface DesktopScheduleVersionReviewBarOverlayLayout {
  id: string;
  changeKind: Exclude<DesktopScheduleVersionReviewVisualChangeKind, "added">;
  itemId: string;
  name: string;
  colorHex?: string | null;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DesktopScheduleVersionReviewMilestoneOverlayLayout {
  id: string;
  changeKind: Exclude<DesktopScheduleVersionReviewVisualChangeKind, "added">;
  milestoneId: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  labelWidth: number;
}

export interface DesktopScheduleVersionReviewConnectionOverlayLayout {
  id: string;
  changeKind: Exclude<DesktopScheduleVersionReviewVisualChangeKind, "added">;
  connectionId: string;
  path: string;
  label: string | null;
  labelX: number;
  labelY: number;
}

export interface DesktopScheduleVersionReviewVisualSummary {
  addedItemIds: string[];
  changedItemIds: string[];
  addedWorkConnectionIds: string[];
  changedWorkConnectionIds: string[];
  addedMilestoneIds: string[];
  changedMilestoneIds: string[];
  baselineBarOverlays: DesktopScheduleVersionReviewBarOverlayLayout[];
  baselineMilestoneOverlays: DesktopScheduleVersionReviewMilestoneOverlayLayout[];
  baselineConnectionOverlays: DesktopScheduleVersionReviewConnectionOverlayLayout[];
}

export interface DesktopScheduleVersionReviewSummary {
  baselineVersionName: string;
  draftVersionName: string;
  generatedAt: string;
  totalCount: number;
  counts: DesktopScheduleVersionReviewCount[];
  details: DesktopScheduleVersionReviewDetail[];
  visual?: DesktopScheduleVersionReviewVisualSummary;
}

export interface DesktopScheduleVersionReviewState {
  open: boolean;
  status: "idle" | "loading" | "success" | "error";
  summary: DesktopScheduleVersionReviewSummary | null;
  errorMessage: string | null;
}

export interface DesktopScheduleVersionPromotionState {
  open: boolean;
  status: "idle" | "preparing" | "promoting" | "error";
  baselineVersionName: string | null;
  draftVersionName: string | null;
  summary: DesktopScheduleVersionReviewSummary | null;
  errorMessage: string | null;
}
