import { apiFetch, apiFetchAttachment } from "@/shared/network/api-client";
import type {
  DesktopScheduleBootstrapData,
  DesktopScheduleBootstrapOptions,
  DesktopScheduleCalendarResponse,
  DesktopScheduleDivisionCreateRequest,
  DesktopScheduleDivisionId,
  DesktopScheduleDivisionResponse,
  DesktopScheduleMilestoneCreateRequest,
  DesktopScheduleMilestoneId,
  DesktopScheduleMilestoneResponse,
  DesktopScheduleMilestoneUpdateRequest,
  DesktopScheduleMutationResponse,
  DesktopScheduleProjectId,
  DesktopScheduleProjectResponse,
  DesktopScheduleReferenceHierarchyItem,
  DesktopScheduleReferenceUpdateRequest,
  DesktopScheduleSubWorkTypeCreateRequest,
  DesktopScheduleSubWorkTypeId,
  DesktopScheduleSubWorkTypeResponse,
  DesktopScheduleExportRequest,
  DesktopScheduleVersionCreateRequest,
  DesktopScheduleVersionId,
  DesktopScheduleVersionResponse,
  DesktopScheduleVersionUpdateRequest,
  DesktopScheduleWorkCreateRequest,
  DesktopScheduleWorkDepCreateRequest,
  DesktopScheduleWorkDepId,
  DesktopScheduleWorkDepResponse,
  DesktopScheduleWorkDepUpdateRequest,
  DesktopScheduleWorkId,
  DesktopScheduleWorkPeriodQuery,
  DesktopScheduleWorkResponse,
  DesktopScheduleWorkTypeCreateRequest,
  DesktopScheduleWorkTypeId,
  DesktopScheduleWorkTypeResponse,
  DesktopScheduleWorkUpdateRequest,
} from "@/features/desktop-schedule/api/desktop-schedule-api.types";

const SELECTED_PROJECT_ID_STORAGE_KEY = "selectedProjectId";
const SELECTED_SCHEDULE_VERSION_ID_STORAGE_KEY = "selectedScheduleVersionId";

export class DesktopScheduleApiError extends Error {
  code: "NO_PROJECT" | "NO_PROJECT_ID" | "NO_MAIN_SCHEDULE_VERSION";

