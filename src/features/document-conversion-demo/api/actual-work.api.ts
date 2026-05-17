import { apiFetch } from "@/shared/network/api-client";
import type {
  ActualWorkCreateRequest,
  ActualWorkResponse,
  ActualWorkUpdateRequest,
} from "@/features/document-conversion-demo/api/actual-work-api.types";

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

export const actualWorkApi = {
  // GET /api/actualWork/getActualWorkListByDate?date=yyyy-MM-dd
  async listByDate(date: string) {
    await ensureSelectedProjectId();
    return apiFetch<ActualWorkResponse[]>(
      `/actualWork/getActualWorkListByDate?date=${encodeURIComponent(date)}`,
    );
  },

  // POST /api/actualWork/createActualWork
  async create(body: ActualWorkCreateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<ActualWorkResponse>("/actualWork/createActualWork", {
      method: "POST",
      body: toApiBody(body),
    });
  },

  // PUT /api/actualWork/updateActualWork/{id}
  async update(id: number, body: ActualWorkUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<ActualWorkResponse>(`/actualWork/updateActualWork/${id}`, {
      method: "PUT",
      body: toApiBody(body),
    });
  },

  // DELETE /api/actualWork/deleteActualWork/{id}
  async delete(id: number) {
    await ensureSelectedProjectId();
    return apiFetch<ActualWorkResponse>(`/actualWork/deleteActualWork/${id}`, {
      method: "DELETE",
    });
  },
};
