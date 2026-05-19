import type {
    DesktopScheduleMilestoneResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
    DesktopScheduleItem,
    DesktopScheduleMilestone,
    DesktopScheduleRow,
    DesktopScheduleShellLayout,
    DesktopScheduleSnapshot,
    DesktopScheduleTimelineLayout,
    DesktopScheduleVersionReviewCategory,
    DesktopScheduleVersionReviewCount,
    DesktopScheduleVersionReviewDetail,
    DesktopScheduleVersionReviewSummary,
    DesktopScheduleVersionReviewVisualSummary,
    DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import type {
    createEmptyDesktopScheduleSelectionState,
} from "@/features/desktop-schedule/state/types/desktop-schedule-interaction-state";
import { normalizeMilestoneLabelFromApi } from "@/features/desktop-schedule/services/domain/desktop-schedule-milestone-label.service";

const SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS: Record<
  DesktopScheduleVersionReviewCategory,
  string
> = {
  workAdded: "작업 추가",
  workChanged: "작업 변경",
  workDeleted: "작업 삭제",
  connectionChanged: "작업 연결 변경",
  milestoneChanged: "마일스톤 변경",
};

export function createScheduleVersionReviewDraftFingerprint(
  draftSnapshot: Pick<DesktopScheduleSnapshot, "items" | "workConnections" | "milestones">,
) {
  return JSON.stringify({
    items: draftSnapshot.items
      .map((item) => ({
        id: item.id,
        workId: item.workId,
        rowId: item.rowId,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        durationDays: item.durationDays,
        positionY: item.positionY,
        colorHex: item.colorHex ?? null,
        appearance: item.appearance,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    workConnections: draftSnapshot.workConnections
      .map((connection) => ({
        id: connection.id,
        pathId: connection.pathId,
        sourceItemId: connection.sourceItemId,
        targetItemId: connection.targetItemId,
        gapDays: connection.gapDays,
        color: connection.color,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    milestones: draftSnapshot.milestones
      .map((milestone) => ({
        id: milestone.id,
        apiId: milestone.apiId ?? null,
        date: milestone.date,
        label: milestone.label,
        rowId: milestone.rowId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function createScheduleVersionReviewLayoutFingerprint(
  rows: DesktopScheduleRow[],
  timeline: DesktopScheduleTimelineLayout,
  options: {
    rowHeight: number;
    barHeight: number;
    preferredLaneByItemId: Readonly<Record<string, number>>;
  },
) {
  return JSON.stringify({
    timeline: {
      startDate: timeline.startDate,
      endDate: timeline.endDate,
      dayWidth: timeline.dayWidth,
    },
    rowHeight: options.rowHeight,
    barHeight: options.barHeight,
    preferredLaneByItemId: Object.entries(options.preferredLaneByItemId).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    rows: rows
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        parentId: row.parentId,
        name: row.name,
        colorHex: row.colorHex ?? null,
        order: row.order,
        collapsed: row.collapsed,
        source: {
          divisionId: row.source.divisionId ?? null,
          workTypeId: row.source.workTypeId ?? null,
          subWorkTypeId: row.source.subWorkTypeId ?? null,
          division: row.source.division ?? null,
          workType: row.source.workType ?? null,
          subWorkType: row.source.subWorkType ?? null,
        },
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function createMilestoneModelFromApi(
  milestone: DesktopScheduleMilestoneResponse,
): DesktopScheduleMilestone {
  return {
    id: `milestone:${milestone.id}`,
    apiId: milestone.id,
    date: milestone.date,
    label: normalizeMilestoneLabelFromApi(milestone.name),
    rowId: null,
  };
}

export function getMilestoneApiId(milestone: DesktopScheduleMilestone | null | undefined) {
  if (!milestone) {
    return null;
  }

  if (typeof milestone.apiId === "number") {
    return milestone.apiId;
  }

  const idMatch = milestone.id.match(/^milestone:(\d+)$/);
  const apiId = idMatch ? Number(idMatch[1]) : Number.NaN;

  return Number.isFinite(apiId) ? apiId : null;
}

export function cloneSelectionState(selection: ReturnType<typeof createEmptyDesktopScheduleSelectionState>) {
  return {
    rowIds: [...selection.rowIds],
    itemIds: [...selection.itemIds],
    workConnectionIds: [...selection.workConnectionIds],
    criticalPathIds: [...selection.criticalPathIds],
    groupIds: [...selection.groupIds],
    milestoneIds: [...selection.milestoneIds],
  };
}

export function hasDateOrLayoutChange(baseItem: DesktopScheduleItem, nextItem: DesktopScheduleItem) {
  return (
    baseItem.startDate !== nextItem.startDate ||
    baseItem.durationDays !== nextItem.durationDays
  );
}

export function hasWorkConnectionGapChange(
  baseWorkConnection: DesktopScheduleWorkConnection,
  nextWorkConnection: DesktopScheduleWorkConnection,
) {
  return baseWorkConnection.gapDays !== nextWorkConnection.gapDays;
}

type ScheduleVersionReviewWorkPair = {
  baseline: DesktopScheduleItem;
  draft: DesktopScheduleItem;
};

type ScheduleVersionReviewWorkMatch = {
  pairs: ScheduleVersionReviewWorkPair[];
  baselineByDraftWorkId: Map<number, DesktopScheduleItem>;
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>;
  unmatchedBaselineItems: DesktopScheduleItem[];
  unmatchedDraftItems: DesktopScheduleItem[];
};

type ScheduleVersionReviewConnectionEntity = {
  id: string;
  pathId: number;
  sourceWorkId: number;
  targetWorkId: number;
  gapDays: number;
  sourceName: string;
  targetName: string;
};

export function createScheduleVersionReviewCounts(
  details: DesktopScheduleVersionReviewDetail[],
): DesktopScheduleVersionReviewCount[] {
  return (Object.keys(SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS) as DesktopScheduleVersionReviewCategory[])
    .map((category) => ({
      category,
      label: SCHEDULE_VERSION_REVIEW_CATEGORY_LABELS[category],
      count: details.filter((detail) => detail.category === category).length,
    }));
}

function createScheduleVersionReviewDetail(
  category: DesktopScheduleVersionReviewCategory,
  id: string,
  kindLabel: string,
  title: string,
  description: string,
): DesktopScheduleVersionReviewDetail {
  return {
    id,
    category,
    kindLabel,
    title,
    description,
  };
}

function createEmptyScheduleVersionReviewVisualSummary(): DesktopScheduleVersionReviewVisualSummary {
  return {
    addedItemIds: [],
    changedItemIds: [],
    addedWorkConnectionIds: [],
    changedWorkConnectionIds: [],
    addedMilestoneIds: [],
    changedMilestoneIds: [],
    baselineBarOverlays: [],
    baselineMilestoneOverlays: [],
    baselineConnectionOverlays: [],
  };
}

function buildScheduleVersionReviewConnectionGeometry(
  sourceBar: DesktopScheduleShellLayout["bars"][number],
  targetBar: DesktopScheduleShellLayout["bars"][number],
) {
  const sourceX = sourceBar.left + sourceBar.width;
  const sourceY = sourceBar.top + sourceBar.height / 2;
  const targetX = targetBar.left;
  const targetY = targetBar.top + targetBar.height / 2;

  function buildRoundedOrthogonalPath(points: Array<{ x: number; y: number }>, cornerRadius = 10) {
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

export function createDesktopScheduleVersionReviewVisualSummary(
  baselineLayout: DesktopScheduleShellLayout,
  currentLayout: DesktopScheduleShellLayout,
): DesktopScheduleVersionReviewVisualSummary {
  const visual = createEmptyScheduleVersionReviewVisualSummary();
  const baselineRowById = new Map(baselineLayout.rows.map((row) => [row.id, row] as const));
  const currentRowById = new Map(currentLayout.rows.map((row) => [row.id, row] as const));
  const rebasedBaselineBarByItemId = new Map<string, DesktopScheduleShellLayout["bars"][number]>();

  function rebaseTop(rowId: string, top: number) {
    const baselineRow = baselineRowById.get(rowId);
    const currentRow = currentRowById.get(rowId);

    if (!baselineRow || !currentRow) {
      return top;
    }

    return currentRow.top + (top - baselineRow.top);
  }

  baselineLayout.bars
    .filter((bar) => bar.kind === "item")
    .forEach((bar) => {
      const rebasedBar = {
        ...bar,
        top: rebaseTop(bar.rowId, bar.top),
      };

      rebasedBaselineBarByItemId.set(bar.itemId, rebasedBar);
      visual.baselineBarOverlays.push({
        id: `review-bar:baseline:${bar.itemId}`,
        changeKind: "changed",
        itemId: bar.itemId,
        name: bar.name,
        colorHex: bar.colorHex,
        left: bar.left,
        top: rebasedBar.top,
        width: bar.width,
        height: bar.height,
      });
    });
  baselineLayout.connections
    .filter((connection) => connection.kind === "work-connection")
    .forEach((connection) => {
      const sourceBar = rebasedBaselineBarByItemId.get(connection.sourceItemId);
      const targetBar = rebasedBaselineBarByItemId.get(connection.targetItemId);

      if (!sourceBar || !targetBar) {
        return;
      }

      const geometry = buildScheduleVersionReviewConnectionGeometry(sourceBar, targetBar);

      visual.baselineConnectionOverlays.push({
        id: `review-connection:baseline:${connection.id}`,
        changeKind: "changed",
        connectionId: connection.id,
        path: geometry.path,
        label: connection.label,
        labelX: geometry.labelX,
        labelY: geometry.labelY,
      });
    });
  baselineLayout.milestones.forEach((milestone) => {
    const milestoneRow =
      baselineLayout.rows.find((row) => row.kind === "milestone") ?? baselineLayout.rows[0] ?? null;
    const rebasedTop = milestoneRow ? rebaseTop(milestoneRow.id, milestone.top) : milestone.top;

    visual.baselineMilestoneOverlays.push({
      id: `review-milestone:baseline:${milestone.id}`,
      changeKind: "changed",
      milestoneId: milestone.id,
      label: milestone.label,
      left: milestone.left,
      top: rebasedTop,
      width: milestone.width,
      height: milestone.height,
      labelWidth: milestone.labelWidth,
    });
  });

  return visual;
}

function formatReviewDate(date: string) {
  return date.replace(/-/g, ".");
}

function formatReviewDateRange(item: DesktopScheduleItem) {
  return `${formatReviewDate(item.startDate)} - ${formatReviewDate(item.endDate)}`;
}

function formatReviewGapDays(gapDays: number) {
  return `${gapDays > 0 ? "+" : ""}${gapDays}일`;
}

function getItemProcessLabel(item: DesktopScheduleItem) {
  return [item.workType, item.subWorkType].filter(Boolean).join(" / ") || "공종 미지정";
}

function normalizeReviewSignaturePart(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function getItemProcessSignature(item: DesktopScheduleItem) {
  return [
    normalizeReviewSignaturePart(item.division),
    normalizeReviewSignaturePart(item.workType),
    normalizeReviewSignaturePart(item.subWorkType),
  ].join("|");
}

export function getRowProcessSignature(row: DesktopScheduleRow) {
  const division = row.source.division;
  const workType = row.source.workType;
  const subWorkType = row.source.subWorkType || row.name;

  if (!division && !workType && !subWorkType) {
    return null;
  }

  return [
    normalizeReviewSignaturePart(division),
    normalizeReviewSignaturePart(workType),
    normalizeReviewSignaturePart(subWorkType),
  ].join("|");
}

function getItemSignature(item: DesktopScheduleItem, mode: "exact" | "lane" | "nameRow") {
  const processSignature = getItemProcessSignature(item);

  if (mode === "exact") {
    return [
      item.name,
      processSignature,
      item.startDate,
      item.endDate,
      item.durationDays,
      item.positionY,
    ].join("|");
  }

  if (mode === "lane") {
    return [processSignature, item.positionY].join("|");
  }

  return [item.name, processSignature].join("|");
}

function createUniqueItemSignatureMap(
  items: DesktopScheduleItem[],
  getSignature: (item: DesktopScheduleItem) => string,
) {
  const groupedItems = new Map<string, DesktopScheduleItem[]>();

  for (const item of items) {
    const signature = getSignature(item);
    groupedItems.set(signature, [...(groupedItems.get(signature) ?? []), item]);
  }

  const uniqueItems = new Map<string, DesktopScheduleItem>();

  for (const [signature, signatureItems] of groupedItems.entries()) {
    if (signatureItems.length === 1) {
      uniqueItems.set(signature, signatureItems[0]!);
    }
  }

  return uniqueItems;
}

function createScheduleVersionReviewWorkMatch(
  baselineItems: DesktopScheduleItem[],
  draftItems: DesktopScheduleItem[],
): ScheduleVersionReviewWorkMatch {
  const pairs: ScheduleVersionReviewWorkPair[] = [];
  const pairedBaselineWorkIds = new Set<number>();
  const pairedDraftWorkIds = new Set<number>();
  const baselineByDraftWorkId = new Map<number, DesktopScheduleItem>();
  const draftByBaselineWorkId = new Map<number, DesktopScheduleItem>();

  function pairItems(baseline: DesktopScheduleItem, draft: DesktopScheduleItem) {
    if (pairedBaselineWorkIds.has(baseline.workId) || pairedDraftWorkIds.has(draft.workId)) {
      return;
    }

    pairedBaselineWorkIds.add(baseline.workId);
    pairedDraftWorkIds.add(draft.workId);
    baselineByDraftWorkId.set(draft.workId, baseline);
    draftByBaselineWorkId.set(baseline.workId, draft);
    pairs.push({ baseline, draft });
  }

  const draftItemByWorkId = new Map(draftItems.map((item) => [item.workId, item] as const));

  for (const baselineItem of baselineItems) {
    const draftItem = draftItemByWorkId.get(baselineItem.workId);

    if (draftItem) {
      pairItems(baselineItem, draftItem);
    }
  }

  for (const mode of ["exact", "lane", "nameRow"] as const) {
    const unmatchedBaseline = baselineItems.filter(
      (item) => !pairedBaselineWorkIds.has(item.workId),
    );
    const unmatchedDraft = draftItems.filter((item) => !pairedDraftWorkIds.has(item.workId));
    const baselineBySignature = createUniqueItemSignatureMap(unmatchedBaseline, (item) =>
      getItemSignature(item, mode),
    );
    const draftBySignature = createUniqueItemSignatureMap(unmatchedDraft, (item) =>
      getItemSignature(item, mode),
    );

    for (const [signature, baselineItem] of baselineBySignature.entries()) {
      const draftItem = draftBySignature.get(signature);

      if (draftItem) {
        pairItems(baselineItem, draftItem);
      }
    }
  }

  return {
    pairs,
    baselineByDraftWorkId,
    draftByBaselineWorkId,
    unmatchedBaselineItems: baselineItems.filter(
      (item) => !pairedBaselineWorkIds.has(item.workId),
    ),
    unmatchedDraftItems: draftItems.filter((item) => !pairedDraftWorkIds.has(item.workId)),
  };
}

function createWorkChangeDescription(
  baseline: DesktopScheduleItem,
  draft: DesktopScheduleItem,
) {
  const changes: string[] = [];

  if (baseline.name !== draft.name) {
    changes.push(`이름: ${baseline.name} -> ${draft.name}`);
  }

  if (
    baseline.startDate !== draft.startDate ||
    baseline.endDate !== draft.endDate ||
    baseline.durationDays !== draft.durationDays
  ) {
    changes.push(`날짜/기간: ${formatReviewDateRange(baseline)} -> ${formatReviewDateRange(draft)}`);
  }

  if (getItemProcessSignature(baseline) !== getItemProcessSignature(draft)) {
    changes.push(`row 이동: ${getItemProcessLabel(baseline)} -> ${getItemProcessLabel(draft)}`);
  }

  if (baseline.positionY !== draft.positionY) {
    changes.push(`줄 위치: ${baseline.positionY + 1} -> ${draft.positionY + 1}`);
  }

  return changes;
}

function getWorkChangeKindLabel(baseline: DesktopScheduleItem, draft: DesktopScheduleItem) {
  if (getItemProcessSignature(baseline) !== getItemProcessSignature(draft)) {
    return "row 이동";
  }

  if (
    baseline.startDate !== draft.startDate ||
    baseline.endDate !== draft.endDate ||
    baseline.durationDays !== draft.durationDays
  ) {
    return "날짜/기간";
  }

  if (baseline.name !== draft.name) {
    return "이름 변경";
  }

  return "줄 변경";
}

function createConnectionEntity(
  connection: DesktopScheduleWorkConnection,
  itemById: Map<string, DesktopScheduleItem>,
): ScheduleVersionReviewConnectionEntity | null {
  const sourceItem = itemById.get(connection.sourceItemId);
  const targetItem = itemById.get(connection.targetItemId);

  if (!sourceItem || !targetItem) {
    return null;
  }

  return {
    id: connection.id,
    pathId: connection.pathId,
    sourceWorkId: sourceItem.workId,
    targetWorkId: targetItem.workId,
    gapDays: connection.gapDays,
    sourceName: sourceItem.name,
    targetName: targetItem.name,
  };
}

function createConnectionTitle(connection: ScheduleVersionReviewConnectionEntity) {
  return `${connection.sourceName} -> ${connection.targetName}`;
}

function createConnectionChangeDescription(
  baseline: ScheduleVersionReviewConnectionEntity,
  draft: ScheduleVersionReviewConnectionEntity,
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>,
) {
  const changes: string[] = [];
  const expectedDraftSourceWorkId =
    draftByBaselineWorkId.get(baseline.sourceWorkId)?.workId ?? baseline.sourceWorkId;
  const expectedDraftTargetWorkId =
    draftByBaselineWorkId.get(baseline.targetWorkId)?.workId ?? baseline.targetWorkId;

  if (expectedDraftSourceWorkId !== draft.sourceWorkId) {
    changes.push(`선행: ${baseline.sourceName} -> ${draft.sourceName}`);
  }

  if (expectedDraftTargetWorkId !== draft.targetWorkId) {
    changes.push(`후행: ${baseline.targetName} -> ${draft.targetName}`);
  }

  if (baseline.gapDays !== draft.gapDays) {
    changes.push(`간격: ${formatReviewGapDays(baseline.gapDays)} -> ${formatReviewGapDays(draft.gapDays)}`);
  }

  return changes;
}

function getConnectionChangeKindLabel(
  baseline: ScheduleVersionReviewConnectionEntity,
  draft: ScheduleVersionReviewConnectionEntity,
  draftByBaselineWorkId: Map<number, DesktopScheduleItem>,
) {
  const expectedDraftSourceWorkId =
    draftByBaselineWorkId.get(baseline.sourceWorkId)?.workId ?? baseline.sourceWorkId;
  const expectedDraftTargetWorkId =
    draftByBaselineWorkId.get(baseline.targetWorkId)?.workId ?? baseline.targetWorkId;

  if (
    expectedDraftSourceWorkId !== draft.sourceWorkId ||
    expectedDraftTargetWorkId !== draft.targetWorkId
  ) {
    return "선후행 변경";
  }

  return "간격 변경";
}

function createConnectionComparisonKey(
  connection: ScheduleVersionReviewConnectionEntity,
  getWorkKey: (workId: number) => string,
) {
  return `${getWorkKey(connection.sourceWorkId)}->${getWorkKey(connection.targetWorkId)}`;
}

function getMilestoneSignature(
  milestone: DesktopScheduleMilestone,
  mode: "exact" | "label" | "date",
) {
  const label = normalizeReviewSignaturePart(milestone.label);

  if (mode === "exact") {
    return `${label}|${milestone.date}`;
  }

  return mode === "label" ? label : milestone.date;
}

function createUniqueMilestoneSignatureMap(
  milestones: DesktopScheduleMilestone[],
  getSignature: (milestone: DesktopScheduleMilestone) => string,
) {
  const groupedMilestones = new Map<string, DesktopScheduleMilestone[]>();

  for (const milestone of milestones) {
    const signature = getSignature(milestone);
    groupedMilestones.set(signature, [...(groupedMilestones.get(signature) ?? []), milestone]);
  }

  const uniqueMilestones = new Map<string, DesktopScheduleMilestone>();

  for (const [signature, signatureMilestones] of groupedMilestones.entries()) {
    if (signatureMilestones.length === 1) {
      uniqueMilestones.set(signature, signatureMilestones[0]);
    }
  }

  return uniqueMilestones;
}

function createScheduleVersionReviewMilestoneMatch(
  baselineMilestones: DesktopScheduleMilestone[],
  draftMilestones: DesktopScheduleMilestone[],
) {
  const pairs: Array<{ baseline: DesktopScheduleMilestone; draft: DesktopScheduleMilestone }> = [];
  const pairedBaselineMilestoneIds = new Set<string>();
  const pairedDraftMilestoneIds = new Set<string>();

  function pairMilestones(baseline: DesktopScheduleMilestone, draft: DesktopScheduleMilestone) {
    if (
      pairedBaselineMilestoneIds.has(baseline.id) ||
      pairedDraftMilestoneIds.has(draft.id)
    ) {
      return;
    }

    pairedBaselineMilestoneIds.add(baseline.id);
    pairedDraftMilestoneIds.add(draft.id);
    pairs.push({ baseline, draft });
  }

  const draftMilestoneByApiId = new Map(
    draftMilestones
      .map((milestone) => [getMilestoneApiId(milestone), milestone] as const)
      .filter(
        (entry): entry is [number, DesktopScheduleMilestone] => typeof entry[0] === "number",
      ),
  );

  for (const baselineMilestone of baselineMilestones) {
    const baselineApiId = getMilestoneApiId(baselineMilestone);
    const draftMilestone =
      baselineApiId === null ? undefined : draftMilestoneByApiId.get(baselineApiId);

    if (draftMilestone) {
      pairMilestones(baselineMilestone, draftMilestone);
    }
  }

  for (const mode of ["exact", "label", "date"] as const) {
    const unmatchedBaseline = baselineMilestones.filter(
      (milestone) => !pairedBaselineMilestoneIds.has(milestone.id),
    );
    const unmatchedDraft = draftMilestones.filter(
      (milestone) => !pairedDraftMilestoneIds.has(milestone.id),
    );
    const baselineBySignature = createUniqueMilestoneSignatureMap(unmatchedBaseline, (milestone) =>
      getMilestoneSignature(milestone, mode),
    );
    const draftBySignature = createUniqueMilestoneSignatureMap(unmatchedDraft, (milestone) =>
      getMilestoneSignature(milestone, mode),
    );

    for (const [signature, baselineMilestone] of baselineBySignature.entries()) {
      const draftMilestone = draftBySignature.get(signature);

      if (draftMilestone) {
        pairMilestones(baselineMilestone, draftMilestone);
      }
    }
  }

  return {
    pairs,
    unmatchedBaselineMilestones: baselineMilestones.filter(
      (milestone) => !pairedBaselineMilestoneIds.has(milestone.id),
    ),
    unmatchedDraftMilestones: draftMilestones.filter(
      (milestone) => !pairedDraftMilestoneIds.has(milestone.id),
    ),
  };
}

function createMilestoneChangeDescription(
  baseline: DesktopScheduleMilestone,
  draft: DesktopScheduleMilestone,
) {
  const changes: string[] = [];

  if (baseline.label !== draft.label) {
    changes.push(`이름: ${baseline.label} -> ${draft.label}`);
  }

  if (baseline.date !== draft.date) {
    changes.push(`날짜: ${formatReviewDate(baseline.date)} -> ${formatReviewDate(draft.date)}`);
  }

  return changes;
}

function getMilestoneChangeKindLabel(
  baseline: DesktopScheduleMilestone,
  draft: DesktopScheduleMilestone,
) {
  if (baseline.date !== draft.date && baseline.label === draft.label) {
    return "이동";
  }

  if (baseline.label !== draft.label && baseline.date === draft.date) {
    return "이름 변경";
  }

  return "변경";
}

export function createDesktopScheduleVersionReviewSummary(
  baselineSnapshot: DesktopScheduleSnapshot,
  draftSnapshot: {
    items: DesktopScheduleItem[];
    workConnections: DesktopScheduleWorkConnection[];
    milestones: DesktopScheduleMilestone[];
  },
  baselineVersionName: string,
  draftVersionName: string,
): DesktopScheduleVersionReviewSummary {
  const details: DesktopScheduleVersionReviewDetail[] = [];
  const workMatch = createScheduleVersionReviewWorkMatch(
    baselineSnapshot.items,
    draftSnapshot.items,
  );

  for (const item of workMatch.unmatchedDraftItems) {
    details.push(
      createScheduleVersionReviewDetail(
        "workAdded",
        `work-added:${item.workId}`,
        "생성",
        item.name,
        `${getItemProcessLabel(item)} · ${formatReviewDateRange(item)}`,
      ),
    );
  }

  for (const item of workMatch.unmatchedBaselineItems) {
    details.push(
      createScheduleVersionReviewDetail(
        "workDeleted",
        `work-deleted:${item.workId}`,
        "삭제",
        item.name,
        `${getItemProcessLabel(item)} · ${formatReviewDateRange(item)}`,
      ),
    );
  }

  for (const { baseline, draft } of workMatch.pairs) {
    const changes = createWorkChangeDescription(baseline, draft);

    if (changes.length > 0) {
      details.push(
        createScheduleVersionReviewDetail(
          "workChanged",
          `work-changed:${baseline.workId}:${draft.workId}`,
          getWorkChangeKindLabel(baseline, draft),
          draft.name,
          changes.join(" · "),
        ),
      );
    }
  }

  const baselineItemById = new Map(baselineSnapshot.items.map((item) => [item.id, item] as const));
  const draftItemById = new Map(draftSnapshot.items.map((item) => [item.id, item] as const));
  const baselineConnections = baselineSnapshot.workConnections
    .map((connection) => createConnectionEntity(connection, baselineItemById))
    .filter(
      (connection): connection is ScheduleVersionReviewConnectionEntity => connection !== null,
    );
  const draftConnections = draftSnapshot.workConnections
    .map((connection) => createConnectionEntity(connection, draftItemById))
    .filter(
      (connection): connection is ScheduleVersionReviewConnectionEntity => connection !== null,
    );
  const pairedBaselineConnectionIds = new Set<string>();
  const pairedDraftConnectionIds = new Set<string>();
  const draftConnectionByPathId = new Map(
    draftConnections.map((connection) => [connection.pathId, connection] as const),
  );

  function addConnectionChangeDetail(
    baselineConnection: ScheduleVersionReviewConnectionEntity,
    draftConnection: ScheduleVersionReviewConnectionEntity,
  ) {
    const changes = createConnectionChangeDescription(
      baselineConnection,
      draftConnection,
      workMatch.draftByBaselineWorkId,
    );

    if (changes.length === 0) {
      return;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-changed:${baselineConnection.id}:${draftConnection.id}`,
        getConnectionChangeKindLabel(
          baselineConnection,
          draftConnection,
          workMatch.draftByBaselineWorkId,
        ),
        createConnectionTitle(draftConnection),
        changes.join(" · "),
      ),
    );
  }

  for (const baselineConnection of baselineConnections) {
    const draftConnection = draftConnectionByPathId.get(baselineConnection.pathId);

    if (!draftConnection) {
      continue;
    }

    pairedBaselineConnectionIds.add(baselineConnection.id);
    pairedDraftConnectionIds.add(draftConnection.id);
    addConnectionChangeDetail(baselineConnection, draftConnection);
  }

  const baselineConnectionByKey = new Map<string, ScheduleVersionReviewConnectionEntity>();
  const draftConnectionByKey = new Map<string, ScheduleVersionReviewConnectionEntity>();

  for (const baselineConnection of baselineConnections) {
    if (pairedBaselineConnectionIds.has(baselineConnection.id)) {
      continue;
    }

    baselineConnectionByKey.set(
      createConnectionComparisonKey(baselineConnection, (workId) => {
        const draftItem = workMatch.draftByBaselineWorkId.get(workId);
        return draftItem ? `draft:${draftItem.workId}` : `baseline:${workId}`;
      }),
      baselineConnection,
    );
  }

  for (const draftConnection of draftConnections) {
    if (pairedDraftConnectionIds.has(draftConnection.id)) {
      continue;
    }

    draftConnectionByKey.set(
      createConnectionComparisonKey(draftConnection, (workId) => `draft:${workId}`),
      draftConnection,
    );
  }

  for (const [key, baselineConnection] of baselineConnectionByKey.entries()) {
    const draftConnection = draftConnectionByKey.get(key);

    if (!draftConnection) {
      continue;
    }

    pairedBaselineConnectionIds.add(baselineConnection.id);
    pairedDraftConnectionIds.add(draftConnection.id);
    addConnectionChangeDetail(baselineConnection, draftConnection);
  }

  for (const draftConnection of draftConnections) {
    if (pairedDraftConnectionIds.has(draftConnection.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-added:${draftConnection.id}`,
        "생성",
        createConnectionTitle(draftConnection),
        `간격 ${formatReviewGapDays(draftConnection.gapDays)} 작업 연결이 추가됐어요.`,
      ),
    );
  }

  for (const baselineConnection of baselineConnections) {
    if (pairedBaselineConnectionIds.has(baselineConnection.id)) {
      continue;
    }

    details.push(
      createScheduleVersionReviewDetail(
        "connectionChanged",
        `connection-deleted:${baselineConnection.id}`,
        "삭제",
        createConnectionTitle(baselineConnection),
        `간격 ${formatReviewGapDays(baselineConnection.gapDays)} 작업 연결이 삭제됐어요.`,
      ),
    );
  }

  const milestoneMatch = createScheduleVersionReviewMilestoneMatch(
    baselineSnapshot.milestones,
    draftSnapshot.milestones,
  );

  for (const { baseline: baselineMilestone, draft: draftMilestone } of milestoneMatch.pairs) {
    const changes = createMilestoneChangeDescription(baselineMilestone, draftMilestone);

    if (changes.length > 0) {
      details.push(
        createScheduleVersionReviewDetail(
          "milestoneChanged",
          `milestone-changed:${baselineMilestone.id}:${draftMilestone.id}`,
          getMilestoneChangeKindLabel(baselineMilestone, draftMilestone),
          draftMilestone.label,
          changes.join(" · "),
        ),
      );
    }
  }

  for (const draftMilestone of milestoneMatch.unmatchedDraftMilestones) {
    details.push(
      createScheduleVersionReviewDetail(
        "milestoneChanged",
        `milestone-added:${draftMilestone.id}`,
        "생성",
        draftMilestone.label,
        `${formatReviewDate(draftMilestone.date)} 마일스톤이 추가됐어요.`,
      ),
    );
  }

  for (const baselineMilestone of milestoneMatch.unmatchedBaselineMilestones) {
    details.push(
      createScheduleVersionReviewDetail(
        "milestoneChanged",
        `milestone-deleted:${baselineMilestone.id}`,
        "삭제",
        baselineMilestone.label,
        `${formatReviewDate(baselineMilestone.date)} 마일스톤이 삭제됐어요.`,
      ),
    );
  }

  const counts = createScheduleVersionReviewCounts(details);

  return {
    baselineVersionName,
    draftVersionName,
    generatedAt: new Date().toISOString(),
    totalCount: details.length,
    counts,
    details,
  };
}
