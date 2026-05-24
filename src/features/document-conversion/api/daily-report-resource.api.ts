import { apiFetch } from "@/shared/network/api-client";
import type {
  DailyReportAttendanceByDateGroupedResponse,
  DailyReportAttendanceByDateResponse,
  DailyReportAttendanceUpdateRequest,
  DailyReportEquipmentDeploymentByDateGroup,
  DailyReportEquipmentDeploymentUpdateRequest,
  DailyReportEquipmentSpecCreateRequest,
  DailyReportEquipmentSpecResponse,
  DailyReportEquipmentSpecUpdateRequest,
  DailyReportEquipmentTypeResponse,
  DailyReportEquipmentTypeUpdateRequest,
  DailyReportLaborTypeCreateRequest,
  DailyReportLaborTypeGroupedResponse,
  DailyReportLaborTypeResponse,
  DailyReportLaborTypeUpdateRequest,
  DailyReportEquipmentHierarchyGroup,
  DailyReportMaterialHierarchyGroup,
  DailyReportMaterialDeliveryByDateGroup,
  DailyReportMaterialDeliveryResponse,
  DailyReportMaterialDeliveryUpdateRequest,
  DailyReportMaterialQuantityByDateResponse,
  DailyReportMaterialSpecCreateRequest,
  DailyReportMaterialSpecResponse,
  DailyReportMaterialSpecUpdateRequest,
  DailyReportMaterialTypeResponse,
  DailyReportMaterialTypeUpdateRequest,
} from "@/features/document-conversion/api/daily-report-resource-api.types";

const SELECTED_PROJECT_ID_STORAGE_KEY = "selectedProjectId";

interface ProjectListItem {
  id?: string;
  projectId?: string;
}

function hasSelectedProjectId() {
  const projectId = localStorage.getItem(SELECTED_PROJECT_ID_STORAGE_KEY);
  return Boolean(projectId && projectId !== "undefined" && projectId !== "null");
}

async function ensureSelectedProjectId() {
  if (hasSelectedProjectId()) {
    return;
  }

  const projects = await apiFetch<ProjectListItem[]>("/project/getProjectList");
  const projectId = projects
    .map((project) => project.id ?? project.projectId)
    .find((id): id is string => Boolean(id && id !== "undefined" && id !== "null"));

  if (!projectId) {
    throw new Error("선택 가능한 프로젝트가 없습니다.");
  }

  localStorage.setItem(SELECTED_PROJECT_ID_STORAGE_KEY, projectId);
}

function toApiBody<TRequest extends object>(body: TRequest): Record<string, unknown> {
  return body as unknown as Record<string, unknown>;
}

function flattenLaborTypeGroups(
  groups: DailyReportLaborTypeGroupedResponse[],
): DailyReportLaborTypeResponse[] {
  return groups.flatMap((group) =>
    group.laborTypes.map((laborType) => ({
      id: laborType.id,
      name: laborType.name,
      workTypeId: group.workTypeId,
      workTypeName: group.workTypeName,
      isVisible: laborType.isVisible,
    })),
  );
}

function flattenAttendanceByDateGroups(
  groups: DailyReportAttendanceByDateGroupedResponse[],
): DailyReportAttendanceByDateResponse[] {
  return groups.flatMap((group) =>
    group.laborTypes.map((laborType) => ({
      laborTypeId: laborType.laborTypeId,
      laborTypeName: laborType.laborTypeName,
      workTypeId: group.workTypeId,
      workTypeName: group.workTypeName,
      endDateCount: laborType.endDateCount,
      accumulativeCount: laborType.accumulativeCount,
    })),
  );
}