  constructor(code: DesktopScheduleApiError["code"], message: string) {
    super(message);
    this.name = "DesktopScheduleApiError";
    this.code = code;
  }
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function encodePathSegment(value: string | number) {
  return encodeURIComponent(String(value));
}

function toApiBody<TRequest extends object>(body: TRequest): Record<string, unknown> {
  return body as unknown as Record<string, unknown>;
}

type RawDesktopScheduleProjectResponse = DesktopScheduleProjectResponse & {
  projectId?: DesktopScheduleProjectId;
};

const EMPTY_SCHEDULE_VERSION_NAME = "빈 공정표";

function normalizeProjectResponse(
  project: RawDesktopScheduleProjectResponse,
): DesktopScheduleProjectResponse {
  const projectId = project.id ?? project.projectId;

  if (!projectId || projectId === "undefined" || projectId === "null") {
    throw new DesktopScheduleApiError(
      "NO_PROJECT_ID",
      "프로젝트 목록 응답에 프로젝트 ID가 없습니다.",
    );
  }

  return {
    ...project,
    id: projectId,
  };
}

export function getSelectedDesktopScheduleProjectId() {
  return localStorage.getItem(SELECTED_PROJECT_ID_STORAGE_KEY);
}

export function setSelectedDesktopScheduleProjectId(projectId: DesktopScheduleProjectId) {
  localStorage.setItem(SELECTED_PROJECT_ID_STORAGE_KEY, projectId);
}

export function clearSelectedDesktopScheduleProjectId() {
  localStorage.removeItem(SELECTED_PROJECT_ID_STORAGE_KEY);
}

export function getSelectedDesktopScheduleVersionId(): DesktopScheduleVersionId | null {
  const stored = localStorage.getItem(SELECTED_SCHEDULE_VERSION_ID_STORAGE_KEY);

  if (!stored || stored === "undefined" || stored === "null") {
    return null;
  }

  const parsed = Number.parseInt(stored, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setSelectedDesktopScheduleVersionId(versionId: DesktopScheduleVersionId) {
  localStorage.setItem(SELECTED_SCHEDULE_VERSION_ID_STORAGE_KEY, String(versionId));
}

export function clearSelectedDesktopScheduleVersionId() {
  localStorage.removeItem(SELECTED_SCHEDULE_VERSION_ID_STORAGE_KEY);
}

function compareSetMainAt(a: string | null | undefined, b: string | null | undefined) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function findMainScheduleVersion(versions: DesktopScheduleVersionResponse[]) {
  const mainVersions = versions.filter((version) => version.isMain);
  if (mainVersions.length === 0) {
    return null;
  }

  return mainVersions.reduce((latest, candidate) =>
    compareSetMainAt(candidate.setMainAt ?? null, latest.setMainAt ?? null) > 0 ? candidate : latest,
  );
}

export function getPastMainScheduleVersions(versions: DesktopScheduleVersionResponse[]) {
  const currentMain = findMainScheduleVersion(versions);
  if (!currentMain) {
    return [];
  }

  return versions
    .filter((version) => version.isMain && version.id !== currentMain.id)
    .sort((a, b) => compareSetMainAt(b.setMainAt ?? null, a.setMainAt ?? null));
}

function resolveScheduleVersion(
  versions: DesktopScheduleVersionResponse[],
  preferredScheduleVersionId?: DesktopScheduleVersionId,
) {
  const preferredId =
    typeof preferredScheduleVersionId === "number"
      ? preferredScheduleVersionId
      : getSelectedDesktopScheduleVersionId();

  const matchedVersion =
    typeof preferredId === "number"
      ? versions.find((version) => version.id === preferredId) ?? null
      : null;

  return matchedVersion ?? findMainScheduleVersion(versions) ?? versions[0] ?? null;
}

function resolveSelectedProject(
  projects: DesktopScheduleProjectResponse[],
  preferredProjectId?: DesktopScheduleProjectId,
) {
  const selectedProjectId = preferredProjectId ?? getSelectedDesktopScheduleProjectId();
  const matchedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const selectedProject =
    matchedProject ?? projects[0] ?? null;

  if (!selectedProject) {
    throw new DesktopScheduleApiError("NO_PROJECT", "선택 가능한 프로젝트가 없습니다.");
  }

  setSelectedDesktopScheduleProjectId(selectedProject.id);
  return selectedProject;
}

export const desktopScheduleApi = {
  // Guide: backend/api/api-list/details/project/13_getProjectList.json
  // GET /api/project/getProjectList
  async getProjectList() {
    const projects =
      await apiFetch<RawDesktopScheduleProjectResponse[]>("/project/getProjectList");
    return projects.map(normalizeProjectResponse);
  },

  // Guide: backend/api/api-list/details/project/14_getProjectCalendar.json
  // GET /api/project/getProjectCalendar/{projectId}
  getProjectCalendar(projectId: DesktopScheduleProjectId) {
    return apiFetch<DesktopScheduleCalendarResponse>(
      `/project/getProjectCalendar/${encodePathSegment(projectId)}`,
    );
  },

  // Guide: backend/api/api-list/details/reference/48_getDivisionList.json
  // GET /api/reference/getDivisionList
  getDivisionList(scheduleVersionId?: DesktopScheduleVersionId) {
    return apiFetch<DesktopScheduleDivisionResponse[]>(
      `/reference/getDivisionList${buildQuery({ scheduleVersionId })}`,
    );
  },

  // Guide: backend/api/api-list/details/reference/49_createDivision.json
  // POST /api/reference/createDivision
  createDivision(body: DesktopScheduleDivisionCreateRequest) {
    return apiFetch<DesktopScheduleDivisionResponse>("/reference/createDivision", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/85_updateDivision.json
  // POST /api/reference/updateDivision
  updateDivision(body: DesktopScheduleReferenceUpdateRequest) {
    return apiFetch<void>("/reference/updateDivision", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/101_deleteDivision.json
  // DELETE /api/reference/deleteDivision/{divisionId}
  deleteDivision(
    divisionId: DesktopScheduleDivisionId,
    scheduleVersionId: DesktopScheduleVersionId,
  ) {
    return apiFetch<void>(
      `/reference/deleteDivision/${encodePathSegment(divisionId)}${buildQuery({ scheduleVersionId })}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/reference/50_getWorkTypeList.json
  // GET /api/reference/getWorkTypeList?divisionId={divisionId}
  getWorkTypeList(
    divisionId: DesktopScheduleDivisionId,
    scheduleVersionId?: DesktopScheduleVersionId,
  ) {
    return apiFetch<DesktopScheduleWorkTypeResponse[]>(
      `/reference/getWorkTypeList${buildQuery({ divisionId, scheduleVersionId })}`,
    );
  },

  // Guide: backend/api/api-list/details/reference/51_createWorkType.json
  // POST /api/reference/createWorkType
  createWorkType(body: DesktopScheduleWorkTypeCreateRequest) {
    return apiFetch<DesktopScheduleWorkTypeResponse>("/reference/createWorkType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/95_updateWorkType.json
  // POST /api/reference/updateWorkType
  updateWorkType(body: DesktopScheduleReferenceUpdateRequest) {
    return apiFetch<void>("/reference/updateWorkType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/102_deleteWorkType.json
  // DELETE /api/reference/deleteWorkType/{workTypeId}
  deleteWorkType(
    workTypeId: DesktopScheduleWorkTypeId,
    scheduleVersionId: DesktopScheduleVersionId,
  ) {
    return apiFetch<void>(
      `/reference/deleteWorkType/${encodePathSegment(workTypeId)}${buildQuery({ scheduleVersionId })}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/reference/53_getSubWorkTypeList.json
  // GET /api/reference/getSubWorkTypeList?workTypeId={workTypeId}
  getSubWorkTypeList(
    workTypeId: DesktopScheduleWorkTypeId,
    scheduleVersionId?: DesktopScheduleVersionId,
  ) {
    return apiFetch<DesktopScheduleSubWorkTypeResponse[]>(
      `/reference/getSubWorkTypeList${buildQuery({ workTypeId, scheduleVersionId })}`,
    );
  },

  // Guide: backend/api/api-list/details/reference/54_createSubWorkType.json
  // POST /api/reference/createSubWorkType
  createSubWorkType(body: DesktopScheduleSubWorkTypeCreateRequest) {
    return apiFetch<DesktopScheduleSubWorkTypeResponse>("/reference/createSubWorkType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/96_updateSubWorkType.json
  // POST /api/reference/updateSubWorkType
  updateSubWorkType(body: DesktopScheduleReferenceUpdateRequest) {
    return apiFetch<void>("/reference/updateSubWorkType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/reference/103_deleteSubWorkType.json
  // DELETE /api/reference/deleteSubWorkType/{subWorkTypeId}
  deleteSubWorkType(
    subWorkTypeId: DesktopScheduleSubWorkTypeId,
    scheduleVersionId: DesktopScheduleVersionId,
  ) {
    return apiFetch<void>(
      `/reference/deleteSubWorkType/${encodePathSegment(subWorkTypeId)}${buildQuery({ scheduleVersionId })}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/scheduleVersion/39_getScheduleVersionList.json
  // GET /api/scheduleVersion/getScheduleVersionList
  getScheduleVersionList() {
    return apiFetch<DesktopScheduleVersionResponse[]>(
      "/scheduleVersion/getScheduleVersionList",
    );
  },

  // Guide: backend/api/gantt-chart/gantt-chart-core-api.md
  // POST /api/scheduleVersion/createScheduleVersion
  createScheduleVersion(body: DesktopScheduleVersionCreateRequest) {
    return apiFetch<DesktopScheduleVersionResponse>("/scheduleVersion/createScheduleVersion", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/gantt-chart/gantt-chart-core-api.md
  // PUT /api/scheduleVersion/updateScheduleVersion/{scheduleVersionId}
  updateScheduleVersion(
    scheduleVersionId: DesktopScheduleVersionId,
    body: DesktopScheduleVersionUpdateRequest,
  ) {
    return apiFetch<DesktopScheduleVersionResponse>(
      `/scheduleVersion/updateScheduleVersion/${encodePathSegment(scheduleVersionId)}`,
      {
        method: "PUT",
        body: toApiBody(body),
      },
    );
  },

  // Guide: backend/api/gantt-chart/gantt-chart-core-api.md
  // POST /api/scheduleVersion/duplicateScheduleVersion/{scheduleVersionId}
  duplicateScheduleVersion(
    scheduleVersionId: DesktopScheduleVersionId,
    body: DesktopScheduleVersionCreateRequest,
  ) {
    return apiFetch<DesktopScheduleVersionResponse>(
      `/scheduleVersion/duplicateScheduleVersion/${encodePathSegment(scheduleVersionId)}`,
      {
        method: "POST",
        body: toApiBody(body),
      },
    );
  },

  // POST /api/scheduleVersion/setScheduleMain/{scheduleVersionId}
  setScheduleMain(scheduleVersionId: DesktopScheduleVersionId) {
    return apiFetch<DesktopScheduleVersionResponse>(
      `/scheduleVersion/setScheduleMain/${encodePathSegment(scheduleVersionId)}`,
      {
        method: "POST",
      },
    );
  },

  // Guide: backend/api/gantt-chart/gantt-chart-core-api.md
  // DELETE /api/scheduleVersion/deleteScheduleVersion/{scheduleVersionId}
  deleteScheduleVersion(scheduleVersionId: DesktopScheduleVersionId) {
    return apiFetch<void>(
      `/scheduleVersion/deleteScheduleVersion/${encodePathSegment(scheduleVersionId)}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/work/20_getWorkListByVersion.json
  // GET /api/work/getWorkListByVersion?scheduleVersionId={scheduleVersionId}
  getWorkListByVersion(scheduleVersionId: DesktopScheduleVersionId) {
    return apiFetch<DesktopScheduleWorkResponse[]>(
      `/work/getWorkListByVersion${buildQuery({ scheduleVersionId })}`,
    );
  },

  // POST /api/schedule/create3WeekSchedule
  export3WeekSchedule(body: DesktopScheduleExportRequest) {
    return apiFetchAttachment("/schedule/create3WeekSchedule", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // POST /api/schedule/create3MonthSchedule
  export3MonthSchedule(body: DesktopScheduleExportRequest) {
    return apiFetchAttachment("/schedule/create3MonthSchedule", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/work/198_getWorkListByPeriodAndVersion.json
  // GET /api/work/getWorkListByPeriodAndVersion?scheduleVersionId={scheduleVersionId}&startDate={startDate}&endDate={endDate}
  getWorkListByPeriodAndVersion(query: DesktopScheduleWorkPeriodQuery) {
    return apiFetch<DesktopScheduleWorkResponse[]>(
      `/work/getWorkListByPeriodAndVersion${buildQuery({
        scheduleVersionId: query.scheduleVersionId,
        startDate: query.startDate,
        endDate: query.endDate,
      })}`,
    );
  },

  // Guide: backend/api/api-list/details/work/22_getWork.json
  // GET /api/work/getWork/{workId}
  getWork(workId: DesktopScheduleWorkId) {
    return apiFetch<DesktopScheduleWorkResponse>(
      `/work/getWork/${encodePathSegment(workId)}`,
    );
  },

  // Guide: backend/api/api-list/details/work/23_createWork.json
  // POST /api/work/createWork
  createWork(body: DesktopScheduleWorkCreateRequest) {
    return apiFetch<DesktopScheduleMutationResponse>("/work/createWork", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/work/24_updateWork.json
  // PUT /api/work/updateWork
  updateWork(body: DesktopScheduleWorkUpdateRequest) {
    return apiFetch<DesktopScheduleMutationResponse>("/work/updateWork", {
      method: "PUT",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/work/25_deleteWork.json
  // DELETE /api/work/deleteWork/{workId}
  deleteWork(workId: DesktopScheduleWorkId) {
    return apiFetch<DesktopScheduleMutationResponse>(
      `/work/deleteWork/${encodePathSegment(workId)}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/workDep/35_getWorkDepListByVersion.json
  // GET /api/workDep/getWorkDepListByVersion?scheduleVersionId={scheduleVersionId}
  getWorkDepListByVersion(scheduleVersionId: DesktopScheduleVersionId) {
    return apiFetch<DesktopScheduleWorkDepResponse[]>(
      `/workDep/getWorkDepListByVersion${buildQuery({ scheduleVersionId })}`,
    );
  },

  // Guide: backend/api/api-list/details/workDep/36_createWorkDep.json
  // POST /api/workDep/createWorkDep
  createWorkDep(body: DesktopScheduleWorkDepCreateRequest) {
    return apiFetch<DesktopScheduleMutationResponse>("/workDep/createWorkDep", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/workDep/37_updateWorkDep.json
  // PUT /api/workDep/updateWorkDep/{workDepId}
  updateWorkDep(
    workDepId: DesktopScheduleWorkDepId,
    body: DesktopScheduleWorkDepUpdateRequest,
  ) {
    return apiFetch<DesktopScheduleMutationResponse>(
      `/workDep/updateWorkDep/${encodePathSegment(workDepId)}`,
      {
        method: "PUT",
        body: toApiBody(body),
      },
    );
  },

  // Guide: backend/api/api-list/details/workDep/38_deleteWorkDep.json
  // DELETE /api/workDep/deleteWorkDep/{workDepId}
  deleteWorkDep(workDepId: DesktopScheduleWorkDepId) {
    return apiFetch<DesktopScheduleMutationResponse>(
      `/workDep/deleteWorkDep/${encodePathSegment(workDepId)}`,
      {
        method: "DELETE",
      },
    );
  },

  // Guide: backend/api/api-list/details/milestone/328_getMilestoneList.json
  // GET /api/milestone/getMilestoneList
  getMilestoneList(scheduleVersionId?: DesktopScheduleVersionId) {
    return apiFetch<DesktopScheduleMilestoneResponse[]>(
      `/milestone/getMilestoneList${buildQuery({ scheduleVersionId })}`,
    );
  },

  // Guide: backend/api/api-list/details/milestone/329_createMilestone.json
  // POST /api/milestone/createMilestone
  createMilestone(body: DesktopScheduleMilestoneCreateRequest) {
    return apiFetch<DesktopScheduleMilestoneResponse>("/milestone/createMilestone", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/milestone/330_updateMilestone.json
  // POST /api/milestone/updateMilestone
  updateMilestone(body: DesktopScheduleMilestoneUpdateRequest) {
    return apiFetch<void>("/milestone/updateMilestone", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // Guide: backend/api/api-list/details/milestone/331_deleteMilestone.json
  // DELETE /api/milestone/deleteMilestone/{milestoneId}
  deleteMilestone(
    milestoneId: DesktopScheduleMilestoneId,
    scheduleVersionId: DesktopScheduleVersionId,
  ) {
    return apiFetch<void>(
      `/milestone/deleteMilestone/${encodePathSegment(milestoneId)}${buildQuery({ scheduleVersionId })}`,
      {
        method: "DELETE",
      },
    );
  },

  async getReferenceHierarchy(
    scheduleVersionId?: DesktopScheduleVersionId,
  ): Promise<DesktopScheduleReferenceHierarchyItem[]> {
    const divisions = await desktopScheduleApi.getDivisionList(scheduleVersionId);
    const workTypeGroups = await Promise.all(
      divisions.map(async (division) => ({
        division,
        workTypes: await desktopScheduleApi.getWorkTypeList(division.id, scheduleVersionId),
      })),
    );

    const hierarchyGroups = await Promise.all(
      workTypeGroups.flatMap((divisionGroup) =>
        divisionGroup.workTypes.map(async (workType) => ({
          division: divisionGroup.division,
          workType,
          subWorkTypes: await desktopScheduleApi.getSubWorkTypeList(workType.id, scheduleVersionId),
        })),
      ),
    );

    const hierarchyItems = hierarchyGroups.flatMap((group) => {
      if (group.subWorkTypes.length === 0) {
        return [
          {
            divisionId: group.division.id,
            divisionName: group.division.name,
            workTypeId: group.workType.id,
            workTypeName: group.workType.name,
            subWorkTypeId: 0,
            subWorkTypeName: "",
            subWorkTypeColor: null,
          },
        ];
      }

      return group.subWorkTypes.map((subWorkType) => ({
        divisionId: group.division.id,
        divisionName: group.division.name,
        workTypeId: group.workType.id,
        workTypeName: group.workType.name,
        subWorkTypeId: subWorkType.id,
        subWorkTypeName: subWorkType.name,
        subWorkTypeColor: subWorkType.color ?? null,
      }));
    });
    const divisionIdsWithRows = new Set(hierarchyItems.map((item) => item.divisionId));
    const divisionOnlyItems = divisions
      .filter((division) => !divisionIdsWithRows.has(division.id))
      .map((division) => ({
        divisionId: division.id,
        divisionName: division.name,
        workTypeId: 0,
        workTypeName: "",
        subWorkTypeId: 0,
        subWorkTypeName: "",
        subWorkTypeColor: null,
      }));

    return [...hierarchyItems, ...divisionOnlyItems];
  },

  async loadCurrentProjectSchedule(
    options: DesktopScheduleBootstrapOptions = {},
  ): Promise<DesktopScheduleBootstrapData> {
    const projects = await desktopScheduleApi.getProjectList();
    const selectedProject = resolveSelectedProject(projects, options.projectId);

    const scheduleVersions = await desktopScheduleApi.getScheduleVersionList();
    let selectedScheduleVersion = resolveScheduleVersion(
      scheduleVersions,
      options.scheduleVersionId,
    );
    let nextScheduleVersions = scheduleVersions;

    if (!selectedScheduleVersion) {
      const createdScheduleVersion = await desktopScheduleApi.createScheduleVersion({
        versionName: EMPTY_SCHEDULE_VERSION_NAME,
      });
      selectedScheduleVersion = createdScheduleVersion;
      nextScheduleVersions = [createdScheduleVersion];
    }

    setSelectedDesktopScheduleVersionId(selectedScheduleVersion.id);

    const scheduleVersionId = selectedScheduleVersion.id;
    const worksPromise = options.period
      ? desktopScheduleApi.getWorkListByPeriodAndVersion({
          scheduleVersionId,
          startDate: options.period.startDate,
          endDate: options.period.endDate,
        })
      : desktopScheduleApi.getWorkListByVersion(scheduleVersionId);

    const [calendar, workHierarchy, works, workDeps, milestones] = await Promise.all([
      desktopScheduleApi.getProjectCalendar(selectedProject.id),
      desktopScheduleApi.getReferenceHierarchy(scheduleVersionId),
      worksPromise,
      desktopScheduleApi.getWorkDepListByVersion(scheduleVersionId),
      desktopScheduleApi.getMilestoneList(scheduleVersionId),
    ]);

    return {
      projects,
      selectedProject,
      scheduleVersions: nextScheduleVersions,
      selectedScheduleVersion,
      calendar,
      workHierarchy,
      works,
      workDeps,
      milestones,
    };
  },
};
