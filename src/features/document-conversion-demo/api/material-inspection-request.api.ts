import { apiFetch } from "@/shared/network/api-client";
import type {
  AnalyzeCatPhotoRequest,
  AnalyzeMirPhotoRequest,
  CatAnalysisResponse,
  CatLineResponse,
  CreateCatDocumentRequest,
  CreateCatDocumentResponse,
  CreateMirDocumentRequest,
  CreateMirDocumentResponse,
  DocumentJobResponse,
  MirAnalysisResponse,
  UpdateCatDataRequest,
  UpdateMirDataRequest,
  WorkTypeReferenceResponse,
} from "@/features/document-conversion-demo/api/material-inspection-request-api.types";

const SELECTED_PROJECT_ID_STORAGE_KEY = "selectedProjectId";

interface ProjectListItem {
  id?: string;
  projectId?: string;
}

function appendOptionalString(formData: FormData, key: string, value?: string) {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    formData.append(key, normalizedValue);
  }
}

function appendOptionalNumber(formData: FormData, key: string, value?: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    appendJsonPart(formData, key, value);
  }
}

function appendJsonPart(formData: FormData, key: string, value: unknown) {
  formData.append(
    key,
    new Blob([JSON.stringify(value)], {
      type: "application/json",
    }),
  );
}

function toApiBody<TRequest extends object>(body: TRequest): Record<string, unknown> {
  return body as unknown as Record<string, unknown>;
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

export const materialInspectionRequestApi = {
  async getWorkTypeListByName(name: string) {
    await ensureSelectedProjectId();

    return apiFetch<WorkTypeReferenceResponse[]>(
      `/reference/getWorkTypeListByName?name=${encodeURIComponent(name)}`,
      {
        method: "GET",
      },
    );
  },

  async analyzeMirPhoto(request: AnalyzeMirPhotoRequest) {
    await ensureSelectedProjectId();

    const formData = new FormData();

    appendOptionalString(formData, "application", request.application);
    appendOptionalNumber(formData, "workTypeId", request.workTypeId);
    request.images.forEach((image) => {
      formData.append("images", image);
    });

    return apiFetch<MirAnalysisResponse>(
      "/materialInspectionRequest/analyzeMirPhoto",
      {
        method: "POST",
        body: formData,
      },
    );
  },

  async updateMirData(request: UpdateMirDataRequest) {
    await ensureSelectedProjectId();

    return apiFetch<MirAnalysisResponse>("/materialInspectionRequest/updateMirData", {
      method: "POST",
      body: toApiBody(request),
    });
  },

  async analyzeCatPhoto(request: AnalyzeCatPhotoRequest) {
    await ensureSelectedProjectId();

    const formData = new FormData();

    appendOptionalString(formData, "application", request.application);
    appendOptionalNumber(formData, "workTypeId", request.workTypeId);
    request.deliveryNote.forEach((image) => {
      formData.append("deliveryNote", image);
    });
    appendJsonPart(formData, "metadata", request.metadata);
    request.batchPhotos.forEach((image) => {
      formData.append("batchPhotos", image);
    });

    return apiFetch<CatAnalysisResponse>("/cat/analyzeCatPhoto", {
      method: "POST",
      body: formData,
    });
  },

  async updateCatData(request: UpdateCatDataRequest) {
    await ensureSelectedProjectId();

    return apiFetch<CatAnalysisResponse>("/cat/updateCatData", {
      method: "POST",
      body: toApiBody(request),
    });
  },

  async createCatDocument(request: CreateCatDocumentRequest) {
    await ensureSelectedProjectId();

    return apiFetch<CreateCatDocumentResponse>("/cat/createCatDocument", {
      method: "POST",
      body: toApiBody(request),
    });
  },

  async getCatLineList(materialDeliveryId: number) {
    await ensureSelectedProjectId();

    return apiFetch<CatLineResponse[]>(
      `/cat/getCatLineList?materialDeliveryId=${encodeURIComponent(String(materialDeliveryId))}`,
      {
        method: "GET",
      },
    );
  },

  async createMirDocument(request: CreateMirDocumentRequest) {
    await ensureSelectedProjectId();

    return apiFetch<CreateMirDocumentResponse>(
      "/materialInspectionRequest/createMirDocument",
      {
        method: "POST",
        body: toApiBody(request),
      },
    );
  },

  async getMirDocumentList() {
    await ensureSelectedProjectId();

    return apiFetch<DocumentJobResponse[]>(
      "/materialInspectionRequest/getMirDocumentList",
      {
        method: "GET",
      },
    );
  },

  async getDocumentJobList() {
    await ensureSelectedProjectId();

    return apiFetch<DocumentJobResponse[]>("/document/getDocumentJobList", {
      method: "GET",
    });
  },

  async downloadDocumentFile(key: string) {
    await ensureSelectedProjectId();

    return apiFetch<Blob>(
      `/file/downloadFile?key=${encodeURIComponent(key)}`,
      {
        method: "GET",
      },
    );
  },

  async downloadDocumentJob(jobId: number) {
    await ensureSelectedProjectId();

    return apiFetch<Blob>(`/document/downloadDocument/${jobId}`, {
      method: "GET",
    });
  },
};
