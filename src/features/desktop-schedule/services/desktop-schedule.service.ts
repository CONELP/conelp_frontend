import type {
  DesktopScheduleBarLayout,
  DesktopScheduleConnectionKind,
  DesktopScheduleConnectionLayout,
  DesktopScheduleCriticalPath,
  DesktopScheduleItem,
  DesktopScheduleMilestone,
  DesktopScheduleMilestoneLayout,
  DesktopScheduleProgressLineLayout,
  DesktopScheduleRow,
  DesktopScheduleShellLayout,
  DesktopScheduleShellRow,
  DesktopScheduleSourceBundle,
  DesktopScheduleSourceRow,
  DesktopScheduleSourceTask,
  DesktopScheduleTimelineCell,
  DesktopScheduleTimelineGroup,
  DesktopScheduleTimelineLayout,
  DesktopScheduleSnapshot,
  DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

interface ChildRowDraft {
  id: string;
  name: string;
  divisionId?: number;
  division: string;
  workTypeId?: number;
  workType: string;
  subWorkType: string;
  subWorkTypeId: number;
  colorHex?: string | null;
  minPositionY: number;
}

interface DivisionRowDraft {
  id: string;
  name: string;
  divisionId?: number;
  division: string;
  minPositionY: number;
}

interface WorkTypeRowDraft {
  id: string;
  name: string;
  divisionId?: number;
  division: string;
  workTypeId?: number;
  workType: string;
  minPositionY: number;
}

interface TimelineOptions {
  dayWidth?: number;
  paddingBeforeDays?: number;
  paddingAfterDays?: number;
  startDate?: string;
  endDate?: string;
  calendarDates?: Readonly<
    Record<string, { isHoliday?: boolean; isActivated?: boolean; holidayName?: string | null }>
  >;
}

interface ShellLayoutOptions {
  rowHeight?: number;
  barHeight?: number;
  preferredLaneByItemId?: Readonly<Record<string, number>>;
  pinnedLaneByItemId?: Readonly<Record<string, number>>;
  workConnections?: DesktopScheduleWorkConnection[];
  criticalPaths?: DesktopScheduleCriticalPath[];
  milestones?: DesktopScheduleMilestone[];
  showCriticalPaths?: boolean;
  includeProgressLines?: boolean;
}

interface RowBarDraft {
  id: string;
  itemId: string;
  rowId: string;
  laneIndex: number;
  name: string;
  colorHex: string | null;
  left: number;
  width: number;
  collisionWidth: number;
  height: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  appearance: DesktopScheduleItem["appearance"];
}

export const DESKTOP_SCHEDULE_TIMELINE_ZOOM_LEVELS = [
  12,
  16,
  20,
  24,
  32,
  40,
  48,
  60,
  76,
  96,
] as const;
export const DESKTOP_SCHEDULE_TIMELINE_DEFAULTS = {
  dayWidth: 48,
  paddingBeforeDays: 6,
  paddingAfterDays: 10,
} as const;
export const DESKTOP_SCHEDULE_SHELL_DEFAULTS = {
  rowHeight: 44,
  barHeight: 34,
} as const;
export const DESKTOP_SCHEDULE_MILESTONE_ROW_ID = "row:milestones";
const WORK_CONNECTION_COLOR = "#64748b";

const CRITICAL_PATH_COLORS = [
  "#cb3a31",
  "#ef6c00",
  "#2e7d32",
  "#1565c0",
  "#6a1b9a",
  "#00897b",
  "#283593",
  "#ad1457",
] as const;

const MILESTONE_MARKER_SIZE = 10;
const MILESTONE_BADGE_HEIGHT = DESKTOP_SCHEDULE_SHELL_DEFAULTS.barHeight;
const MILESTONE_BADGE_GAP = 6;
const MILESTONE_BADGE_HORIZONTAL_GAP = 10;
const MILESTONE_BADGE_HORIZONTAL_PADDING = 14;
const MILESTONE_MIN_LABEL_WIDTH = 68;
const ITEM_BAR_HORIZONTAL_PADDING = 20;
let localPathIdCounter = Date.now();

function toStableIdPart(value: string) {
  return encodeURIComponent(value.trim().toLowerCase() || "unclassified");
}

function makeParentRowId(workType: string) {
  return `parent:${toStableIdPart(workType)}`;
}

function makeDivisionShellRowId(division: string) {
  return `division:${toStableIdPart(division)}`;
}

function makeReferenceDivisionRowId(divisionId: number | undefined, division: string) {
  return divisionId
    ? `reference-division:${divisionId}`
    : `reference-${makeDivisionShellRowId(division)}`;
}

function makeReferenceWorkTypeRowId(
  workTypeId: number | undefined,
  division: string,
  workType: string,
) {
  return workTypeId
    ? `reference-work-type:${workTypeId}`
    : `reference-${makeChildRowId(division, workType, 0, "")}`;
}

function makeChildRowId(
  division: string,
  workType: string,
  subWorkTypeId: number,
  subWorkType: string,
) {
  const subPart = subWorkTypeId > 0 ? String(subWorkTypeId) : toStableIdPart(subWorkType);

  return `child:${toStableIdPart(division)}:${toStableIdPart(workType)}:${subPart}`;
}

function compareByPosition(
  a: { minPositionY: number },
  b: { minPositionY: number },
) {
  return a.minPositionY - b.minPositionY;
}

function compareTasks(a: DesktopScheduleSourceTask, b: DesktopScheduleSourceTask) {
  return (
    a.positionY - b.positionY ||
    a.workType.localeCompare(b.workType, "ko") ||
    a.subWorkType.localeCompare(b.subWorkType, "ko") ||
    a.name.localeCompare(b.name, "ko") ||
    a.workId - b.workId
  );
}

function compareRowsForShellGrouping(a: DesktopScheduleRow, b: DesktopScheduleRow) {
  return a.order - b.order;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function shiftDateString(date: string, days: number) {
  return formatLocalDate(addDays(parseLocalDate(date), days));
}

function diffDays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getDateEndBoundaryLeft(timeline: DesktopScheduleTimelineLayout, date: string) {
  return (diffDays(timeline.startDate, date) + 1) * timeline.dayWidth;
}

function getIsoWeekInfo(date: Date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  normalizedDate.setDate(normalizedDate.getDate() + 3 - ((normalizedDate.getDay() + 6) % 7));

  const weekYear = normalizedDate.getFullYear();
  const firstThursday = new Date(weekYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));

  const weekNumber =
    1 + Math.round((normalizedDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));

  return {
    weekYear,
    weekNumber,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createLocalPathId() {
  localPathIdCounter += 1;
  return localPathIdCounter;
}

function getCriticalPathColor(pathId: number) {
  const paletteIndex =
    ((pathId % CRITICAL_PATH_COLORS.length) + CRITICAL_PATH_COLORS.length) %
    CRITICAL_PATH_COLORS.length;

  return CRITICAL_PATH_COLORS[paletteIndex]!;
}

function estimateMilestoneLabelWidth(label: string, dayWidth: number) {
  const textWidth = Array.from(label).reduce((width, character) => {
    if (/[가-힣]/.test(character)) {
      return width + 15;
    }

    if (/[A-Z0-9]/.test(character)) {
      return width + 10;
    }

    if (/\s/.test(character)) {
      return width + 5;
    }

    return width + 9;
  }, 0);

  return Math.max(
    MILESTONE_MIN_LABEL_WIDTH,
    Math.ceil(textWidth) + MILESTONE_BADGE_HORIZONTAL_PADDING * 2 + 8,
    dayWidth,
  );
}

function estimateItemBarTextWidth(label: string) {
  return Math.round(
    Array.from(label).reduce((width, character) => {
      if (/[가-힣]/.test(character)) {
        return width + 13;
      }

      if (/[A-Z0-9]/.test(character)) {
        return width + 8;
      }

      if (/\s/.test(character)) {
        return width + 4;
      }

      return width + 7;
    }, 0),
  );
}

function formatGapDaysLabel(gapDays: number) {
  return `${gapDays >= 0 ? "+" : ""}${gapDays}일`;
}

function shiftItemByDays(item: DesktopScheduleItem, deltaDays: number): DesktopScheduleItem {
  if (deltaDays === 0) {
    return item;
  }

  return {
    ...item,
    startDate: shiftDateString(item.startDate, deltaDays),
    endDate: shiftDateString(item.endDate, deltaDays),
  };
}

function getSuccessorStartDateFromPredecessor(endDate: string, gapDays: number) {
  return shiftDateString(endDate, gapDays + 1);
}

function getWorkConnectionSuccessorStartDate(
  sourceItem: DesktopScheduleItem,
  gapDays: number,
) {
  const preferredStartDate = getSuccessorStartDateFromPredecessor(sourceItem.endDate, gapDays);
  return preferredStartDate < sourceItem.startDate ? sourceItem.startDate : preferredStartDate;
}

function getCurrentGapDays(sourceItem: DesktopScheduleItem, targetItem: DesktopScheduleItem) {
  return diffDays(sourceItem.endDate, targetItem.startDate) - 1;
}

function getGapDaysBetweenItems(sourceItem: DesktopScheduleItem, targetItem: DesktopScheduleItem) {
  return getCurrentGapDays(sourceItem, targetItem);
}

function buildRangeMismatchSegments(
  timeline: DesktopScheduleTimelineLayout,
  sourceRange: { startDate: string; endDate: string },
  compareRange: { startDate: string; endDate: string },
): Array<{ left: number; width: number }> {
  const segments: Array<{ startDate: string; endDate: string }> = [];

  function pushSegment(startDate: string, endDate: string) {
    if (startDate > endDate) {
      return;
    }

    segments.push({ startDate, endDate });
  }

  if (sourceRange.startDate < compareRange.startDate) {
    pushSegment(
      sourceRange.startDate,
      sourceRange.endDate < compareRange.startDate
        ? sourceRange.endDate
        : formatLocalDate(addDays(parseLocalDate(compareRange.startDate), -1)),
    );
  } else if (compareRange.startDate < sourceRange.startDate) {
    pushSegment(
      compareRange.startDate,
      compareRange.endDate < sourceRange.startDate
        ? compareRange.endDate
        : formatLocalDate(addDays(parseLocalDate(sourceRange.startDate), -1)),
    );
  }

  if (sourceRange.endDate > compareRange.endDate) {
    pushSegment(
      sourceRange.startDate > compareRange.endDate
        ? sourceRange.startDate
        : formatLocalDate(addDays(parseLocalDate(compareRange.endDate), 1)),
      sourceRange.endDate,
    );
  } else if (compareRange.endDate > sourceRange.endDate) {
    pushSegment(
      compareRange.startDate > sourceRange.endDate
        ? compareRange.startDate
        : formatLocalDate(addDays(parseLocalDate(sourceRange.endDate), 1)),
      compareRange.endDate,
    );
  }

  return segments.map((segment) => ({
    left: diffDays(timeline.startDate, segment.startDate) * timeline.dayWidth,
    width: Math.max(
      (diffDays(segment.startDate, segment.endDate) + 1) * timeline.dayWidth,
      timeline.dayWidth,
    ),
  }));
}

function buildConnectionGeometry(
  sourceBar: DesktopScheduleBarLayout,
  targetBar: DesktopScheduleBarLayout,
) {
  const sourceX = sourceBar.left + sourceBar.width;
  const sourceY = sourceBar.top + sourceBar.height / 2;
  const targetX = targetBar.left;
  const targetY = targetBar.top + targetBar.height / 2;

  function buildRoundedOrthogonalPath(
    points: Array<{ x: number; y: number }>,
    cornerRadius = 10,
  ) {
    if (points.length <= 1) {
      return "";
    }

    const segments = [`M ${points[0]!.x} ${points[0]!.y}`];

    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = points[index - 1]!;
      const current = points[index]!;
      const next = points[index + 1]!;
      const previousDistance = Math.hypot(current.x - previous.x, current.y - previous.y);
      const nextDistance = Math.hypot(next.x - current.x, next.y - current.y);
      const radius = Math.min(cornerRadius, previousDistance / 2, nextDistance / 2);

      if (radius <= 0) {
        segments.push(`L ${current.x} ${current.y}`);
        continue;
      }

      if (previous.y === current.y && current.x === next.x) {
        const beforeX = current.x - Math.sign(current.x - previous.x) * radius;
        const afterY = current.y + Math.sign(next.y - current.y) * radius;
        segments.push(`L ${beforeX} ${current.y}`);
        segments.push(`Q ${current.x} ${current.y} ${current.x} ${afterY}`);
        continue;
      }

      if (previous.x === current.x && current.y === next.y) {
        const beforeY = current.y - Math.sign(current.y - previous.y) * radius;
        const afterX = current.x + Math.sign(next.x - current.x) * radius;
        segments.push(`L ${current.x} ${beforeY}`);
        segments.push(`Q ${current.x} ${current.y} ${afterX} ${current.y}`);
        continue;
      }

      segments.push(`L ${current.x} ${current.y}`);
    }

    const lastPoint = points[points.length - 1]!;
    segments.push(`L ${lastPoint.x} ${lastPoint.y}`);

    return segments.join(" ");
  }

  if (sourceY === targetY) {
    return {
      path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: sourceY,
    };
  }

  if (targetX >= sourceX + 24) {
    const bendX = sourceX + Math.max((targetX - sourceX) / 2, 28);

    return {
      path: buildRoundedOrthogonalPath([
        { x: sourceX, y: sourceY },
        { x: bendX, y: sourceY },
        { x: bendX, y: targetY },
        { x: targetX, y: targetY },
      ]),
      labelX: bendX + 10,
      labelY: (sourceY + targetY) / 2,
    };
  }

  const bendX = Math.max(sourceX, targetX) + 36;

  return {
    path: buildRoundedOrthogonalPath([
      { x: sourceX, y: sourceY },
      { x: bendX, y: sourceY },
      { x: bendX, y: targetY },
      { x: targetX, y: targetY },
    ]),
    labelX: bendX + 10,
    labelY: (sourceY + targetY) / 2,
  };
}

function buildTimelineGroups(
  days: DesktopScheduleTimelineCell[],
  keySelector: (cell: DesktopScheduleTimelineCell) => string,
  labelSelector: (cell: DesktopScheduleTimelineCell) => string,
): DesktopScheduleTimelineGroup[] {
  if (days.length === 0) {
    return [];
  }

  const groups: DesktopScheduleTimelineGroup[] = [];
  let currentKey = keySelector(days[0]!);
  let startIndex = 0;

  for (let index = 1; index <= days.length; index += 1) {
    const cell = days[index];
    const nextKey = cell ? keySelector(cell) : null;

    if (currentKey !== nextKey) {
      const startCell = days[startIndex]!;
      const span = index - startIndex;

      groups.push({
        key: `${currentKey}:${startIndex}`,
        label: labelSelector(startCell),
        startIndex,
        span,
        left: startCell.left,
        width: span * startCell.width,
      });

      if (cell) {
        currentKey = nextKey as string;
        startIndex = index;
      }
    }
  }

  return groups;
}

function buildMilestoneLayouts(
  timeline: DesktopScheduleTimelineLayout,
  milestones: DesktopScheduleMilestone[],
  baseRowHeight: number,
): { rowHeight: number; milestones: DesktopScheduleMilestoneLayout[] } {
  const sortedMilestones = [...milestones].sort((a, b) => {
    return a.date.localeCompare(b.date) || a.label.localeCompare(b.label, "ko");
  });
  const laneRightEdges: number[] = [];
  let laneCount = 1;
  const labelScale = baseRowHeight / DESKTOP_SCHEDULE_SHELL_DEFAULTS.rowHeight;
  const badgeHeight = Math.max(Math.round(MILESTONE_BADGE_HEIGHT * labelScale), 18);
  const laneGap = Math.max(Math.round(MILESTONE_BADGE_GAP * labelScale), 3);
  const minimumVerticalPadding = Math.max(Math.round(5 * labelScale), 3);
  const verticalPadding = Math.max(
    Math.round((baseRowHeight - badgeHeight) / 2),
    minimumVerticalPadding,
  );

  const milestoneLayouts = sortedMilestones.map((milestone) => {
    const markerCenter = getDateEndBoundaryLeft(timeline, milestone.date);
    const markerLeft = markerCenter - MILESTONE_MARKER_SIZE / 2;
    const labelWidth = estimateMilestoneLabelWidth(milestone.label, timeline.dayWidth) * labelScale;
    const labelLeft = markerCenter - labelWidth;
    const labelRight = markerCenter;
    const availableLaneIndex = laneRightEdges.findIndex(
      (rightEdge) => labelLeft >= rightEdge + MILESTONE_BADGE_HORIZONTAL_GAP,
    );
    const laneIndex = availableLaneIndex >= 0 ? availableLaneIndex : laneRightEdges.length;

    laneRightEdges[laneIndex] = labelRight;
    laneCount = Math.max(laneCount, laneIndex + 1);

    return {
      id: milestone.id,
      date: milestone.date,
      label: milestone.label,
      rowId: milestone.rowId,
      left: markerLeft,
      top: verticalPadding + laneIndex * (badgeHeight + laneGap),
      width: MILESTONE_MARKER_SIZE,
      height: badgeHeight,
      labelWidth,
    };
  });

  return {
    rowHeight: verticalPadding * 2 + laneCount * badgeHeight + Math.max(laneCount - 1, 0) * laneGap,
    milestones: milestoneLayouts,
  };
}

function upsertChildDraft(
  childDrafts: Map<string, ChildRowDraft>,
  draft: Omit<ChildRowDraft, "id">,
) {
  const childId = makeChildRowId(
    draft.division,
    draft.workType,
    draft.subWorkTypeId,
    draft.subWorkType,
  );
  const existingChild = childDrafts.get(childId);

  if (!existingChild) {
    childDrafts.set(childId, {
      ...draft,
      id: childId,
    });
    return;
  }

  existingChild.divisionId = existingChild.divisionId ?? draft.divisionId;
  existingChild.workTypeId = existingChild.workTypeId ?? draft.workTypeId;
  existingChild.colorHex = existingChild.colorHex ?? draft.colorHex ?? null;
}

function upsertDivisionDraft(
  divisionDrafts: Map<string, DivisionRowDraft>,
  draft: Omit<DivisionRowDraft, "id">,
) {
  const divisionId = draft.divisionId;
  const divisionIdKey = divisionId === undefined ? "name" : String(divisionId);
  const divisionKey = `${divisionIdKey}:${toStableIdPart(draft.division)}`;
  const existingDivision = divisionDrafts.get(divisionKey);

  if (!existingDivision) {
    divisionDrafts.set(divisionKey, {
      ...draft,
      id: makeReferenceDivisionRowId(divisionId, draft.division),
    });
    return;
  }

  existingDivision.name = existingDivision.name || draft.name;
  existingDivision.divisionId = existingDivision.divisionId ?? draft.divisionId;
  existingDivision.minPositionY = Math.min(existingDivision.minPositionY, draft.minPositionY);
}

function makeWorkTypeDraftKey(
  divisionId: number | undefined,
  division: string,
  workTypeId: number | undefined,
  workType: string,
) {
  const divisionIdKey = divisionId === undefined ? "name" : String(divisionId);
  const workTypeIdKey = workTypeId === undefined ? "name" : String(workTypeId);
  return `${divisionIdKey}:${toStableIdPart(division)}:${workTypeIdKey}:${toStableIdPart(workType)}`;
}

function upsertWorkTypeDraft(
  workTypeDrafts: Map<string, WorkTypeRowDraft>,
  draft: Omit<WorkTypeRowDraft, "id">,
) {
  const workTypeKey = makeWorkTypeDraftKey(
    draft.divisionId,
    draft.division,
    draft.workTypeId,
    draft.workType,
  );
  const existingWorkType = workTypeDrafts.get(workTypeKey);

  if (!existingWorkType) {
    workTypeDrafts.set(workTypeKey, {
      ...draft,
      id: makeReferenceWorkTypeRowId(draft.workTypeId, draft.division, draft.workType),
    });
    return;
  }

  existingWorkType.name = existingWorkType.name || draft.name;
  existingWorkType.divisionId = existingWorkType.divisionId ?? draft.divisionId;
  existingWorkType.workTypeId = existingWorkType.workTypeId ?? draft.workTypeId;
  existingWorkType.minPositionY = Math.min(existingWorkType.minPositionY, draft.minPositionY);
}

function buildRows(tasks: DesktopScheduleSourceTask[], sourceRows: DesktopScheduleSourceRow[] = []) {
  const childDrafts = new Map<string, ChildRowDraft>();
  const divisionDrafts = new Map<string, DivisionRowDraft>();
  const workTypeDrafts = new Map<string, WorkTypeRowDraft>();

  sourceRows.forEach((sourceRow, index) => {
    const division = sourceRow.division || "미분류";

    if (sourceRow.workTypeId === 0) {
      upsertDivisionDraft(divisionDrafts, {
        name: division,
        divisionId: sourceRow.divisionId,
        division,
        minPositionY: index,
      });
      return;
    }

    const workType = sourceRow.workType || "미분류 공종";

    if (sourceRow.subWorkTypeId === 0) {
      upsertWorkTypeDraft(workTypeDrafts, {
        name: workType,
        divisionId: sourceRow.divisionId,
        division,
        workTypeId: sourceRow.workTypeId,
        workType,
        minPositionY: index,
      });
      return;
    }

    upsertChildDraft(childDrafts, {
      name: sourceRow.subWorkType,
      divisionId: sourceRow.divisionId,
      division,
      workTypeId: sourceRow.workTypeId,
      workType,
      subWorkType: sourceRow.subWorkType || "세부공종 미분류",
      subWorkTypeId: sourceRow.subWorkTypeId,
      colorHex: sourceRow.colorHex ?? null,
      minPositionY: index,
    });
  });

  tasks.forEach((task) => {
    const division = task.division || "미분류";
    const workType = task.workType || "미분류 공종";
    const subWorkType = task.subWorkType || "세부공종 미분류";

    upsertChildDraft(childDrafts, {
      name: subWorkType,
      divisionId: task.divisionId,
      division,
      workTypeId: task.workTypeId,
      workType,
      subWorkType,
      subWorkTypeId: task.subWorkTypeId,
      colorHex: null,
      minPositionY: task.positionY,
    });
  });

  const divisionKeysWithChildRows = new Set(
    Array.from(childDrafts.values()).map((childDraft) => {
      const divisionIdKey =
        childDraft.divisionId === undefined ? "name" : String(childDraft.divisionId);
      return `${divisionIdKey}:${toStableIdPart(childDraft.division)}`;
    }),
  );
  const workTypeKeysWithChildRows = new Set(
    Array.from(childDrafts.values()).map((childDraft) =>
      makeWorkTypeDraftKey(
        childDraft.divisionId,
        childDraft.division,
        childDraft.workTypeId,
        childDraft.workType,
      ),
    ),
  );
  const divisionOnlyRows = Array.from(divisionDrafts.entries())
    .filter(([divisionKey]) => !divisionKeysWithChildRows.has(divisionKey))
    .map(([, divisionDraft]) => ({
      id: divisionDraft.id,
      kind: "child-process" as const,
      parentId: null,
      name: divisionDraft.name,
      colorHex: null,
      summaryStartDate: null,
      summaryEndDate: null,
      order: divisionDraft.minPositionY,
      depth: 0,
      collapsed: false,
      source: {
        kind: "division" as const,
        derivedFrom: divisionDraft.division,
        divisionId: divisionDraft.divisionId,
        division: divisionDraft.division,
      },
    }));
  const workTypeOnlyRows = Array.from(workTypeDrafts.entries())
    .filter(([workTypeKey]) => !workTypeKeysWithChildRows.has(workTypeKey))
    .map(([, workTypeDraft]) => ({
      id: workTypeDraft.id,
      kind: "child-process" as const,
      parentId: null,
      name: workTypeDraft.name,
      colorHex: null,
      summaryStartDate: null,
      summaryEndDate: null,
      order: workTypeDraft.minPositionY,
      depth: 0,
      collapsed: false,
      source: {
        kind: "work-type" as const,
        derivedFrom: `${workTypeDraft.division} / ${workTypeDraft.workType}`,
        divisionId: workTypeDraft.divisionId,
        division: workTypeDraft.division,
        workTypeId: workTypeDraft.workTypeId,
        workType: workTypeDraft.workType,
        subWorkType: "",
        // workType 당 1개만 존재하는 placeholder sub-work-type 에 고유 음수 임시 id 부여.
        // 같은 음수 id 로 ViewModel 이 createSubWorkType 분기로 진입한다.
        subWorkTypeId:
          workTypeDraft.workTypeId && workTypeDraft.workTypeId > 0
            ? -workTypeDraft.workTypeId
            : 0,
      },
    }));
  const childRows = Array.from(childDrafts.values()).map((childDraft) => ({
    id: childDraft.id,
    kind: "child-process" as const,
    parentId: null,
    name: childDraft.name,
    colorHex: childDraft.colorHex ?? null,
    summaryStartDate: null,
    summaryEndDate: null,
    order: childDraft.minPositionY,
    depth: 0,
    collapsed: false,
    source: {
      kind: "sub-work-type" as const,
      derivedFrom: `${childDraft.division} / ${childDraft.workType} / ${childDraft.subWorkType}`,
      divisionId: childDraft.divisionId,
      division: childDraft.division,
      workTypeId: childDraft.workTypeId,
      workType: childDraft.workType,
      subWorkType: childDraft.subWorkType,
      subWorkTypeId: childDraft.subWorkTypeId,
    },
  }));

  return [...divisionOnlyRows, ...workTypeOnlyRows, ...childRows]
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({
      ...row,
      order: index,
    }));
}

function buildItems(tasks: DesktopScheduleSourceTask[]): DesktopScheduleItem[] {
  return [...tasks].sort(compareTasks).map((task) => ({
    id: `item:${task.workId}`,
    workId: task.workId,
    rowId: makeChildRowId(
      task.division || "미분류",
      task.workType || "미분류 공종",
      task.subWorkTypeId,
      task.subWorkType || "세부공종 미분류",
    ),
    name: task.name,
    colorHex: null,
    startDate: task.startDate,
    endDate: task.endDate,
    durationDays: task.durationDays,
    positionY: task.positionY,
    appearance: task.isWorkingOnHoliday
      ? ("standard" as const)
      : ("holiday-off" as const),
    division: task.division,
    workType: task.workType,
    subWorkType: task.subWorkType,
    annotation: task.annotation,
    zoneIds: task.zoneIds ? [...task.zoneIds] : [],
    floorIds: task.floorIds ? [...task.floorIds] : [],
    componentTypeIds: task.componentTypeIds ? [...task.componentTypeIds] : [],
    progress: task.progress ?? null,
  }));
}

function buildConnectionLayouts(
  itemBars: DesktopScheduleBarLayout[],
  workConnections: DesktopScheduleWorkConnection[],
  criticalPaths: DesktopScheduleCriticalPath[],
) {
  const itemBarById = new Map(
    itemBars.filter((bar) => bar.kind === "item").map((bar) => [bar.itemId, bar] as const),
  );
  const connectionLayouts: DesktopScheduleConnectionLayout[] = [];

  function pushConnection(
    id: string,
    kind: DesktopScheduleConnectionKind,
    pathId: number,
    colorHex: string | null,
    sourceItemId: string,
    targetItemId: string,
    label: string | null,
  ) {
    const sourceBar = itemBarById.get(sourceItemId);
    const targetBar = itemBarById.get(targetItemId);

    if (!sourceBar || !targetBar) {
      return;
    }

    const geometry = buildConnectionGeometry(sourceBar, targetBar);

    connectionLayouts.push({
      id,
      kind,
      pathId,
      colorHex,
      sourceItemId,
      targetItemId,
      path: geometry.path,
      label,
      labelX: geometry.labelX,
      labelY: geometry.labelY,
    });
  }

  workConnections.forEach((workConnection) => {
    pushConnection(
      workConnection.id,
      "work-connection",
      workConnection.pathId,
      workConnection.color,
      workConnection.sourceItemId,
      workConnection.targetItemId,
      formatGapDaysLabel(workConnection.gapDays),
    );
  });

  criticalPaths.forEach((criticalPath) => {
    pushConnection(
      criticalPath.id,
      "critical-path",
      criticalPath.pathId,
      criticalPath.colorHex ?? getCriticalPathColor(criticalPath.pathId),
      criticalPath.sourceItemId,
      criticalPath.targetItemId,
      null,
    );
  });

  return connectionLayouts;
}

function buildSnapshot(
  bundle: DesktopScheduleSourceBundle,
  milestones: DesktopScheduleMilestone[] = [],
): DesktopScheduleSnapshot {
  const rows = buildRows(bundle.tasks, bundle.rows);
  const items = buildItems(bundle.tasks);
  const workConnections: DesktopScheduleWorkConnection[] = [];
  const criticalPaths: DesktopScheduleCriticalPath[] = [];
  const parentRowCount = 0;
  const childRowCount = rows.length;

  return {
    rows,
    items,
    workConnections,
    criticalPaths,
    milestones,
    metadata: {
      source: bundle.source,
      generatedAt: new Date().toISOString(),
      workCount: bundle.tasks.length,
      criticalPathCount: criticalPaths.length,
      parentRowCount,
      childRowCount,
    },
  };
}

function buildTimeline(
  items: DesktopScheduleItem[],
  options: TimelineOptions = {},
): DesktopScheduleTimelineLayout {
  const dayWidth = options.dayWidth ?? DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.dayWidth;
  const paddingBeforeDays =
    options.paddingBeforeDays ?? DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.paddingBeforeDays;
  const paddingAfterDays =
    options.paddingAfterDays ?? DESKTOP_SCHEDULE_TIMELINE_DEFAULTS.paddingAfterDays;

  const itemDates = items.flatMap((item) => [item.startDate, item.endDate]);
  const todayString = formatLocalDate(new Date());
  const baseStartDate =
    options.startDate ??
    (itemDates.length > 0
      ? itemDates.reduce((min, value) => (value < min ? value : min), itemDates[0]!)
      : todayString);
  const baseEndDate =
    options.endDate ??
    (itemDates.length > 0
      ? itemDates.reduce((max, value) => (value > max ? value : max), itemDates[0]!)
      : todayString);
  const startDate = formatLocalDate(addDays(parseLocalDate(baseStartDate), -paddingBeforeDays));
  const endDate = formatLocalDate(addDays(parseLocalDate(baseEndDate), paddingAfterDays));
  const totalDays = diffDays(startDate, endDate) + 1;

  const days: DesktopScheduleTimelineCell[] = Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(parseLocalDate(startDate), index);
    const dateString = formatLocalDate(date);
    const dayOfWeek = date.getDay();
    const isoWeek = getIsoWeekInfo(date);
    const weekLabel = `W${String(isoWeek.weekNumber).padStart(2, "0")}`;
    const calendarDate = options.calendarDates?.[dateString];
    const isHoliday = !!calendarDate?.isHoliday;
    const holidayName = calendarDate?.holidayName ?? null;

    return {
      key: dateString,
      index,
      date: dateString,
      dayOfMonth: date.getDate(),
      dayName: ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek]!,
      monthLabel: `${date.getMonth() + 1}월`,
      yearLabel: `${date.getFullYear()}년`,
      weekKey: `${isoWeek.weekYear}-${weekLabel}`,
      weekLabel,
      left: index * dayWidth,
      width: dayWidth,
      isToday: dateString === todayString,
      isHoliday,
      holidayName,
    };
  });

  return {
    startDate,
    endDate,
    dayWidth,
    chartWidth: totalDays * dayWidth,
    days,
    monthGroups: buildTimelineGroups(
      days,
      (cell) => `${cell.yearLabel}-${cell.monthLabel}`,
      (cell) => cell.monthLabel,
    ),
    weekGroups: buildTimelineGroups(
      days,
      (cell) => cell.weekKey,
      (cell) => cell.weekLabel,
    ),
    yearGroups: buildTimelineGroups(days, (cell) => cell.yearLabel, (cell) => cell.yearLabel),
  };
}

