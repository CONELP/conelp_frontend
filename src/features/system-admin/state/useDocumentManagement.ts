import { ref } from "vue";

import { superDocumentApi } from "@/features/system-admin/services/super-document.api";
import { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
import type { Project } from "@/features/system-admin/model/system-admin.types";
import type {
  SuperDocStatus,
  SuperDocType,
  SuperDocumentJob,
} from "@/features/system-admin/model/super-document.types";

export function useDocumentManagement() {
  const documents = ref<SuperDocumentJob[]>([]);
  const projects = ref<Project[]>([]);

  const filterProjectId = ref<string | null>(null);
  const filterDocType = ref<SuperDocType | null>(null);
  const filterStatus = ref<SuperDocStatus | null>(null);

  const isLoading = ref(false);
  const isSaving = ref(false);
  const isReuploading = ref(false);
  const downloadingJobId = ref<number | null>(null);

  const loadProjects = async () => {
    try {
      projects.value = await systemAdminApi.getProjectList();
    } catch (error) {
      console.error("프로젝트 목록 조회 실패:", error);
    }
  };

  const loadDocuments = async () => {
    isLoading.value = true;
    try {
      documents.value = await superDocumentApi.getDocumentJobList({
        projectId: filterProjectId.value ?? undefined,
        docType: filterDocType.value ?? undefined,
        status: filterStatus.value ?? undefined,
      });
    } catch (error) {
      console.error("문서 목록 조회 실패:", error);
      alert((error as Error).message);
    } finally {
      isLoading.value = false;
    }
  };

  const resetFilters = async () => {
    filterProjectId.value = null;
    filterDocType.value = null;
    filterStatus.value = null;
    await loadDocuments();
  };

  // 응답으로 받은 갱신 문서를 목록에 in-place 반영 (필터 유지).
  const replaceInList = (updated: SuperDocumentJob) => {
    const index = documents.value.findIndex((doc) => doc.jobId === updated.jobId);
    if (index !== -1) {
      documents.value.splice(index, 1, updated);
    }
  };

  const updateDocNo = async (job: SuperDocumentJob, docNo: string) => {
    if (isSaving.value) return false;
    isSaving.value = true;
    try {
      const updated = await superDocumentApi.updateDocNo(
        job.jobId,
        docNo,
        job.projectId,
      );
      replaceInList(updated);
      return true;
    } catch (error) {
      console.error("문서번호 수정 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const updateStatus = async (job: SuperDocumentJob, status: SuperDocStatus) => {
    if (isSaving.value) return false;
    isSaving.value = true;
    try {
      const updated = await superDocumentApi.updateStatus(
        job.jobId,
        status,
        job.projectId,
      );
      replaceInList(updated);
      return true;
    } catch (error) {
      console.error("문서 상태 변경 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const reupload = async (job: SuperDocumentJob, file: File) => {
    if (isReuploading.value) return false;
    isReuploading.value = true;
    try {
      const updated = await superDocumentApi.reuploadDocument(
        job.jobId,
        file,
        job.projectId,
      );
      replaceInList(updated);
      return true;
    } catch (error) {
      console.error("문서 재등록 실패:", error);
      alert((error as Error).message);
      return false;
    } finally {
      isReuploading.value = false;
    }
  };

  const downloadDocument = async (job: SuperDocumentJob) => {
    if (downloadingJobId.value === job.jobId) return;
    downloadingJobId.value = job.jobId;
    try {
      const { blob, filename } = await superDocumentApi.downloadDocument(
        job.jobId,
        job.projectId,
      );
      const fallback = `${job.docNo ?? `document-${job.jobId}`}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || fallback;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("문서 다운로드 실패:", error);
      alert((error as Error).message || "문서 다운로드에 실패했습니다.");
    } finally {
      downloadingJobId.value = null;
    }
  };

  return {
    documents,
    projects,
    filterProjectId,
    filterDocType,
    filterStatus,
    isLoading,
    isSaving,
    isReuploading,
    downloadingJobId,
    loadProjects,
    loadDocuments,
    resetFilters,
    updateDocNo,
    updateStatus,
    reupload,
    downloadDocument,
  };
}
