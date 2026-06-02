import { apiFetch, apiFetchAttachment } from "@/shared/network/api-client";
import type {
  CatLineResponse,
  CreateCatDocumentMultipartRequest,
  CreateCatDocumentResponse,
  CreateCcstDocumentMultipartRequest,
  CreateCcstDocumentResponse,
  CreateMirDocumentMultipartRequest,
  CreateMirDocumentResponse,
  DocumentJobResponse,
  WorkTypeReferenceResponse,
} from "@/features/document-conversion/api/material-inspection-request-api.types";

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

  async createCatDocument(request: CreateCatDocumentMultipartRequest) {
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

    return apiFetch<CreateCatDocumentResponse>("/cat/createCatDocument", {
      method: "POST",
      body: formData,
    });
  },

  async createCcstDocument(
    catDocId: number,
    request: CreateCcstDocumentMultipartRequest,
  ) {
    await ensureSelectedProjectId();

    const formData = new FormData();

    appendJsonPart(formData, "metadata", request.metadata);
    request.lotPhotos.forEach((image) => {
      formData.append("lotPhotos", image);
    });

    return apiFetch<CreateCcstDocumentResponse>(
      `/ccst/createCcstDocument/${encodeURIComponent(String(catDocId))}`,
      {
        method: "POST",
        body: formData,
      },
    );
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

  async createMirDocument(request: CreateMirDocumentMultipartRequest) {
    await ensureSelectedProjectId();

    const formData = new FormData();

    appendOptionalString(formData, "application", request.application);
    appendOptionalNumber(formData, "workTypeId", request.workTypeId);
    request.images.forEach((image) => {
      formData.append("images", image);
    });

    return apiFetch<CreateMirDocumentResponse>(
      "/materialInspectionRequest/createMirDocument",
      {
        method: "POST",
        body: formData,
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

  async createMatInoutDocument(
    params: { startDate?: string; endDate?: string } = {},
  ) {
    await ensureSelectedProjectId();

    const query = new URLSearchParams();
    if (params.startDate) {
      query.append("startDate", params.startDate);
    }
    if (params.endDate) {
      query.append("endDate", params.endDate);
    }
    const queryString = query.toString();

    return apiFetch<DocumentJobResponse>(
      `/matInout/createMatInout${queryString ? `?${queryString}` : ""}`,
      {
        method: "POST",
      },
    );
  },

  async getMatInoutList() {
    await ensureSelectedProjectId();

    return apiFetch<DocumentJobResponse[]>("/matInout/getMatInoutList", {
      method: "GET",
    });
  },

  async downloadDocumentFile(key: string) {
    await ensureSelectedProjectId();

    const attachment = await apiFetchAttachment(
      `/file/downloadFile?key=${encodeURIComponent(key)}`,
      {
        method: "GET",
      },
    );

    return attachment.blob;
  },

  async downloadDocumentFileAttachment(key: string) {
    await ensureSelectedProjectId();

    return apiFetchAttachment(
      `/file/downloadFile?key=${encodeURIComponent(key)}`,
      {
        method: "GET",
      },
    );
  },

  async deleteDocumentJob(jobId: number) {
    await ensureSelectedProjectId();

    return apiFetch<void>(`/document/deleteDocument/${jobId}`, {
      method: "DELETE",
    });
  },

  async downloadDocumentJob(jobId: number) {
    await ensureSelectedProjectId();

    const attachment = await apiFetchAttachment(`/document/downloadDocument/${jobId}`, {
      method: "GET",
    });

    return attachment.blob;
  },

  async downloadDocumentJobAttachment(jobId: number) {
    await ensureSelectedProjectId();

    return apiFetchAttachment(`/document/downloadDocument/${jobId}`, {
      method: "GET",
    });
  },
};