function buildShellLayout(
  rowsSource: DesktopScheduleRow[],
  items: DesktopScheduleItem[],
  timeline: DesktopScheduleTimelineLayout,
  options: ShellLayoutOptions = {},
): DesktopScheduleShellLayout {
  const rowHeight = options.rowHeight ?? DESKTOP_SCHEDULE_SHELL_DEFAULTS.rowHeight;
  const barHeight = options.barHeight ?? DESKTOP_SCHEDULE_SHELL_DEFAULTS.barHeight;
  const workConnections = options.workConnections ?? [];
  const criticalPaths = options.showCriticalPaths === false ? [] : options.criticalPaths ?? [];
  const milestones = options.milestones ?? [];
  const orderedRows = [...rowsSource].sort((a, b) => a.order - b.order);
  const rowById = new Map(orderedRows.map((row) => [row.id, row]));
  const itemCountByRow = new Map<string, number>();
  const itemsByRow = new Map<string, DesktopScheduleItem[]>();
  const childRowsByParentId = new Map<string, DesktopScheduleRow[]>();
  const childItemsByParentId = new Map<string, DesktopScheduleItem[]>();
  const descendantItemCountByParentId = new Map<string, number>();
  const rowBarDraftsById = new Map<string, RowBarDraft[]>();
  const rowHeightById = new Map<string, number>();
  const rowTopById = new Map<string, number>();
  const layoutScale = rowHeight / DESKTOP_SCHEDULE_SHELL_DEFAULTS.rowHeight;
  const divisionRowHeight = Math.max(Math.round(rowHeight * 0.77), 24);
  const laneGap = Math.max(Math.round(rowHeight * 0.1), 4);
  const verticalPadding = Math.max((rowHeight - barHeight) / 2, 4);
  const itemBarHorizontalPadding = ITEM_BAR_HORIZONTAL_PADDING * layoutScale;
  const preferredLaneByItemId = options.preferredLaneByItemId ?? {};
  const pinnedLaneByItemId = options.pinnedLaneByItemId ?? {};

  items.forEach((item) => {
    itemCountByRow.set(item.rowId, (itemCountByRow.get(item.rowId) ?? 0) + 1);
    const rowItems = itemsByRow.get(item.rowId) ?? [];
    rowItems.push(item);
    itemsByRow.set(item.rowId, rowItems);
  });

  orderedRows.forEach((row) => {
    if (row.parentId) {
      const childRows = childRowsByParentId.get(row.parentId) ?? [];
      childRows.push(row);
      childRowsByParentId.set(row.parentId, childRows);
    }
  });

  items.forEach((item) => {
    const row = rowById.get(item.rowId);

    if (!row?.parentId) {
      return;
    }

    const parentItems = childItemsByParentId.get(row.parentId) ?? [];
    parentItems.push(item);
    childItemsByParentId.set(row.parentId, parentItems);
    descendantItemCountByParentId.set(
      row.parentId,
      (descendantItemCountByParentId.get(row.parentId) ?? 0) + 1,
    );
  });

  const visibleRows = orderedRows.filter((row) => {
    if (!row.parentId) {
      return true;
    }

    const parentRow = rowById.get(row.parentId);
    return !parentRow?.collapsed;
  });

  const milestoneLayoutResult = buildMilestoneLayouts(timeline, milestones, rowHeight);

  visibleRows.forEach((row) => {
    if (row.kind !== "child-process") {
      rowHeightById.set(row.id, rowHeight);
      return;
    }

    const rowItems = [...(itemsByRow.get(row.id) ?? [])].sort((a, b) => {
      return (
        a.startDate.localeCompare(b.startDate) ||
        a.endDate.localeCompare(b.endDate) ||
        a.name.localeCompare(b.name, "ko") ||
        a.workId - b.workId
      );
    });

    const laneIntervals = new Map<number, Array<{ left: number; right: number }>>();
    const rowBarDrafts: RowBarDraft[] = [];

    function buildBarDraft(item: DesktopScheduleItem, laneIndex: number): RowBarDraft {
      const left = diffDays(timeline.startDate, item.startDate) * timeline.dayWidth;
      const width = Math.max(item.durationDays * timeline.dayWidth, timeline.dayWidth);
      const collisionWidth = Math.max(
        width,
        itemBarHorizontalPadding + estimateItemBarTextWidth(item.name) * layoutScale,
      );

      return {
        id: `bar:${item.id}`,
        itemId: item.id,
        rowId: item.rowId,
        laneIndex,
        name: item.name,
        colorHex: item.colorHex ?? row.colorHex ?? null,
        left,
        width,
        collisionWidth,
        height: barHeight,
        startDate: item.startDate,
        endDate: item.endDate,
        durationDays: item.durationDays,
        appearance: item.appearance,
      };
    }

    function isLaneAvailable(laneIndex: number, draft: RowBarDraft) {
      const intervals = laneIntervals.get(laneIndex) ?? [];
      const draftRight = draft.left + draft.collisionWidth;
      return intervals.every(
        (interval) => draft.left >= interval.right || draftRight <= interval.left,
      );
    }

    function reserveLane(laneIndex: number, draft: RowBarDraft) {
      const intervals = laneIntervals.get(laneIndex) ?? [];
      intervals.push({ left: draft.left, right: draft.left + draft.collisionWidth });
      laneIntervals.set(laneIndex, intervals);
      rowBarDrafts.push(draft);
    }

    function findFirstAvailableLaneForDraft(draft: RowBarDraft, startLaneIndex = 0) {
      let laneIndex = startLaneIndex;

      while (!isLaneAvailable(laneIndex, draft)) {
        laneIndex += 1;
      }

      return laneIndex;
    }

    rowItems
      .filter((item) => pinnedLaneByItemId[item.id] !== undefined)
      .sort((a, b) => {
        return (
          (pinnedLaneByItemId[a.id] ?? 0) - (pinnedLaneByItemId[b.id] ?? 0) ||
          a.startDate.localeCompare(b.startDate) ||
          a.workId - b.workId
        );
      })
      .forEach((item) => {
        const requestedLaneIndex = pinnedLaneByItemId[item.id]!;
        const draft = buildBarDraft(item, requestedLaneIndex);

        if (isLaneAvailable(requestedLaneIndex, draft)) {
          reserveLane(requestedLaneIndex, draft);
          return;
        }

        const fallbackLaneIndex = findFirstAvailableLaneForDraft(draft, 0);
        reserveLane(fallbackLaneIndex, { ...draft, laneIndex: fallbackLaneIndex });
      });

    rowItems
      .filter(
        (item) =>
          pinnedLaneByItemId[item.id] === undefined &&
          preferredLaneByItemId[item.id] !== undefined,
      )
      .sort((a, b) => {
        return (
          (preferredLaneByItemId[a.id] ?? 0) - (preferredLaneByItemId[b.id] ?? 0) ||
          a.startDate.localeCompare(b.startDate) ||
          a.workId - b.workId
        );
      })
      .forEach((item) => {
        const draft = buildBarDraft(item, preferredLaneByItemId[item.id] ?? 0);
        const laneIndex = findFirstAvailableLaneForDraft(draft, 0);
        reserveLane(laneIndex, { ...draft, laneIndex });
      });

    rowItems
      .filter(
        (item) =>
          pinnedLaneByItemId[item.id] === undefined &&
          preferredLaneByItemId[item.id] === undefined,
      )
      .forEach((item) => {
        const draft = buildBarDraft(item, 0);
        const laneIndex = findFirstAvailableLaneForDraft(draft, 0);
        reserveLane(laneIndex, { ...draft, laneIndex });
      });

    const laneCount = Math.max(
      rowBarDrafts.reduce((maxLaneIndex, draft) => Math.max(maxLaneIndex, draft.laneIndex), -1) +
        1,
      1,
    );
    const stackedRowHeight =
      verticalPadding * 2 + laneCount * barHeight + Math.max(laneCount - 1, 0) * laneGap;

    rowBarDraftsById.set(row.id, rowBarDrafts);
    rowHeightById.set(row.id, Math.max(rowHeight, stackedRowHeight));
  });

  const milestoneRow: DesktopScheduleShellRow = {
    id: DESKTOP_SCHEDULE_MILESTONE_ROW_ID,
    parentId: null,
    name: "마일스톤",
    kind: "milestone",
    colorHex: null,
    divisionId: undefined,
    division: undefined,
    workTypeId: undefined,
    workType: undefined,
    subWorkTypeId: undefined,
    subWorkType: undefined,
    collapsed: false,
    hasChildren: false,
    depth: 0,
    order: -1,
    top: 0,
    height: milestoneLayoutResult.rowHeight,
    itemCount: milestones.length,
  };

  let accumulatedTop = milestoneLayoutResult.rowHeight;

  const processRows: DesktopScheduleShellRow[] = [];
  let currentDivision: string | null = null;
  let currentDivisionId: number | undefined;

  [...visibleRows].sort(compareRowsForShellGrouping).forEach((row) => {
    const division = row.source.division ?? "미분류";
    const divisionId = row.source.divisionId;

    if (division !== currentDivision || divisionId !== currentDivisionId) {
      processRows.push({
        id: divisionId ? `division:${divisionId}` : makeDivisionShellRowId(division),
        parentId: null,
        name: division,
        kind: "division",
        colorHex: null,
        divisionId,
        division,
        workTypeId: undefined,
        workType: undefined,
        subWorkTypeId: undefined,
        subWorkType: undefined,
        collapsed: false,
        hasChildren: false,
        depth: 0,
        order: processRows.length,
        top: accumulatedTop,
        height: divisionRowHeight,
        itemCount: 0,
      });

      accumulatedTop += divisionRowHeight;
      currentDivision = division;
      currentDivisionId = divisionId;
    }

    if (row.source.kind === "division") {
      return;
    }

    const nextRowHeight = rowHeightById.get(row.id) ?? rowHeight;
    rowTopById.set(row.id, accumulatedTop);

    const shellRow: DesktopScheduleShellRow = {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      kind: row.kind,
      colorHex: row.colorHex ?? null,
      divisionId: row.source.divisionId,
      division: row.source.division,
      workTypeId: row.source.workTypeId,
      workType: row.source.workType,
      subWorkTypeId: row.source.subWorkTypeId,
      subWorkType: row.source.subWorkType,
      collapsed: row.collapsed,
      hasChildren: (childRowsByParentId.get(row.id)?.length ?? 0) > 0,
      depth: row.depth,
      order: row.order,
      top: accumulatedTop,
      height: nextRowHeight,
      itemCount: itemCountByRow.get(row.id) ?? 0,
    };

    accumulatedTop += nextRowHeight;
    processRows.push(shellRow);
  });

  const itemBars: DesktopScheduleBarLayout[] = visibleRows.flatMap((row) => {
    if (row.kind !== "child-process") {
      return [];
    }

    const rowTop = rowTopById.get(row.id);

    if (rowTop === undefined) {
      return [];
    }

    return (rowBarDraftsById.get(row.id) ?? []).map((draft) => ({
      id: draft.id,
      itemId: draft.itemId,
      rowId: draft.rowId,
      kind: "item",
      laneIndex: draft.laneIndex,
      name: draft.name,
      colorHex: draft.colorHex,
      left: draft.left,
      top: rowTop + verticalPadding + draft.laneIndex * (barHeight + laneGap),
      width: draft.width,
      height: draft.height,
      startDate: draft.startDate,
      endDate: draft.endDate,
      durationDays: draft.durationDays,
      appearance: draft.appearance,
    }));
  });

  const progressLines = options.includeProgressLines
    ? buildProgressLines(
        visibleRows,
        itemsByRow,
        timeline,
        rowTopById,
        rowHeightById,
        rowHeight,
      )
    : [];

  return {
    rows: [milestoneRow, ...processRows],
    bars: itemBars,
    milestones: milestoneLayoutResult.milestones,
    connections: buildConnectionLayouts(
      itemBars,
      workConnections,
      criticalPaths,
    ),
    progressLines,
    chartHeight: accumulatedTop,
    rowHeight,
  };
}

