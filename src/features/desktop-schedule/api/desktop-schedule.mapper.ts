import type {
  DesktopScheduleBootstrapData,
  DesktopScheduleMilestoneResponse,
  DesktopScheduleWorkDepResponse,
  DesktopScheduleWorkResponse,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";
import type {
  DesktopScheduleItem,
  DesktopScheduleMilestone,
  DesktopScheduleSnapshot,
  DesktopScheduleSourceBundle,
  DesktopScheduleSourceTask,
  DesktopScheduleWorkConnection,
} from "@/features/desktop-schedule/model/desktop-schedule.types";
import { desktopScheduleService } from "@/features/desktop-schedule/services/desktop-schedule.service";

const WORK_CONNECTION_COLOR = "#64748b";

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function diffDays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getDurationDays(work: DesktopScheduleWorkResponse) {
  if (work.workLeadTime > 0) {
    return work.workLeadTime;
  }

  return Math.max(diffDays(work.startDate, work.completionDate) + 1, 1);
}

function getComponentTypeIds(work: DesktopScheduleWorkResponse) {
  return (work.componentTypes ?? []).flatMap(
    (componentTypeGroup) => componentTypeGroup.componentTypeIds ?? [],
  );
}

function mapWorkToSourceTask(
  work: DesktopScheduleWorkResponse,
  index: number,
  hierarchyBySubWorkTypeId: Map<number, DesktopScheduleBootstrapData["workHierarchy"][number]>,
): DesktopScheduleSourceTask {
  const hierarchyItem = hierarchyBySubWorkTypeId.get(work.subWorkTypeId);
  const division = work.division || "미분류";
  const workType = work.workType || "미분류 공정";
  const subWorkType = work.subWorkType || "세부공정 미분류";

  return {
    workId: work.workId,
    name: work.workName || subWorkType,
    startDate: work.startDate,
    endDate: work.completionDate,
    durationDays: getDurationDays(work),
    division,
    divisionId: hierarchyItem?.divisionId,
    workType,
    workTypeId: hierarchyItem?.workTypeId,
    subWorkType,
    subWorkTypeId: work.subWorkTypeId,
    positionY: work.positionY ?? index,
    isWorkingOnHoliday: work.isWorkingOnHoliday,
    annotation: work.annotation ?? "",
    zoneIds: [...(work.zoneIds ?? [])],
    floorIds: [...(work.floorIds ?? [])],
    componentTypeIds: getComponentTypeIds(work),
  };
}

function mapWorkDepToConnection(
  workDep: DesktopScheduleWorkDepResponse,
  itemByWorkId: Map<number, DesktopScheduleItem>,
): DesktopScheduleWorkConnection | null {
  const sourceItem = itemByWorkId.get(workDep.sourceWorkId);
  const targetItem = itemByWorkId.get(workDep.targetWorkId);

  if (!sourceItem || !targetItem) {
    return null;
  }

  return {
    id: `work-connection:${workDep.id}`,
    pathId: workDep.id,
    sourceItemId: sourceItem.id,
    targetItemId: targetItem.id,
    gapDays: workDep.lagDays,
    pathName: null,
    color: WORK_CONNECTION_COLOR,
  } satisfies DesktopScheduleWorkConnection;
}

function mapMilestoneToModel(milestone: DesktopScheduleMilestoneResponse): DesktopScheduleMilestone {
  return {
    id: `milestone:${milestone.id}`,
    apiId: milestone.id,
    date: milestone.date,
    label: milestone.name,
    rowId: null,
  };
}

export function createDesktopScheduleSnapshotFromApiData(
  data: DesktopScheduleBootstrapData,
): DesktopScheduleSnapshot {
  const hierarchyBySubWorkTypeId = new Map(
    data.workHierarchy.map((item) => [item.subWorkTypeId, item] as const),
  );
  const sourceBundle: DesktopScheduleSourceBundle = {
    source: "work-api",
    rows: data.workHierarchy.map((item) => ({
      divisionId: item.divisionId,
      division: item.divisionName,
      workTypeId: item.workTypeId,
      workType: item.workTypeName,
      isStructure: item.isStructure,
      subWorkTypeId: item.subWorkTypeId,
      subWorkType: item.subWorkTypeName,
      colorHex: item.subWorkTypeColor ?? null,
    })),
    tasks: data.works.map((work, index) =>
      mapWorkToSourceTask(work, index, hierarchyBySubWorkTypeId),
    ),
  };
  const milestones = (data.milestones ?? []).map(mapMilestoneToModel);
  const snapshot = desktopScheduleService.buildSnapshot(sourceBundle, milestones);
  const itemByWorkId = new Map(snapshot.items.map((item) => [item.workId, item] as const));
  const workConnections = data.workDeps
    .map((workDep) => mapWorkDepToConnection(workDep, itemByWorkId))
    .filter((workConnection): workConnection is DesktopScheduleWorkConnection => !!workConnection);
  const nextSnapshot = {
    ...snapshot,
    workConnections,
    metadata: {
      ...snapshot.metadata,
      workCount: snapshot.items.length,
    },
  };

  console.log("[DesktopSchedule Mapper] mapped API data to chart snapshot", {
    sourceBundle,
    rows: nextSnapshot.rows,
    items: nextSnapshot.items,
    workConnections,
    milestones: nextSnapshot.milestones,
    metadata: nextSnapshot.metadata,
    counts: {
      sourceTasks: sourceBundle.tasks.length,
      rows: nextSnapshot.rows.length,
      items: nextSnapshot.items.length,
      workConnections: workConnections.length,
      milestones: nextSnapshot.milestones.length,
    },
  });

  return nextSnapshot;
}
