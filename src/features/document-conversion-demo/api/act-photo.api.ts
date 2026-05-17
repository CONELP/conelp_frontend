import { apiFetch } from "@/shared/network/api-client";
import type {
  ActPhotoCreateRequest,
  ActPhotoResponse,
  ActPhotoUpdateRequest,
} from "@/features/document-conversion-demo/api/act-photo-api.types";

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

export const actPhotoApi = {
  // POST /api/actPhoto/createActPhoto (multipart/form-data)
  async create(body: ActPhotoCreateRequest) {
    await ensureSelectedProjectId();
    const formData = new FormData();
    formData.append("date", body.date);
    body.photos.forEach((photo) => formData.append("photos", photo));
    body.descriptions?.forEach((description) => {
      formData.append("descriptions", description ?? "");
    });
    return apiFetch<ActPhotoResponse[]>("/actPhoto/createActPhoto", {
      method: "POST",
      body: formData,
    });
  },

  // GET /api/actPhoto/getActPhotoListByDate?date=yyyy-MM-dd
  async listByDate(date: string) {
    await ensureSelectedProjectId();
    return apiFetch<ActPhotoResponse[]>(
      `/actPhoto/getActPhotoListByDate?date=${encodeURIComponent(date)}`,
    );
  },

  // PUT /api/actPhoto/updateActPhoto/{photoId}
  async update(photoId: number, body: ActPhotoUpdateRequest) {
    await ensureSelectedProjectId();
    return apiFetch<ActPhotoResponse>(`/actPhoto/updateActPhoto/${photoId}`, {
      method: "PUT",
      body: body as unknown as Record<string, unknown>,
    });
  },

  // DELETE /api/actPhoto/deleteActPhoto/{photoId}
  async delete(photoId: number) {
    await ensureSelectedProjectId();
    return apiFetch<void>(`/actPhoto/deleteActPhoto/${photoId}`, {
      method: "DELETE",
    });
  },
};
