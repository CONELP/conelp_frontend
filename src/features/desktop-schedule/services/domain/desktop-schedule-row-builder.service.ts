import type {
  DesktopScheduleRow,
  DesktopScheduleSourceRow,
  DesktopScheduleSourceTask,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

export interface ChildRowDraft {
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

export interface DivisionRowDraft {
  id: string;
  name: string;
  divisionId?: number;
  division: string;
  minPositionY: number;
}

export interface WorkTypeRowDraft {
  id: string;
  name: string;
  divisionId?: number;
  division: string;
  workTypeId?: number;
  workType: string;
  minPositionY: number;
}

export function toStableIdPart(value: string) {
  return encodeURIComponent(value.trim().toLowerCase() || "unclassified");
}

export function makeParentRowId(workType: string) {
  return `parent:${toStableIdPart(workType)}`;
}

export function makeDivisionShellRowId(division: string) {
  return `division:${toStableIdPart(division)}`;
}

export function makeReferenceDivisionRowId(divisionId: number | undefined, division: string) {
  return divisionId
    ? `reference-division:${divisionId}`
    : `reference-${makeDivisionShellRowId(division)}`;
}

export function makeReferenceWorkTypeRowId(
  workTypeId: number | undefined,
  division: string,
  workType: string,
) {
  return workTypeId
    ? `reference-work-type:${workTypeId}`
    : `reference-${makeChildRowId(division, workType, 0, "")}`;
}

export function makeChildRowId(
  division: string,
  workType: string,
  subWorkTypeId: number,
  subWorkType: string,
) {
  const subPart = subWorkTypeId > 0 ? String(subWorkTypeId) : toStableIdPart(subWorkType);

  return `child:${toStableIdPart(division)}:${toStableIdPart(workType)}:${subPart}`;
}

export function compareByPosition(
  a: { minPositionY: number },
  b: { minPositionY: number },
) {
  return a.minPositionY - b.minPositionY;
}

export function compareTasks(a: DesktopScheduleSourceTask, b: DesktopScheduleSourceTask) {
  return (
    a.positionY - b.positionY ||
    a.workType.localeCompare(b.workType, "ko") ||
    a.subWorkType.localeCompare(b.subWorkType, "ko") ||
    a.name.localeCompare(b.name, "ko") ||
    a.workId - b.workId
  );
}

export function upsertChildDraft(
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

export function upsertDivisionDraft(
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

export function makeWorkTypeDraftKey(
  divisionId: number | undefined,
  division: string,
  workTypeId: number | undefined,
  workType: string,
) {
  const divisionIdKey = divisionId === undefined ? "name" : String(divisionId);
  const workTypeIdKey = workTypeId === undefined ? "name" : String(workTypeId);
  return `${divisionIdKey}:${toStableIdPart(division)}:${workTypeIdKey}:${toStableIdPart(workType)}`;
}

export function upsertWorkTypeDraft(
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

export function buildRows(tasks: DesktopScheduleSourceTask[], sourceRows: DesktopScheduleSourceRow[] = []) {
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
