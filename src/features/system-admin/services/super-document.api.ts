import { apiFetch, apiFetchAttachment } from "@/shared/network/api-client";

import type {
  SuperDocStatus,
  SuperDocumentJob,
  SuperDocumentJobListParams,
  SuperDocumentSource,
} from "@/features/system-admin/model/super-document.types";

// SUPER 문서 관리는 전 프로젝트를 다룬다. 대상 문서의 projectId 를 X-Project-Id 로
// 명시해 localStorage 에 남은 다른 프로젝트 헤더와의 충돌을 막는다.
function projectHeader(projectId?: string): Record<string, string> | undefined {
  return projectId ? { "X-Project-Id": projectId } : undefined;
}

function buildListQuery(params: SuperDocumentJobListParams): string {
  const search = new URLSearchParams();
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.docType) search.set("docType", params.docType);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const superDocumentApi = {
  // GET /api/super/document/getDocumentJobList — 전 프로젝트 문서 목록
  async getDocumentJobList(
    params: SuperDocumentJobListParams = {},
  ): Promise<SuperDocumentJob[]> {
    return apiFetch<SuperDocumentJob[]>(
      `/super/document/getDocumentJobList${buildListQuery(params)}`,
      { method: "GET" },
    );
  },

  // PUT /api/super/document/updateDocNo/{jobId} — 문서번호 수정 (DB doc_no 만 변경)
  async updateDocNo(
    jobId: number,
    docNo: string,
    projectId?: string,
  ): Promise<SuperDocumentJob> {
    return apiFetch<SuperDocumentJob>(`/super/document/updateDocNo/${jobId}`, {
      method: "PUT",
      body: { docNo },
      headers: projectHeader(projectId),
    });
  },

  // PUT /api/super/document/updateStatus/{jobId} — 상태 수동 오버라이드
  async updateStatus(
    jobId: number,
    status: SuperDocStatus,
    projectId?: string,
  ): Promise<SuperDocumentJob> {
    return apiFetch<SuperDocumentJob>(`/super/document/updateStatus/${jobId}`, {
      method: "PUT",
      body: { status },
      headers: projectHeader(projectId),
    });
  },

  // POST /api/super/document/reuploadDocument/{jobId} — 수정본 재등록 (xlsx 교체)
  async reuploadDocument(
    jobId: number,
    file: File,
    projectId?: string,
  ): Promise<SuperDocumentJob> {
    const formData = new FormData();
    formData.append("file", file);

    return apiFetch<SuperDocumentJob>(
      `/super/document/reuploadDocument/${jobId}`,
      {
        method: "POST",
        body: formData,
        headers: projectHeader(projectId),
      },
    );
  },

  // GET /api/super/document/getDocumentSource/{jobId} — 원본 사진 + 추출정보 (MIR/CAT/CCST)
  async getDocumentSource(
    jobId: number,
    projectId?: string,
  ): Promise<SuperDocumentSource> {
    return apiFetch<SuperDocumentSource>(
      `/super/document/getDocumentSource/${jobId}`,
      {
        method: "GET",
        headers: projectHeader(projectId),
      },
    );
  },

  // GET /api/super/document/downloadPhoto — gs:// 사진 프록시 → blob
  async downloadPhotoBlob(gsUrl: string, projectId?: string): Promise<Blob> {
    const { blob } = await apiFetchAttachment(
      `/super/document/downloadPhoto?gsUrl=${encodeURIComponent(gsUrl)}`,
      {
        method: "GET",
        headers: projectHeader(projectId),
      },
    );
    return blob;
  },

  // GET /api/document/downloadDocument/{jobId} — SUPER 는 전 프로젝트 다운로드 가능
  async downloadDocument(
    jobId: number,
    projectId: string,
  ): Promise<{ blob: Blob; filename: string }> {
    return apiFetchAttachment(`/document/downloadDocument/${jobId}`, {
      method: "GET",
      headers: projectHeader(projectId),
    });
  },
};