export const dailyReportResourceApi = {
  async getLaborTypeList() {
    await ensureSelectedProjectId();
    const groups = await apiFetch<DailyReportLaborTypeGroupedResponse[]>(
      "/reference/getLaborTypeList",
    );
    return flattenLaborTypeGroups(groups);
  },

  async getLaborTypeListByDate(date: string) {
    await ensureSelectedProjectId();
    const groups = await apiFetch<DailyReportLaborTypeGroupedResponse[]>(
      `/attendance/getLaborTypeListByDate?date=${encodeURIComponent(date)}`,
    );
    return flattenLaborTypeGroups(groups);
  },

  async createLaborType(body: DailyReportLaborTypeCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportLaborTypeResponse>("/reference/createLaborType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async updateLaborType(body: DailyReportLaborTypeUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/reference/updateLaborType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async deleteLaborType(laborTypeId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(
      `/reference/deleteLaborType/${encodeURIComponent(String(laborTypeId))}`,
      { method: "DELETE" },
    );
  },

  async getEquipmentSpecList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentSpecResponse[]>("/reference/getEquipmentSpecList");
  },

  async getEquipmentTypeList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentTypeResponse[]>("/reference/getEquipmentTypeList");
  },

  async createEquipmentSpec(body: DailyReportEquipmentSpecCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentSpecResponse>("/reference/createEquipmentSpec", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async updateEquipmentType(body: DailyReportEquipmentTypeUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/reference/updateEquipmentType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async deleteEquipmentType(equipmentTypeId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(
      `/reference/deleteEquipmentType/${encodeURIComponent(String(equipmentTypeId))}`,
      { method: "DELETE" },
    );
  },

  async updateEquipmentSpec(body: DailyReportEquipmentSpecUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/reference/updateEquipmentSpec", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async deleteEquipmentSpec(equipmentSpecId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(
      `/reference/deleteEquipmentSpec/${encodeURIComponent(String(equipmentSpecId))}`,
      { method: "DELETE" },
    );
  },

  async getAttendanceListByDate(endDate: string, startDate?: string) {
    await ensureSelectedProjectId();
    const params = new URLSearchParams({ endDate });
    if (startDate) {
      params.set("startDate", startDate);
    }
    const groups = await apiFetch<DailyReportAttendanceByDateGroupedResponse[]>(
      `/attendance/getAttendanceListByDate?${params.toString()}`,
    );
    return flattenAttendanceByDateGroups(groups);
  },

  async updateAttendance(body: DailyReportAttendanceUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/attendance/updateAttendance", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async getEquipmentDeploymentListByDate(endDate: string, startDate?: string) {
    await ensureSelectedProjectId();
    const params = new URLSearchParams({ endDate });
    if (startDate) {
      params.set("startDate", startDate);
    }
    return apiFetch<DailyReportEquipmentDeploymentByDateGroup[]>(
      `/equipment/getEquipmentDeploymentListByDate?${params.toString()}`,
    );
  },

  async updateEquipmentDeployment(body: DailyReportEquipmentDeploymentUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/equipment/updateEquipmentDeployment", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async getMaterialQuantityByDate(date: string) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialQuantityByDateResponse[]>(
      `/materialDelivery/getTotalDeliveryQuantityByDate?date=${encodeURIComponent(date)}`,
    );
  },

  async getMaterialDeliveryList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialDeliveryResponse[]>(
      "/materialDelivery/getMaterialDeliveryList",
    );
  },

  async updateMaterialDeliveryList(body: DailyReportMaterialDeliveryUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialDeliveryResponse[]>(
      "/materialDelivery/updateMaterialDeliveryList",
      {
        method: "PUT",
        body: toApiBody(body),
      },
    );
  },

  async getMaterialTypeList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialTypeResponse[]>(
      "/reference/getMaterialTypeList",
    );
  },

  async updateMaterialType(body: DailyReportMaterialTypeUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/reference/updateMaterialType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async deleteMaterialType(materialTypeId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(
      `/reference/deleteMaterialType/${encodeURIComponent(String(materialTypeId))}`,
      { method: "DELETE" },
    );
  },

  async getMaterialSpecList(materialTypeId: number) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialSpecResponse[]>(
      `/reference/getMaterialSpecList?materialTypeId=${encodeURIComponent(String(materialTypeId))}`,
    );
  },

  async createMaterialSpec(body: DailyReportMaterialSpecCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialSpecResponse>("/reference/createMaterialSpec", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async updateMaterialSpec(body: DailyReportMaterialSpecUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/reference/updateMaterialSpec", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async deleteMaterialSpec(materialSpecId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(
      `/reference/deleteMaterialSpec/${encodeURIComponent(String(materialSpecId))}`,
      { method: "DELETE" },
    );
  },

  async getMaterialTypeHierarchy() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialHierarchyGroup[]>(
      "/reference/getMaterialTypeHierarchy",
    );
  },

  async getEquipmentTypeHierarchy() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentHierarchyGroup[]>(
      "/reference/getEquipmentTypeHierarchy",
    );
  },

  async getMaterialDeliveryListByDate(endDate: string, startDate?: string) {
    await ensureSelectedProjectId();
    const params = new URLSearchParams({ endDate });
    if (startDate) {
      params.set("startDate", startDate);
    }
    return apiFetch<DailyReportMaterialDeliveryByDateGroup[]>(
      `/materialDelivery/getMaterialDeliveryListByDate?${params.toString()}`,
    );
  },
};