function buildProgressLines(
  visibleRows: DesktopScheduleRow[],
  itemsByRow: Map<string, DesktopScheduleItem[]>,
  timeline: DesktopScheduleTimelineLayout,
  rowTopById: Map<string, number>,
  rowHeightById: Map<string, number>,
  defaultRowHeight: number,
): DesktopScheduleProgressLineLayout[] {
  const todayCell = timeline.days.find((day) => day.isToday);

  if (!todayCell) {
    return [];
  }

  const dayByDate = new Map(timeline.days.map((day) => [day.date, day] as const));
  const todayCenter = todayCell.left + todayCell.width / 2;
  const lines: DesktopScheduleProgressLineLayout[] = [];

  visibleRows.forEach((row) => {
    if (row.kind !== "child-process") {
      return;
    }

    const rowTop = rowTopById.get(row.id);
    if (rowTop === undefined) {
      return;
    }

    const rowItems = itemsByRow.get(row.id) ?? [];
    const eligible = rowItems.filter(
      (item) => typeof item.progress === "number" && (item.progress ?? 0) > 0,
    );

    if (eligible.length === 0) {
      return;
    }

    const latest = eligible.reduce((best, candidate) => {
      const compareDate = candidate.startDate.localeCompare(best.startDate);
      if (compareDate > 0) {
        return candidate;
      }
      if (compareDate < 0) {
        return best;
      }
      return candidate.workId > best.workId ? candidate : best;
    });

    const progressDate = shiftDateString(latest.startDate, (latest.progress ?? 1) - 1);
    const progressCell = dayByDate.get(progressDate);

    if (!progressCell) {
      return;
    }

    const progressCenter = progressCell.left + progressCell.width / 2;

    if (progressCenter === todayCenter) {
      return;
    }

    const status: "ahead" | "behind" = progressCenter < todayCenter ? "behind" : "ahead";
    const rowHeightValue = rowHeightById.get(row.id) ?? defaultRowHeight;

    lines.push({
      id: `progress-line:${row.id}:${latest.workId}`,
      rowId: row.id,
      workId: latest.workId,
      status,
      top: rowTop + rowHeightValue / 2,
      leftStart: Math.min(progressCenter, todayCenter),
      leftEnd: Math.max(progressCenter, todayCenter),
      progressDate,
    });
  });

  return lines;
}

