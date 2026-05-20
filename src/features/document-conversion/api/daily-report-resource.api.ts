import { apiFetch } from "@/shared/network/api-client";
import type {
  DailyReportAttendanceByDateResponse,
  DailyReportAttendanceUpdateRequest,
  DailyReportEquipmentSpecCreateRequest,
  DailyReportEquipmentDeploymentUpdateRequest,
  DailyReportEquipmentDeploymentResponse,
  DailyReportEquipmentSpecResponse,
  DailyReportEquipmentTypeCreateRequest,
  DailyReportEquipmentTypeResponse,
  DailyReportLaborTypeCreateRequest,
  DailyReportLaborTypeResponse,
  DailyReportMaterialDeliveryResponse,
  DailyReportMaterialDeliveryUpdateRequest,
  DailyReportMaterialQuantityByDateResponse,
  DailyReportMaterialSpecCreateRequest,
  DailyReportMaterialSpecResponse,
  DailyReportMaterialTypeCreateRequest,
  DailyReportMaterialTypeResponse,
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

export const dailyReportResourceApi = {
  async getLaborTypeList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportLaborTypeResponse[]>("/reference/getLaborTypeList");
  },

  async createLaborType(body: DailyReportLaborTypeCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportLaborTypeResponse>("/reference/createLaborType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async getEquipmentSpecList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentSpecResponse[]>("/reference/getEquipmentSpecList");
  },

  async getEquipmentTypeList() {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentTypeResponse[]>("/reference/getEquipmentTypeList");
  },

  async createEquipmentType(body: DailyReportEquipmentTypeCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentTypeResponse>("/reference/createEquipmentType", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async createEquipmentSpec(body: DailyReportEquipmentSpecCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentSpecResponse>("/reference/createEquipmentSpec", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async getAttendanceListByDate(date: string) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportAttendanceByDateResponse[]>(
      `/attendance/getAttendanceListByDate?date=${encodeURIComponent(date)}`,
    );
  },

  async updateAttendance(body: DailyReportAttendanceUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<void>("/attendance/updateAttendance", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  async getEquipmentDeploymentListByDate(date: string) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportEquipmentDeploymentResponse[]>(
      `/equipment/getEquipmentDeploymentListByDate?date=${encodeURIComponent(date)}`,
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

  async createMaterialType(body: DailyReportMaterialTypeCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<DailyReportMaterialTypeResponse>("/reference/createMaterialType", {
      method: "POST",
      body: toApiBody(body),
    });
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
};