function toggleRowCollapse(rows: DesktopScheduleRow[], rowId: string) {
  return rows.map((row) => {
    if (row.id === rowId && row.kind === "parent-process") {
      return {
        ...row,
        collapsed: !row.collapsed,
      };
    }

    return row;
  });
}

function getInitialScrollLeftForYesterday(
  timeline: DesktopScheduleTimelineLayout,
  viewportWidth: number,
) {
  if (viewportWidth <= 0) {
    return 0;
  }

  const yesterday = formatLocalDate(addDays(new Date(), -1));
  const maxScrollLeft = Math.max(timeline.chartWidth - viewportWidth, 0);

  if (yesterday <= timeline.startDate) {
    return 0;
  }

  if (yesterday >= timeline.endDate) {
    return maxScrollLeft;
  }

  const yesterdayRight = (diffDays(timeline.startDate, yesterday) + 1) * timeline.dayWidth;

  return clamp(yesterdayRight - viewportWidth * 0.66, 0, maxScrollLeft);
}

function createLocalRowId(prefix: "parent" | "child") {
  return `${prefix}:mock:${Date.now()}-${Math.floor(Math.random() * 1_000_000)
    .toString(36)}`;
}

function createLocalEntityId(prefix: "critical-path" | "milestone") {
  return `${prefix}:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000)
    .toString(36)}`;
}

function createLocalItemId() {
  return `item:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

function reindexRows(rows: DesktopScheduleRow[]) {
  return rows.map((row, index) => ({
    ...row,
    order: index,
  }));
}

function addParentRow(rows: DesktopScheduleRow[]) {
  const nextParentIndex = rows.filter((row) => row.kind === "parent-process").length + 1;

  return reindexRows([
    ...rows,
    {
      id: createLocalRowId("parent"),
      kind: "parent-process",
      parentId: null,
      name: `새 공종 ${nextParentIndex}`,
      colorHex: null,
      summaryStartDate: null,
      summaryEndDate: null,
      order: rows.length,
      depth: 0,
      collapsed: false,
      source: {
        kind: "mock",
        derivedFrom: "manual-parent-row",
      },
    },
  ]);
}

function addChildRow(rows: DesktopScheduleRow[], parentRowId: string) {
  const parentRow = rows.find((row) => row.id === parentRowId && row.kind === "parent-process");

  if (!parentRow) {
    return rows;
  }

  const parentChildRows = rows.filter((row) => row.parentId === parentRowId);
  const nextChildIndex = parentChildRows.length + 1;
  const insertAfterOrder =
    parentChildRows.length > 0
      ? Math.max(...parentChildRows.map((row) => row.order))
      : parentRow.order;
  const childRow: DesktopScheduleRow = {
    id: createLocalRowId("child"),
    kind: "child-process",
    parentId: parentRowId,
    name: `새 세부공종 ${nextChildIndex}`,
    colorHex: null,
    summaryStartDate: null,
    summaryEndDate: null,
    order: insertAfterOrder + 1,
    depth: 1,
    collapsed: false,
    source: {
      kind: "mock",
      derivedFrom: parentRow.name,
      workType: parentRow.source.workType ?? parentRow.name,
    },
  };

  const nextRows = rows
    .map((row) => (row.id === parentRowId ? { ...row, collapsed: false } : row))
    .flatMap((row) => (row.order === insertAfterOrder ? [row, childRow] : [row]));

  return reindexRows(nextRows);
}

function deleteItems(items: DesktopScheduleItem[], itemIds: string[]) {
  if (itemIds.length === 0) {
    return items;
  }

  const itemIdSet = new Set(itemIds);
  return items.filter((item) => !itemIdSet.has(item.id));
}

function deleteRows(rows: DesktopScheduleRow[], rowIds: string[]) {
  if (rowIds.length === 0) {
    return rows;
  }

  const rowIdSet = new Set(rowIds);
  let didAddDescendant = true;

  while (didAddDescendant) {
    didAddDescendant = false;

    rows.forEach((row) => {
      if (row.parentId && rowIdSet.has(row.parentId) && !rowIdSet.has(row.id)) {
        rowIdSet.add(row.id);
        didAddDescendant = true;
      }
    });
  }

  return reindexRows(rows.filter((row) => !rowIdSet.has(row.id)));
}

function createWorkConnection(
  workConnections: DesktopScheduleWorkConnection[],
  payload: { sourceItemId: string; targetItemId: string; gapDays: number },
) {
  if (payload.sourceItemId === payload.targetItemId) {
    return workConnections;
  }

  const isSameItemPair = (workConnection: DesktopScheduleWorkConnection) =>
    (workConnection.sourceItemId === payload.sourceItemId &&
      workConnection.targetItemId === payload.targetItemId) ||
    (workConnection.sourceItemId === payload.targetItemId &&
      workConnection.targetItemId === payload.sourceItemId);
  const preservedWorkConnections = workConnections.filter(
    (workConnection) => !isSameItemPair(workConnection),
  );

  return [
    ...preservedWorkConnections,
    {
      id: `work-connection:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`,
      pathId: Date.now(),
      sourceItemId: payload.sourceItemId,
      targetItemId: payload.targetItemId,
      gapDays: payload.gapDays,
      pathName: null,
      color: WORK_CONNECTION_COLOR,
    },
  ];
}

function createCriticalPathDraft(
  criticalPaths: DesktopScheduleCriticalPath[],
  preferredItemId?: string,
): { pathId: number; colorHex: string } {
  if (preferredItemId) {
    const relatedPathMetaById = new Map<number, { count: number; hasOutgoing: boolean; colorHex: string }>();

    criticalPaths.forEach((criticalPath) => {
      if (
        criticalPath.sourceItemId !== preferredItemId &&
        criticalPath.targetItemId !== preferredItemId
      ) {
        return;
      }

      const currentMeta = relatedPathMetaById.get(criticalPath.pathId);
      relatedPathMetaById.set(criticalPath.pathId, {
        count: (currentMeta?.count ?? 0) + 1,
        hasOutgoing:
          (currentMeta?.hasOutgoing ?? false) || criticalPath.sourceItemId === preferredItemId,
        colorHex:
          currentMeta?.colorHex ??
          criticalPath.colorHex ??
          getCriticalPathColor(criticalPath.pathId),
      });
    });

    const preferredPathEntry = [...relatedPathMetaById.entries()].sort((a, b) => {
      return b[1].count - a[1].count || Number(b[1].hasOutgoing) - Number(a[1].hasOutgoing) || a[0] - b[0];
    })[0];

    if (preferredPathEntry) {
      return {
        pathId: preferredPathEntry[0],
        colorHex: preferredPathEntry[1].colorHex,
      };
    }
  }

  const pathId = createLocalPathId();
  return {
    pathId,
    colorHex: getCriticalPathColor(pathId),
  };
}

function createCriticalPath(
  criticalPaths: DesktopScheduleCriticalPath[],
  payload: { sourceItemId: string; targetItemId: string; pathId?: number; colorHex?: string | null },
) {
  if (
    payload.sourceItemId === payload.targetItemId ||
    criticalPaths.some(
      (criticalPath) =>
        criticalPath.sourceItemId === payload.sourceItemId &&
        criticalPath.targetItemId === payload.targetItemId,
    )
  ) {
    return criticalPaths;
  }

  return [
    ...criticalPaths,
    {
      id: createLocalEntityId("critical-path"),
      pathId: payload.pathId ?? createLocalPathId(),
      sourceItemId: payload.sourceItemId,
      targetItemId: payload.targetItemId,
      colorHex: payload.colorHex ?? null,
    },
  ];
}

function removeWorkConnectionsForItems(
  workConnections: DesktopScheduleWorkConnection[],
  itemIds: string[],
) {
  if (itemIds.length === 0) {
    return workConnections;
  }

  const itemIdSet = new Set(itemIds);
  return workConnections.filter(
    (workConnection) =>
      !itemIdSet.has(workConnection.sourceItemId) &&
      !itemIdSet.has(workConnection.targetItemId),
  );
}

function removeWorkConnectionsByIds(
  workConnections: DesktopScheduleWorkConnection[],
  workConnectionIds: string[],
) {
  if (workConnectionIds.length === 0) {
    return workConnections;
  }

  const workConnectionIdSet = new Set(workConnectionIds);
  return workConnections.filter((workConnection) => !workConnectionIdSet.has(workConnection.id));
}

function removeCriticalPathsByIds(
  criticalPaths: DesktopScheduleCriticalPath[],
  criticalPathIds: string[],
) {
  if (criticalPathIds.length === 0) {
    return criticalPaths;
  }

  const criticalPathIdSet = new Set(criticalPathIds);
  return criticalPaths.filter((criticalPath) => !criticalPathIdSet.has(criticalPath.id));
}

function removeConnectedCriticalPathChain(
  criticalPaths: DesktopScheduleCriticalPath[],
  seedCriticalPathId: string,
) {
  const seedCriticalPath = criticalPaths.find(
    (criticalPath) => criticalPath.id === seedCriticalPathId,
  );

  if (!seedCriticalPath) {
    return criticalPaths;
  }

  return criticalPaths.filter((criticalPath) => criticalPath.pathId !== seedCriticalPath.pathId);
}

function upsertMilestone(
  milestones: DesktopScheduleMilestone[],
  payload: { date: string; label: string; rowId: string | null },
) {
  const nextLabel = payload.label.trim();

  if (!nextLabel) {
    return milestones;
  }

  const existingMilestoneIndex = milestones.findIndex(
    (milestone) =>
      milestone.date === payload.date && (milestone.rowId ?? null) === payload.rowId,
  );

  if (existingMilestoneIndex >= 0) {
    return milestones.map((milestone, index) =>
      index === existingMilestoneIndex
        ? {
            ...milestone,
            label: nextLabel,
          }
        : milestone,
    );
  }

  return [
    ...milestones,
    {
      id: createLocalEntityId("milestone"),
      date: payload.date,
      label: nextLabel,
      rowId: payload.rowId,
    },
  ];
}

function createMilestone(
  milestones: DesktopScheduleMilestone[],
  payload: { date: string; label: string; rowId: string | null },
) {
  const nextLabel = payload.label.trim();

  if (!nextLabel) {
    return milestones;
  }

  return [
    ...milestones,
    {
      id: createLocalEntityId("milestone"),
      date: payload.date,
      label: nextLabel,
      rowId: payload.rowId,
    },
  ];
}

function removeMilestonesByIds(
  milestones: DesktopScheduleMilestone[],
  milestoneIds: string[],
) {
  if (milestoneIds.length === 0) {
    return milestones;
  }

  const milestoneIdSet = new Set(milestoneIds);
  return milestones.filter((milestone) => !milestoneIdSet.has(milestone.id));
}

function updateMilestoneLabel(
  milestones: DesktopScheduleMilestone[],
  milestoneId: string,
  label: string,
) {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    return milestones;
  }

  return milestones.map((milestone) =>
    milestone.id === milestoneId ? { ...milestone, label: trimmedLabel } : milestone,
  );
}

function moveMilestones(
  milestones: DesktopScheduleMilestone[],
  milestoneIds: string[],
  deltaDays: number,
) {
  if (milestoneIds.length === 0 || deltaDays === 0) {
    return milestones;
  }

  const milestoneIdSet = new Set(milestoneIds);
  return milestones.map((milestone) =>
    milestoneIdSet.has(milestone.id)
      ? {
          ...milestone,
          date: shiftDateString(milestone.date, deltaDays),
        }
      : milestone,
  );
}

function createItem(
  rows: DesktopScheduleRow[],
  items: DesktopScheduleItem[],
  payload: {
    rowId: string;
    startDate: string;
    name?: string;
    division?: string;
    workType?: string;
    subWorkType?: string;
    durationDays?: number;
    annotation?: string;
    zoneIds?: number[];
    floorIds?: number[];
    componentTypeIds?: number[];
  },
): DesktopScheduleItem[] {
  const targetRow = rows.find((row) => row.id === payload.rowId);

  if (!targetRow || targetRow.kind !== "child-process") {
    return items;
  }

  const nextItemIndex = items.filter((item) => item.rowId === payload.rowId).length + 1;
  const fallbackName =
    targetRow.name.trim() ||
    payload.subWorkType?.trim() ||
    payload.workType?.trim() ||
    `새 작업 ${nextItemIndex}`;
  const durationDays = Math.max(payload.durationDays ?? 3, 1);
  const nextItem: DesktopScheduleItem = {
    id: createLocalItemId(),
    workId: Date.now(),
    rowId: payload.rowId,
    name: payload.name?.trim() || fallbackName,
    colorHex: null,
    startDate: payload.startDate,
    endDate: shiftDateString(payload.startDate, durationDays - 1),
    durationDays,
    positionY: targetRow.order,
    appearance: "standard",
    division: payload.division ?? "",
    workType: payload.workType ?? targetRow.source.workType ?? "",
    subWorkType: payload.subWorkType ?? targetRow.source.subWorkType ?? targetRow.name,
    annotation: payload.annotation ?? "",
    zoneIds: payload.zoneIds ? [...payload.zoneIds] : [],
    floorIds: payload.floorIds ? [...payload.floorIds] : [],
    componentTypeIds: payload.componentTypeIds ? [...payload.componentTypeIds] : [],
  };

  return [
    ...items,
    nextItem,
  ];
}

function updateRowColor(rows: DesktopScheduleRow[], rowId: string, colorHex: string | null) {
  return rows.map((row) => (row.id === rowId ? { ...row, colorHex } : row));
}

function updateRowName(rows: DesktopScheduleRow[], rowId: string, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return rows;
  }

  return rows.map((row) => (row.id === rowId ? { ...row, name: trimmedName } : row));
}

function updateItemColor(
  items: DesktopScheduleItem[],
  itemIds: string[],
  colorHex: string | null,
) {
  if (itemIds.length === 0) {
    return items;
  }

  const itemIdSet = new Set(itemIds);
  return items.map((item) => (itemIdSet.has(item.id) ? { ...item, colorHex } : item));
}

function updateItemName(items: DesktopScheduleItem[], itemId: string, name: string) {
  return items.map((item) => (item.id === itemId ? { ...item, name } : item));
}

function updateItemDetails(
  items: DesktopScheduleItem[],
  itemId: string,
  payload: {
    name: string;
    division: string;
    workType: string;
    subWorkType: string;
    annotation?: string;
    zoneIds?: number[];
    floorIds?: number[];
    componentTypeIds?: number[];
  },
) {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          name: payload.name,
          division: payload.division,
          workType: payload.workType,
          subWorkType: payload.subWorkType,
          annotation: payload.annotation ?? "",
          zoneIds: payload.zoneIds ? [...payload.zoneIds] : [],
          floorIds: payload.floorIds ? [...payload.floorIds] : [],
          componentTypeIds: payload.componentTypeIds ? [...payload.componentTypeIds] : [],
        }
      : item,
  );
}

function serializeItemsInBaseOrder(
  baseItems: DesktopScheduleItem[],
  itemsById: Map<string, DesktopScheduleItem>,
) {
  return baseItems.map((item) => itemsById.get(item.id) ?? item);
}

function buildRelationMaps<TRelation extends { sourceItemId: string; targetItemId: string }>(
  relations: TRelation[],
) {
  const outgoingByItemId = new Map<string, TRelation[]>();
  const incomingByItemId = new Map<string, TRelation[]>();

  relations.forEach((relation) => {
    const outgoing = outgoingByItemId.get(relation.sourceItemId) ?? [];
    outgoing.push(relation);
    outgoingByItemId.set(relation.sourceItemId, outgoing);

    const incoming = incomingByItemId.get(relation.targetItemId) ?? [];
    incoming.push(relation);
    incomingByItemId.set(relation.targetItemId, incoming);
  });

  return {
    outgoingByItemId,
    incomingByItemId,
  };
}

function applyWorkConnectionRules(
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

function getChangedItemIds(
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

function moveItems(
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

function moveItemsWithWorkConnections(
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

function moveSummaryRows(baseRows: DesktopScheduleRow[], rowIds: string[], deltaDays: number) {
  if (rowIds.length === 0) {
    return baseRows;
  }

  const rowIdSet = new Set(rowIds);
  return baseRows.map((row) => {
    if (
      !rowIdSet.has(row.id) ||
      row.kind !== "parent-process" ||
      !row.summaryStartDate ||
      !row.summaryEndDate
    ) {
      return row;
    }

    return {
      ...row,
      summaryStartDate: shiftDateString(row.summaryStartDate, deltaDays),
      summaryEndDate: shiftDateString(row.summaryEndDate, deltaDays),
    };
  });
}

function resizeItem(
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

function resizeItemWithWorkConnections(
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

function resizeSummaryRow(
  baseRows: DesktopScheduleRow[],
  rowId: string,
  edge: "left" | "right",
  deltaDays: number,
) {
  return baseRows.map((row) => {
    if (
      row.id !== rowId ||
      row.kind !== "parent-process" ||
      !row.summaryStartDate ||
      !row.summaryEndDate
    ) {
      return row;
    }

    const summaryDurationDays = diffDays(row.summaryStartDate, row.summaryEndDate) + 1;

    if (edge === "left") {
      const clampedDelta = Math.min(deltaDays, summaryDurationDays - 1);
      return {
        ...row,
        summaryStartDate: shiftDateString(row.summaryStartDate, clampedDelta),
      };
    }

    const nextDurationDays = Math.max(summaryDurationDays + deltaDays, 1);
    const endDateDelta = nextDurationDays - summaryDurationDays;

    return {
      ...row,
      summaryEndDate: shiftDateString(row.summaryEndDate, endDateDelta),
    };
  });
}

function getScrollLeftForZoom(
  timeline: DesktopScheduleTimelineLayout,
  nextDayWidth: number,
  currentScrollLeft: number,
  viewportWidth: number,
) {
  if (viewportWidth <= 0 || nextDayWidth <= 0) {
    return currentScrollLeft;
  }

  const anchorDayIndex = (currentScrollLeft + viewportWidth / 2) / timeline.dayWidth;
  const nextChartWidth = timeline.days.length * nextDayWidth;
  const maxScrollLeft = Math.max(nextChartWidth - viewportWidth, 0);

  return clamp(anchorDayIndex * nextDayWidth - viewportWidth / 2, 0, maxScrollLeft);
}

export const desktopScheduleService = {
  buildSnapshot,
  buildTimeline,
  buildShellLayout,
  addParentRow,
  addChildRow,
  toggleRowCollapse,
  deleteItems,
  deleteRows,
  createWorkConnection,
  createCriticalPathDraft,
  createCriticalPath,
  removeWorkConnectionsForItems,
  removeWorkConnectionsByIds,
  removeCriticalPathsByIds,
  removeConnectedCriticalPathChain,
  upsertMilestone,
  createMilestone,
  removeMilestonesByIds,
  updateMilestoneLabel,
  moveMilestones,
  createItem,
  updateRowColor,
  updateRowName,
  updateItemColor,
  updateItemName,
  updateItemDetails,
  moveItems,
  moveItemsWithWorkConnections,
  moveSummaryRows,
  resizeItem,
  resizeItemWithWorkConnections,
  resizeSummaryRow,
  getGapDaysBetweenItems,
  getScrollLeftForZoom,
  getInitialScrollLeftForYesterday,
  getCriticalPathColor,
  createLocalPathId,
};
